import { readDir, watch } from "@tauri-apps/plugin-fs";
import { useEffect } from "react";
import { useContentPathStore } from "../store/contentPathStore";
import TreeItem from "./TreeItem/TreeItem";

function BannerList() {
	const setFilesNames = useContentPathStore((state) => state.setFilesNames);
	const filesNames = useContentPathStore((state) => state.filesNames);
	const setFoldersNames = useContentPathStore((state) => state.setFoldersNames);
	const foldersNames = useContentPathStore((state) => state.foldersNames);
	const path = useContentPathStore((state) => state.pathMain);

	useEffect(() => {
		async function loadFilesFolders() {
			if (!path) return;
			try {
				const result = await readDir(path);
				const fileNames = result
					.map((file) => (file.isFile ? file.name : null))
					.filter((name) => name !== null);
				setFilesNames(fileNames);
				const folderNames = result
					.map((folder) => (folder.isDirectory ? folder.name : null))
					.filter((name) => name !== null);
				setFoldersNames(folderNames);
			} catch (error) {
				console.error("Error al leer el directorio:", error);
			}
		}

		// Carga inicial
		loadFilesFolders();

		let unwatch: (() => void) | undefined;

		const startWatching = async () => {
			if (!path) return;
			try {
				unwatch = await watch(
					path,
					() => {
						// Recarga la lista de archivos cuando algo cambia
						loadFilesFolders();
					},
					{ recursive: true, delayMs: 100 }, // <-- MODO RECURSIVO
				);
			} catch (error) {
				console.error("Error al observar el directorio:", error);
			}
		};

		startWatching();

		// Función de limpieza para detener el watcher cuando el componente se desmonta
		return () => {
			if (typeof unwatch === "function") {
				unwatch();
			}
		};
	}, [path, setFilesNames, setFoldersNames]);

	return (
		<div className="h-full overflow-y-auto tree-container">
			{/* Renderizar todos los items usando TreeItem */}
			{path && (
				<div className="space-y-1 p-2">
					{/* Primero las carpetas */}
					{foldersNames.map((folderName) => {
						const folderEntry = {
							name: folderName,
							isFile: false,
							isDirectory: true,
							isSymlink: false, // Asumiendo que no es symlink, ajusta si es necesario
						};
						return (
							<TreeItem
								key={folderName}
								item={folderEntry}
								currentPath={path}
								level={0}
							/>
						);
					})}

					{/* Luego los archivos */}
					{filesNames.map((fileName) => {
						const fileEntry = {
							name: fileName,
							isFile: true,
							isDirectory: false,
							isSymlink: false, // Asumiendo que no es symlink, ajusta si es necesario
						};
						return (
							<TreeItem
								key={fileName}
								item={fileEntry}
								currentPath={path}
								level={0}
							/>
						);
					})}
				</div>
			)}
		</div>
	);
}

export default BannerList;
