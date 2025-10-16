import { join } from "@tauri-apps/api/path";
import { readDir, watch } from "@tauri-apps/plugin-fs";
import { useEffect, useState } from "react";
import { useContentPathStore } from "../store/contentPathStore";
import TreeItem from "./TreeItem/TreeItem";

function BannerList() {
  const setFilesNames = useContentPathStore((state) => state.setFilesNames);
  const filesNames = useContentPathStore((state) => state.filesNames);
  const setFoldersNames = useContentPathStore((state) => state.setFoldersNames);
  const foldersNames = useContentPathStore((state) => state.foldersNames);
  const path = useContentPathStore((state) => state.pathMain);
  const showTabbedLogView = useContentPathStore(
    (state) => state.showTabbedLogView
  );
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  useEffect(() => {
    async function loadFilesFolders() {
      if (!path) return;
      try {
        const result = await readDir(path);
        const fileNames = result
          .map((file) => (file.isFile ? file.name : null))
          .filter((name) => name !== null);
        setFilesNames(fileNames as string[]);
        const folderNames = result
          .map((folder) => (folder.isDirectory ? folder.name : null))
          .filter((name) => name !== null);
        setFoldersNames(folderNames as string[]);

        // Auto-open logs for the current date on initial load
        if (!initialLoadDone) {
          const today = new Date();
          const day = String(today.getDate()).padStart(2, "0");
          const month = String(today.getMonth() + 1).padStart(2, "0");
          const year = today.getFullYear();
          const dateGroup = `Log-${day}-${month}-${year}`;

          const logFileRegex = /^(Log-\d{2}-\d{2}-\d{4}) (\d{6})\.txt$/i;
          const todaysLogFiles = result.filter(
            (entry) => entry.isFile && entry.name?.startsWith(dateGroup)
          );

          if (todaysLogFiles.length > 0) {
            const filesData = await Promise.all(
              todaysLogFiles.map(async (file) => {
                const filePath = await join(path, file.name || "");
                const fileMatch = file.name?.match(logFileRegex);
                const timeName = fileMatch ? fileMatch[2] : file.name || "";
                return { name: timeName, path: filePath };
              })
            );

            filesData.sort((a, b) => a.name.localeCompare(b.name));

            showTabbedLogView({ dateGroup, files: filesData });
          }

          setInitialLoadDone(true);
        }
      } catch (error) {
        console.error("Error al leer el directorio:", error);
      }
    }

    loadFilesFolders();

    let unwatch: (() => void) | undefined;

    const startWatching = async () => {
      if (!path) return;
      try {
        unwatch = await watch(
          path,
          () => {
            loadFilesFolders();
          },
          { recursive: true, delayMs: 100 }
        );
      } catch (error) {
        console.error("Error al observar el directorio:", error);
      }
    };

    startWatching();

    return () => {
      if (typeof unwatch === "function") {
        unwatch();
      }
    };
  }, [path, setFilesNames, setFoldersNames, showTabbedLogView, initialLoadDone]);

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
