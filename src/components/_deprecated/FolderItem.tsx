import { join } from "@tauri-apps/api/path";
import { readDir, remove } from "@tauri-apps/plugin-fs";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiTrash } from "react-icons/fi";
import { IoIosArrowDown, IoIosArrowForward } from "react-icons/io";
import { twMerge } from "tailwind-merge";
import { useContentPathStore } from "../store/contentPathStore";
import FolderIcon from "./HandleIcons";
import FileIcon from "./HandleIcons";

interface BannerFormProps {
  item: string;
}

function FolderItem({ item }: BannerFormProps) {
  const setSelectedFolder = useContentPathStore(
    (state) => state.setSelectedFolder
  );
  const selectedFolder = useContentPathStore((state) => state.selectedFolder);
  const removeFolderName = useContentPathStore(
    (state) => state.removeFolderName
  );
  const path = useContentPathStore((state) => state.pathMain);
  const [showContent, setShowContent] = useState(false);

  // Solo hacer log cuando este ítem específico es seleccionado
  useEffect(() => {
    if (selectedFolder?.name === item) {
      console.info(`Carpeta "${item}" seleccionada:`, selectedFolder);
    }
  }, [selectedFolder, item]);

  const handleDelete = async (Folder: string) => {
    const accept = await window.confirm(
      "¿Estás seguro de eliminar la carpeta?"
    );
    if (!accept || !path) return;

    const FolderPath = await join(path, `${Folder}`);
    await remove(FolderPath);
    removeFolderName(Folder);

    toast.error("Carpeta eliminado", {
      duration: 2000,
      position: "bottom-right",
      style: {
        background: "#0f172a",
        color: "#fff",
      },
    });
  };

  const handleSelectFolder = async () => {
    if (!path) return;
    const FolderPath = await join(path, `${item}`);
    const snippet = await readDir(FolderPath);
    setSelectedFolder({
      name: item,
      content: snippet,
    });
    toast.success("Carpeta seleccionada", {
      duration: 2000,
      position: "bottom-right",
      style: {
        background: "#0f172a",
        color: "#fff",
      },
    });
    setShowContent((prev) => !prev); // alterna visibilidad
  };

  return (
    <div className="contentFolder">
      <div
        className={twMerge(
          "py-2 px-2 hover:bg-amber-500 hover:cursor-pointer flex flex-row justify-between relative select-none text-sm",
          selectedFolder?.name === item ? "bg-sky-950" : ""
        )}
        onClick={handleSelectFolder}
        onKeyDown={async (e) => {
          if (e.key === "Enter" || e.key === " ") {
            await handleSelectFolder();
          }
        }}
      >
        <div className="justify-between flex items-center gap-2">
          <FolderIcon item={item} />
          <h1>{item}</h1>
        </div>
        {selectedFolder?.name === item && (
          <div className="">
            <FiTrash
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(item);
              }}
              className="text-neutral-500"
            />
          </div>
        )}
      </div>

      {selectedFolder?.name === item && (
        <div className="subfolder-content px-4">
          {showContent && selectedFolder?.content && (
            <div className="mt-2">
              <ul className="gap-2 flex flex-col">
                {selectedFolder.content.map((entry) => (
                  <div
                    className="flex flex-row max-w-max justify-center items-center gap-1.5 flex-nowrap"
                    key={entry.name ?? "unknown"}
                  >
                    {selectedFolder.name === item ? (
                      <IoIosArrowForward />
                    ) : (
                      <IoIosArrowDown />
                    )}
                    <FileIcon item={entry.name} />
                    <li
                      key={entry.name ?? "unknown"}
                      className="flex pl-1 text-sm flex-nowrap"
                    >
                      {entry.name ?? "Sin nombre"}
                    </li>
                  </div>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FolderItem;
