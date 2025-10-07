import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState, useCallback } from "react";

type ExcelData = {
	sheets: string[];
	rows: string[][];
};

const MIN_ROWS = 20;
const MIN_COLS = 5;

function ExcelView({ path }: { path: string }) {
	const [menuVisible, setMenuVisible] = useState(false);
	const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

	const [data, setData] = useState<string[][]>([]);
	const [gridData, setGridData] = useState<string[][]>([]);
	const [sheets, setSheets] = useState<string[]>([]);
	const [activeSheet, setActiveSheet] = useState("");

	useEffect(() => {
		if (path) {
			abrirExcel(path);
		}
	}, [path]);

	useEffect(() => {
		const rows = Math.max(MIN_ROWS, data.length);
		let maxCols = MIN_COLS;
		if (data.length > 0) {
			maxCols = Math.max(MIN_COLS, ...data.map((r) => r.length));
		}

		const newGrid: string[][] = Array.from({ length: rows }, (_, i) =>
			Array.from({ length: maxCols }, (_, j) => data[i]?.[j] || "")
		);

		setGridData(newGrid);
	}, [data]);

	async function abrirExcel(filePath: string) {
		try {
			const res = await invoke<ExcelData>("leer_excel", { ruta: filePath });
			setSheets(res.sheets || []);
			const firstSheet = res.sheets?.[0] || "";
			setActiveSheet(firstSheet);
			setData(res.rows || []);
		} catch (err) {
			alert(`Error al abrir Excel: ${err}`);
		}
	}

	async function cambiarHoja(hoja: string) {
		try {
			const res = await invoke<ExcelData>("leer_excel", {
				ruta: path,
				hoja,
			});
			setActiveSheet(hoja);
			setData(res.rows || []);
		} catch (err) {
			alert(`Error al cambiar de hoja: ${err}`);
		}
	}

	async function guardarExcel() {
		try {
			const filteredData = data.filter((row) =>
				row.some((cell) => cell && cell.trim() !== "")
			);
			await invoke("guardar_excel", { ruta: path, datos: filteredData });
			alert("Archivo guardado con éxito!");
		} catch (err) {
			alert(`Error al guardar Excel: ${err}`);
		}
	}

	function handleContextMenu(e: React.MouseEvent) {
		e.preventDefault();
		setMenuPos({ x: e.clientX, y: e.clientY });
		setMenuVisible(true);
	}

	function handleClick() {
		setMenuVisible(false);
	}

	const editarCelda = useCallback(
		(i: number, j: number, valor: string) => {
			setData((prevData) => {
				const newData = prevData.map((row) => [...row]);
				while (newData.length <= i) {
					newData.push([]);
				}
				while (newData[i].length <= j) {
					newData[i].push("");
				}
				newData[i][j] = valor;
				return newData;
			});
		},
		[]
	);

	function agregarColumna() {
		const newGrid = gridData.map((fila) => [...fila, ""]);
		setGridData(newGrid);
		setMenuVisible(false);
	}

	function agregarFila() {
		const newRow = Array(gridData[0]?.length || MIN_COLS).fill("");
		const newGrid = [...gridData, newRow];
		setGridData(newGrid);
		setMenuVisible(false);
	}

	return (
		<div
			className="p-4 bg-[#1f2327] text-white h-full flex flex-col w-full"
			onClick={handleClick}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					handleClick();
				}
			}}
		>
			<div className="mb-4 flex gap-2 flex-shrink-0">
				<button
					type="button"
					onClick={guardarExcel}
					className="bg-sky-700 text-white px-4 py-2 rounded-md hover:bg-sky-800 transition-colors"
				>
					Guardar Excel
				</button>
				{sheets.length > 0 && (
					<select
						value={activeSheet}
						onChange={(e) => cambiarHoja(e.target.value)}
						className="bg-[#25333d] border border-slate-500 rounded-md px-3 py-1"
					>
						{sheets.map((sheet) => (
							<option key={sheet} value={sheet}>
								{sheet}
							</option>
						))}
					</select>
				)}
			</div>

			<div className="overflow-auto flex-grow">
				<table
					className="border-collapse table-auto"
					onContextMenu={handleContextMenu}
				>
					<tbody>
						{gridData.map((row, i) => (
							<tr key={`row-${i}`}>
								{row.map((cell, j) => (
									<td
										key={`cell-${i}-${j}`}
										className="border border-slate-700 p-0 h-6 min-w-[100px]"
									>
										<div className="grid items-center h-full">
											<span
												className={`invisible whitespace-pre px-2 col-start-1 row-start-1 ${i === 0 ? "font-bold" : ""}`}>
												{cell || " "}
											</span>
											<input
												value={cell}
												onChange={(e) => editarCelda(i, j, e.target.value)}
												className={`[appearance:none] w-full h-full outline-none px-2 col-start-1 row-start-1 caret-white focus:ring-2 focus:ring-sky-500 ${
													i === 0
														? "bg-slate-800 font-bold text-white"
														: i % 2 !== 0
														? "bg-[#25333d]"
														: "bg-transparent"
												}`}
											/>
										</div>
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>

				{menuVisible && (
					<ul
						className="absolute bg-[#25333d] border border-slate-700 rounded-md shadow-lg"
						style={{ top: menuPos.y, left: menuPos.x }}
					>
						<li
							onClick={agregarFila}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									agregarFila();
								}
							}}
							className="px-4 py-2 hover:bg-sky-700 cursor-pointer"
						>
							➕ Agregar Fila
						</li>
						<li
							onClick={agregarColumna}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									agregarColumna();
								}
							}}
							className="px-4 py-2 hover:bg-sky-700 cursor-pointer"
						>
							➕ Agregar Columna
						</li>
					</ul>
				)}
			</div>
		</div>
	);
}

export default ExcelView;
