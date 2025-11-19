import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useState } from "react";
import { useContentPathStore } from "../store/contentPathStore";
import TreeItem from "./TreeItem/TreeItem";

// Definimos el tipo de dato que esperamos del backend
interface FolderItem {
  name: string;
  is_file: boolean;
  is_directory: boolean;
  children: FolderItem[];
  modified: number;
}

function BannerList() {
  const [items, setItems] = useState<FolderItem[]>([]);
  const path = useContentPathStore((state) => state.pathMain);

  const loadFilesFolders = useCallback(async () => {
    if (!path) return;
    try {
      console.log("Recargando contenido del directorio...");
      const result = await invoke<FolderItem[]>("get_folder_contents", {
        path,
      });
      setItems(result);
    } catch (error) {
      console.error("Error al leer el directorio:", error);
    }
  }, [path]);

  // Efecto para la carga inicial y cuando cambia la ruta principal
  useEffect(() => {
    loadFilesFolders();
  }, [path, loadFilesFolders]);

  // Efecto para escuchar los cambios del backend
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      unlisten = await listen("directory-changed", () => {
        console.log(
          "Cambio en directorio detectado desde el backend, recargando..."
        );
        loadFilesFolders();
      });
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [loadFilesFolders]);

  // Efecto para manejar la creación de archivos y auto-seleccionar la nueva pestaña
  useEffect(() => {
    const unlisten = listen<string>("file-created", (event) => {
      const newFilePath = event.payload;
      const logFileRegex = /^(Log-\d{2}-\d{2}-\d{4}) (\d{6})\.txt$/i;

      // Extraer solo el nombre del archivo de la ruta
      const newFileName = newFilePath.split("\\").pop()?.split("/").pop();
      if (!newFileName) return;

      const match = newFileName.match(logFileRegex);
      if (!match) return;

      const newFileDateGroup = match[1];
      const timeName = match[2];

      const { tabbedLogView, showTabbedLogView } =
        useContentPathStore.getState();

      if (tabbedLogView && tabbedLogView.dateGroup === newFileDateGroup) {
        const newFileInfo = { name: timeName, path: newFilePath };
        const updatedFiles = [...tabbedLogView.files, newFileInfo];

        // Ordenar por nombre (que es la hora)
        updatedFiles.sort((a, b) => a.name.localeCompare(b.name));

        const newIndex = updatedFiles.findIndex((f) => f.path === newFilePath);

        showTabbedLogView({
          dateGroup: tabbedLogView.dateGroup,
          files: updatedFiles,
          initialIndex: newIndex,
          delimiter: tabbedLogView.delimiter,
        });
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return (
    <div className="h-full overflow-y-auto tree-container">
      {path && (
        <div className="space-y-1 p-2">
          {items.map((item) => (
            <TreeItem
              key={item.name}
              item={item as any}
              currentPath={path}
              level={0}
              onActionComplete={loadFilesFolders}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default BannerList;
