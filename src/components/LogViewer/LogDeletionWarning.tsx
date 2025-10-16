
import { remove } from "@tauri-apps/plugin-fs";
import { useState } from "react";
import toast from "react-hot-toast";
import { useContentPathStore } from "../../store/contentPathStore";
import type { LogFileInfo } from "./TabbedLogViewer";

interface LogDeletionWarningProps {
  dateGroup: string;
  files: LogFileInfo[];
}

function LogDeletionWarning({ dateGroup, files }: LogDeletionWarningProps) {
  const minToDelete = files.length - 7;
  const [countToDelete, setCountToDelete] = useState(minToDelete);
  const clearFileView = useContentPathStore((state) => state.clearFileView);
  const showTabbedLogView = useContentPathStore(
    (state) => state.showTabbedLogView
  );
  const maxDeletable = files.length - 1;

  const handleDelete = async () => {
    if (countToDelete <= 0 || countToDelete > maxDeletable) {
      toast.error(`Debes seleccionar un número entre 1 y ${maxDeletable}.`);
      return;
    }

    const filesToDelete = files.slice(0, countToDelete);
    const remainingFiles = files.slice(countToDelete);
    const filePathsToDelete = filesToDelete.map((file) => file.path);

    try {
      await Promise.all(filePathsToDelete.map((path) => remove(path)));
      toast.success(`${countToDelete} archivo(s) de log eliminados.`);
      showTabbedLogView({ dateGroup, files: remainingFiles });
    } catch (error) {
      console.error("Error deleting log files:", error);
      toast.error("Ocurrió un error al eliminar los archivos.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-gray-900 text-white p-8 rounded-lg">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold text-amber-400 mb-4">
          Demasiados Archivos de Log
        </h2>
        <p className="mb-2">
          Se han encontrado{" "}
          <span className="font-bold text-xl">{files.length}</span> archivos
          para el grupo <span className="font-bold">{dateGroup}</span>.
        </p>
        <p className="mb-4">
          Para ver las pestañas, necesitas eliminar al menos{" "}
          <span className="font-bold text-lg">{minToDelete}</span> archivo(s).
        </p>
        <div className="flex flex-col items-center gap-4 bg-gray-800 p-6 rounded-lg">
          <label htmlFor="delete-count" className="font-medium">
            Número de archivos a eliminar (los más antiguos):
          </label>
          <div className="flex items-center gap-2">
            <input
              id="delete-count"
              type="number"
              min="1"
              max={maxDeletable}
              value={countToDelete}
              onChange={(e) => setCountToDelete(Number(e.target.value))}
              className="bg-gray-900 text-white w-24 text-center p-2 rounded-md border border-gray-700 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setCountToDelete(maxDeletable)}
              className="text-xs bg-sky-700 hover:bg-sky-800 text-white font-semibold py-1 px-2 rounded-md transition-colors"
            >
              Máx
            </button>
          </div>
          <div className="flex gap-4 mt-4">
            <button
              type="button"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-md transition-colors"
            >
              Eliminar
            </button>
            <button
              type="button"
              onClick={clearFileView}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-md transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LogDeletionWarning;
