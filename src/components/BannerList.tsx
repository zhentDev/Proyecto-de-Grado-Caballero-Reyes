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
}

function BannerList() {
    const [items, setItems] = useState<FolderItem[]>([]);
    const path = useContentPathStore((state) => state.pathMain);

    const loadFilesFolders = useCallback(async () => {
        if (!path) return;
        try {
            console.log("Recargando contenido del directorio...");
            const result = await invoke<FolderItem[]>("get_folder_contents", { path });
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
            unlisten = await listen('directory-changed', () => {
                console.log("Cambio en directorio detectado desde el backend, recargando...");
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
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default BannerList;