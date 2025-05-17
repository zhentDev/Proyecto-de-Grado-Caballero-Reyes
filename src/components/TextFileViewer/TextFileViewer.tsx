import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./TextFileViewer.scss"
import { ResizeTable } from "../../config/resizeTable"
import { listen } from '@tauri-apps/api/event';
import { count } from "console";

interface TextFileViewerProps {
    path: string;
    delimiter: string;
}

function TextFileViewer({ path, delimiter }: TextFileViewerProps) {
    const [logData, setLogData] = useState<string[][]>([]);
    const [loading, setLoading] = useState(true);
    const resizeInstance = useRef<ResizeTable | null>(null);
    const tableRef = useRef<HTMLTableElement>(null);
    let headers = ["", "Tipo", "Fecha", "Descripción"]
    const classes = ["show", "hidden", "show", "show"]
    const timeoutRef = useRef<NodeJS.Timeout>();
    const [isEditing, setIsEditing] = useState(false);

    // Función debounce
    const debouncedReload = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(async () => {
            if (!isEditing) {
                try {
                    const data = await invoke<string[][]>("process_log_file", { path, delimiter });
                    setLogData(data);
                } catch (error) {
                    console.error("Error reloading file:", error);
                }
            }
        }, 500);
    }, [path, delimiter, isEditing]);


    listen("file-change", (event) => {
        console.log("File changed:", event.payload);
    })

    useEffect(() => {
        // Escuchar cambios en el archivo
        const unlistenFileChange = listen("file-change", () => {
            console.log("Archivo modificado");
            // Actualizar la lista de archivos o procesar el nuevo contenido
        });

        // Invocar la función del backend para iniciar el watcher
        invoke("watch_file", { path })
            .then(() => console.log("Watcher iniciado"))
            .catch((err) => console.error("Error iniciando watcher:", err));

        // Limpieza de eventos al desmontar el componente
        return () => {
            unlistenFileChange.then((fn) => fn());
        };
    }, [path]);


    useEffect(() => {
        let unlisten: () => void;

        const loadData = async () => {
            try {
                // Capturar ambos valores desde la función en Rust
                const [data, maquina]: [string[][], string | null] = await invoke("process_log_file", {
                    path,
                    delimiter
                });

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
    }, [path, delimiter, logData]);


    useEffect(() => {
        if (logData.length > 0 && tableRef.current) {
            resizeInstance.current = new ResizeTable();
        }

        return () => {
            if (resizeInstance.current) {
                // Limpiar si es necesario
                resizeInstance.current = null;
            }
        };
    }, [logData]);

    if (loading) return <div>Loading...</div>;

    const regexInicio = /inicio taskbot/i;
    const regexFin = /fin taskbot/i;
    logData.map((row, i) => {
        let description = row[2] || "";
        if (regexInicio.test(description)) {

        }
    }
    );

    return (
        <div className="w-full">
            <main className="w-full">
                <section className="w-full">
                    <table ref={tableRef} className="select-none table">
                        <thead>
                            <tr>
                                {headers.map((header, index) => (
                                    <th key={index} className={`text-left px-4 py-2 ${classes[index]}`} style={{ width: "auto" }}>{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {logData.map((row, i) => (
                                <tr key={i}>
                                    <th>{i + 1}</th>
                                    {row.map((item, j) => (
                                        regexInicio.test(row[2]) || regexFin.test(row[2]) ? (
                                            <td key={j} className={`px-4 py-2 border ${classes[j + 1]} WARN`}>{item}</td>
                                        ) : (
                                            <td key={j} className={`px-4 py-2 border-b ${classes[j + 1]} ${row[0]}`}>{item}</td>
                                        )
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            </main>
        </div >
    );
}

export default TextFileViewer;
