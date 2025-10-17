import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { InsertProyect } from "../api/db.ts";
import { useContentPathStore } from "../store/contentPathStore";
import ProyectsList from "./ProyectsList.tsx";

interface FormProyectsProps {
  onFolderSelected?: (path: string) => void;
  buttonText?: string;
  className?: string;
}

export const FormProyects = ({ onFolderSelected }: FormProyectsProps) => {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const navigate = useNavigate();
  const [proyectValue, setProyectValue] = useState("");
  const [sepValue, setSepValue] = useState("");

  const setPathMain = useContentPathStore((state) => state.setPathMain);
  useEffect(() => {
    if (selectedPath) {
      setPathMain(selectedPath.replace(/\\/g, "/"));
    }
  }, [selectedPath, setPathMain]);

  const handlerFolderSelect = async () => {
    try {
      const path = await invoke<string>("open_folder_dialog");
      setSelectedPath(path);
      onFolderSelected?.(path);

      try {
        await InsertProyect(proyectValue, path, sepValue);
      } catch (error) {
        console.error("Error inserting user:", error);
      }
    } catch (error) {
      console.error("Error al seleccionar carpeta:", error);
      // Manejo de error, por ejemplo, mostrar un mensaje al usuario
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
      // Limpiar el estado si ocurre un error
      setSelectedPath("");
    }
  };

  function handlerSep(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setSepValue(value);
  }

  function handlerProyect(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setProyectValue(value);
  }

  return (
    <div className="flex flex-row w-full h-full justify-center items-center gap-4 p-4 bg-gray-800 text-white select-none">
      <div className="flex flex-col gap-4 w-full h-full p-4">
        <h1 className="text-5xl">Registrar Proyecto</h1>
        <section className="justify-center items-center flex flex-row w-full h-full gap-4">
          <div className="folder-explorer-form flex flex-col gap-2 w-full max-w-md">
            <div className="mb-4 p-2 flex justify-between items-center">
              <label htmlFor="proyect">Proyecto</label>
              <input
                type="text"
                id="proyect"
                placeholder="Código y Nombre"
                required
                onChange={handlerProyect}
              />
            </div>
            <div className="mb-4 p-2 flex justify-between items-center">
              <label htmlFor="sep">Separador</label>
              <input
                type="text"
                id="sep"
                placeholder="Separador Logs"
                required
                onChange={handlerSep}
              />
            </div>
            <div className="mb-4 justify-center items-center p-2 flex">
              <button
                className={`w-1/2 ${
                  !proyectValue && !sepValue ? "bg-gray-500" : "bg-blue-500"
                } text-white p-2 rounded`}
                onClick={handlerFolderSelect}
                type="button"
                disabled={!proyectValue && !sepValue}
              >
                Seleccionar carpeta
              </button>
            </div>
          </div>
        </section>
      </div>
      <div className="w-px bg-gray-300 h-full" />
      <ProyectsList />
    </div>
  );
};
