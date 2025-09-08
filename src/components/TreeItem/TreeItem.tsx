import { join } from "@tauri-apps/api/path";
import { readDir, readTextFile, remove } from "@tauri-apps/plugin-fs";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { FiTrash, FiX } from "react-icons/fi";
import { IoIosArrowForward } from "react-icons/io";
import { twMerge } from "tailwind-merge";
import { useContentPathStore } from "../../store/contentPathStore";
import FileIcon, { canOpenFile, getFileDescription, FolderIcon } from "../HandleIcons";
import type { DirEntry } from "@tauri-apps/plugin-fs";
import "./TreeItem.css";

interface TreeItemProps {
	item: DirEntry;
	currentPath: string;
	level?: number; // Para manejar la indentación por niveles
}

function TreeItem({ item, currentPath, level = 0 }: TreeItemProps) {
	const setSelectedFile = useContentPathStore((state) => state.setSelectedFile);
	const selectedFile = useContentPathStore((state) => state.selectedFile);
	const setSelectedFolder = useContentPathStore((state) => state.setSelectedFolder);
	const selectedFolder = useContentPathStore((state) => state.selectedFolder);
	const removeFileName = useContentPathStore((state) => state.removeFileName);
	const removeFolderName = useContentPathStore((state) => state.removeFolderName);

	const [isExpanded, setIsExpanded] = useState(false);
	const [children, setChildren] = useState<DirEntry[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const itemName = item.name || "Sin nombre";
	const isFile = item.isFile;
	const isFolder = item.isDirectory;

	// Log controlado para carpetas seleccionadas
	useEffect(() => {
		if (isFolder && selectedFolder?.name === itemName) {
			console.log(`Carpeta "${itemName}" seleccionada:`, selectedFolder);
		}
	}, [selectedFolder, itemName, isFolder]);

	const handleFileClick = async () => {
		if (!isFile) return;

		// Verificar si el archivo se puede abrir
		if (!canOpenFile(itemName)) {
			const description = getFileDescription(itemName);
			toast.error(description, {
				duration: 4000,
				position: "bottom-right",
				style: {
					background: "#dc2626",
					color: "#fff",
				},
			});
			return;
		}

		try {
			const filePath = await join(currentPath, itemName);
			const content = await readTextFile(filePath);
			setSelectedFile({ name: itemName, content });
		} catch (error) {
			console.error("Error al leer el archivo:", error);
			toast.error("Error al leer el archivo", {
				duration: 2000,
				position: "bottom-right",
				style: {
					background: "#0f172a",
					color: "#fff",
				},
			});
		}
	};

	const handleFolderClick = async () => {
		if (!isFolder) return;

		try {
			setIsLoading(true);
			const folderPath = await join(currentPath, itemName);
			const content = await readDir(folderPath);

			setChildren(content);
			setSelectedFolder({ name: itemName, content });
			setIsExpanded(!isExpanded);
		} catch (error) {
			console.error("Error al leer la carpeta:", error);
			toast.error("Error al leer la carpeta", {
				duration: 2000,
				position: "bottom-right",
				style: {
					background: "#0f172a",
					color: "#fff",
				},
			});
		} finally {
			setIsLoading(false);
		}
	};

	const handleClick = () => {
		if (isFile) {
			handleFileClick();
		} else if (isFolder) {
			handleFolderClick();
		}
	};

	const handleDelete = async () => {
		const itemType = isFile ? "archivo" : "carpeta";
		const accept = await window.confirm(
			`¿Estás seguro de eliminar ${isFile ? "el" : "la"} ${itemType}?`
		);

		if (!accept) return;

		try {
			const itemPath = await join(currentPath, itemName);
			await remove(itemPath);

			if (isFile) {
				removeFileName(itemName);
				setSelectedFile(null);
			} else {
				removeFolderName(itemName);
				setSelectedFolder(null);
			}

			toast.error(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} eliminado`, {
				duration: 2000,
				position: "bottom-right",
				style: {
					background: "#0f172a",
					color: "#fff",
				},
			});
		} catch (error) {
			console.error(`Error al eliminar ${itemType}:`, error);
			toast.error(`Error al eliminar ${itemType}`, {
				duration: 2000,
				position: "bottom-right",
				style: {
					background: "#0f172a",
					color: "#fff",
				},
			});
		}
	};

	const isSelected = isFile
		? selectedFile?.name === itemName
		: selectedFolder?.name === itemName;

	const indentStyle = { paddingLeft: `${level * 4}px` };

	// Manejar la animación de expansión
	const toggleExpansion = () => {
		if (isFolder) {
			handleFolderClick();
		}
	};

	return (
		<div className="tree-item">
			<div
				className={twMerge(
					"py-2 px-2 hover:bg-amber-500 hover:cursor-pointer relative select-none text-sm tree-item-container flex justify-between",
					isSelected ? "bg-sky-950" : ""
				)}
				style={indentStyle}
				onClick={isFile ? handleClick : toggleExpansion}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						if (isFile) {
							handleClick();
						} else {
							toggleExpansion();
						}
					}
				}}
			>
				{/* Contenido principal - ocupa todo el ancho disponible menos el espacio para botones */}
				<div className="flex items-center gap-2 min-w-0" style={{ paddingRight: isSelected ? '60px' : '0' }}>
					{/* Indicador de expansión para carpetas */}
					{isFolder && (
						<span className={`w-4 flex justify-center transition-transform duration-400 ${isExpanded ? 'rotate-90' : 'rotate-0'
							}`}>
							{isLoading ? (
								<span className="text-xs animate-pulse">...</span>
							) : (
								<IoIosArrowForward className="text-gray-400" />
							)}
						</span>
					)}
					{isFile && <span className="w-4" />} {/* Espaciador para archivos */}

					{/* Icono del item */}
					{isFile ? <FileIcon item={itemName} /> : <FolderIcon item={itemName} />}

					{/* Nombre del item con truncamiento */}
					<span
						className="tree-item-text min-w-0 flex-1"
						title={itemName} // Tooltip simple del navegador
					>
						{itemName}
					</span>
				</div>

				{/* Botones de acción cuando está seleccionado - posicionados absolutamente */}
				{isSelected && (
					<div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1 bg-inherit px-1">
						<FiTrash
							onClick={(e) => {
								e.stopPropagation();
								handleDelete();
							}}
							className="text-neutral-500 hover:text-red-500 cursor-pointer p-1 hover:bg-red-100 rounded size-5"
						/>
						{isFile && (
							<FiX
								onClick={(e) => {
									e.stopPropagation();
									setSelectedFile(null);
								}}
								className="text-neutral-500 hover:text-gray-300 cursor-pointer p-1 hover:bg-gray-100 rounded size-5"
							/>
						)}
					</div>
				)}
			</div>

			{/* Renderizado recursivo de los hijos con animación suave */}
			{isFolder && (
				<div
					className={`tree-children transition-all duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
						}`}
					style={{
						transform: isExpanded ? 'translateY(0)' : 'translateY(-10px)',
					}}
				>
					{isExpanded && children.length > 0 && (
						<div className="border-l border-gray-600 ml-2 pl-2">
							{children.map((child) => {
								const childPath = `${currentPath}/${itemName}`;
								return (
									<TreeItem
										key={child.name || "unknown"}
										item={child}
										currentPath={childPath}
										level={level + 1}
									/>
								);
							})}
						</div>
					)}
				</div>
			)}
		</div>
	);
}

export default TreeItem;
