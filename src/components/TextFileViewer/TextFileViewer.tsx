import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";
import "./TextFileViewer.scss";
import { listen } from "@tauri-apps/api/event";
import { ResizeTable } from "../../config/resizeTable";
import toast from "react-hot-toast";

interface TextFileViewerProps {
	path: string;
	delimiter: string;
}

function TextFileViewer({ path, delimiter }: TextFileViewerProps) {
	const [logData, setLogData] = useState<string[][]>([]);
	const [loading, setLoading] = useState(true);
	const resizeInstance = useRef<ResizeTable | null>(null);
	const tableRef = useRef<HTMLTableElement>(null);
	const containerRef = useRef<HTMLDivElement>(null); // Nuevo ref para el contenedor
	const headers = ["", "Tipo", "Fecha", "Descripción"];
	const classes = ["show", "hidden", "show", "show"];
	const timeoutRef = useRef<NodeJS.Timeout>();
	const [isEditing, setIsEditing] = useState(false);

	// Función debounce
	const debouncedReload = useCallback(() => {
		if (timeoutRef.current) clearTimeout(timeoutRef.current);
		timeoutRef.current = setTimeout(async () => {
			if (!isEditing) {
				try {
					const data = await invoke<string[][]>("process_log_file", {
						path,
						delimiter,
					});
					setLogData(data);
				} catch (error) {
					console.error("Error reloading file:", error);
				}
			}
		}, 500);
	}, [path, delimiter, isEditing]);

	listen("file-change", (event) => {
		console.log("File changed:", event.payload);
	});

	useEffect(() => {
		let unlistenFileChange: Promise<() => void> | null = null;

		const setupWatcher = async () => {
			try {
				unlistenFileChange = listen("file-change", () => {
					console.log("Archivo modificado");
					// Actualizar la lista de archivos o procesar el nuevo contenido
				});
				await invoke("watch_file", { path });
				console.log("Watcher iniciado");
			} catch (err) {
				console.error("Error iniciando watcher:", err);
			}
		};

		setupWatcher();

		// Limpieza de eventos al desmontar el componente
		return () => {
			const cleanup = async () => {
				if (unlistenFileChange) {
					const fn = await unlistenFileChange;
					fn();
				}
			};
			cleanup();
		};
	}, [path]);

	useEffect(() => {
		let unlisten: (() => void) | undefined;

		const loadData = async () => {
			try {
				// Capturar ambos valores desde la función en Rust
				console.log("Cargando archivo:", path);
				const [data, maquina]: [string[][], string | null] = await invoke(
					"process_log_file",
					{
						path,
						delimiter,
					},
				);

				if (data.length > 0) {
					setLogData(data);
				}

				// Puedes almacenar 'maquina' en otro estado si lo necesitas
				await invoke("watch_file", { path });

				unlisten = await listen("file-change", debouncedReload);
			} catch (error) {
				console.error("Error loading file:", error);
			} finally {
				setLoading(false);
			}
		};

		loadData();

		return () => {
			if (unlisten) unlisten();
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
		};
	}, [path, delimiter, debouncedReload]);

	useEffect(() => {
		if (logData.length > 0 && tableRef.current) {
			resizeInstance.current = new ResizeTable();
		}

		console.log(logData);
		return () => {
			if (resizeInstance.current) {
				// Limpiar si es necesario
				resizeInstance.current = null;
			}
		};

	}, [logData]);

	useEffect(() => {
		if (containerRef.current) {
			containerRef.current.scrollTop = containerRef.current.scrollHeight;
		}
	}, []);

	useEffect(() => {
		const handleMouseUp = () => {
			const selection = window.getSelection();
			const selectedText = selection?.toString().trim();

			if (selectedText) {
				navigator.clipboard.writeText(selectedText).then(() => {
					console.log("Texto seleccionado copiado");
					selection?.removeAllRanges(); // Deselecciona el texto
				});
				toast.success("Texto seleccionado copiado", {
					duration: 2000,
					position: "bottom-right",
					style: {
						background: "#0fff2a",
						color: "#000",
					},
					iconTheme: { primary: "#fff", secondary: "#0f002a" },
					className: "animate-slide-in-right bg-gray-800 text-white px-4 py-2 rounded shadow-lg",
				});
			}
		};

		document.addEventListener("mouseup", handleMouseUp);
		return () => {
			document.removeEventListener("mouseup", handleMouseUp);
		};
	}, []);

	if (loading) return <div>Loading...</div>;

	const regexInicio = /inicio taskbot/i;
	const regexFin = /fin taskbot/i;
	logData.map((row, i) => {
		const description = row[2] || "";
		if (regexInicio.test(description)) {
		}
	});

	const handleRightClick = (e: React.MouseEvent<HTMLDivElement>) => {
		e.preventDefault(); // Evita que aparezca el menú contextual
		const text = e.currentTarget.innerText;
		navigator.clipboard.writeText(text).then(() => {
			console.log("Texto copiado con clic derecho");
		});
		toast.success("Texto copiado", {
			duration: 2000,
			position: "bottom-right",
			style: {
				background: "#0fff2a",
				color: "#000",
			},
			iconTheme: { primary: "#fff", secondary: "#0faa2a" },
			className: "animate-slide-in-right bg-green-700 text-white px-4 py-2 rounded shadow-lg",
		});
	};

	return (
		<div className="w-full h-full overflow-auto" ref={containerRef} style={{ overflowY: "auto" }}>
			<main className="w-full h-full">
				<section className="w-full h-full">
					<table ref={tableRef} className="table w-full text-sm responsive-log-table">
						<colgroup>
							<col className="col-index" />
							<col className="col-type" />
							<col className="col-description" />
						</colgroup>
						<thead>
							<tr>
								{headers.map((header, index) => (
									<th
										key={header}
										className={`text-right px-4 py-2 ${classes[index]}`}
									>
										{header}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{logData.map((row, i) => {
								const rowKey = row.join("_") + i || `row_${i}`;
								// Unir las últimas columnas en la segunda columna si hay más de 2 elementos
								let displayRow = row;
								if (row.length > 3) {
									displayRow = [
										row[0],
										row[1],
										row.slice(2).join(" "), // une desde la segunda columna en adelante
									];
								}
								return (
									<tr key={rowKey}>
										<th className="p-1 font-normal text-lg select-none">{i + 1}</th>
										{displayRow.map((item, j) =>
											regexInicio.test(row[2]) || regexFin.test(row[2]) ? (
												<th
													key={`${rowKey}_${j}_${item}`}
													className={`px-2 py-1 border whitespace-normal break-words overflow-hidden font-normal text-lg ${classes[j + 1]} WARN cursor-pointer row text-black`}
													onContextMenu={handleRightClick}
												>
													{item}
												</th>
											) : (
												<th
													key={`${rowKey}_${j}_${item}`}
													className={`px-2 py-1 border-b whitespace-normal break-words font-normal text-lg ${classes[j + 1]} ${row[0]} cursor-pointer row`}
													onContextMenu={handleRightClick}
												>
													{item}
												</th>
											),
										)}
									</tr>
								);
							})}
						</tbody>
					</table>
				</section>
			</main>
		</div>
	);
}

export default TextFileViewer;
