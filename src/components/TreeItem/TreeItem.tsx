import { join, dirname } from "@tauri-apps/api/path";
import { readDir, readTextFile, remove } from "@tauri-apps/plugin-fs";
import type { DirEntry } from "@tauri-apps/plugin-fs";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiTrash, FiX } from "react-icons/fi";
import { IoIosArrowForward } from "react-icons/io";
import { twMerge } from "tailwind-merge";
import { useContentPathStore } from "../../store/contentPathStore";
import { splitLogIntoExecutions } from "../../utils/logParser";
import FileIcon, {
  canOpenFile,
  getFileDescription,
  FolderIcon,
} from "../HandleIcons";
import "./TreeItem.css";

interface TreeItemProps {
  item: DirEntry;
  currentPath: string;
  level?: number; // Para manejar la indentación por niveles
}

function TreeItem({ item, currentPath, level = 0 }: TreeItemProps) {
  const {
    selectedFile,
    setSelectedFile,
    selectedFolder,
    setSelectedFolder,
    removeFileName,
    removeFolderName,
    showTabbedLogView,
    showAnalysisLogView,
    tabbedLogView, // Get the active tab view from the store
  } = useContentPathStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const [children, setChildren] = useState<DirEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const itemName = item.name || "Sin nombre";
  const isFile = item.isFile;
  const isFolder = item.isDirectory;

  // Check if the current item is part of the active tab view
  const logFileRegexForCheck = /^(Log-\d{2}-\d{2}-\d{4}) (\d{6})\.txt$/i;
  const itemMatch = itemName.match(logFileRegexForCheck);
  const isPartofActiveTabView =
    isFile && tabbedLogView && itemMatch
      ? tabbedLogView.dateGroup === itemMatch[1]
      : false;

  useEffect(() => {
    if (isFolder && selectedFolder?.name === itemName) {
    }
  }, [selectedFolder, itemName, isFolder]);

  const handleNormalFileClick = async () => {
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
      setSelectedFile({ name: itemName, content }, filePath);
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

  const handleFileClick = async () => {
    if (!isFile) return;

    const logFileRegex = /^(Log-\d{2}-\d{2}-\d{4}) (\d{6})\.txt$/i;
    const match = itemName.match(logFileRegex);

    if (match) {
      try {
        const dateGroup = match[1]; // e.g., "Log-06-10-2025"

        const dirPath = await dirname(await join(currentPath, itemName));
        const dirEntries = await readDir(dirPath);

        const matchingLogFiles = dirEntries.filter(
          (entry) => entry.isFile && entry.name?.startsWith(dateGroup)
        );

        const filesData = await Promise.all(
          matchingLogFiles.map(async (file) => {
            const filePath = await join(dirPath, file.name || "");
            const fileMatch = file.name?.match(logFileRegex);
            const timeName = fileMatch ? fileMatch[2] : file.name || ""; // e.g., "090547"
            return { name: timeName, path: filePath };
          })
        );

        // Sort by time
        filesData.sort((a, b) => a.name.localeCompare(b.name));

        if (filesData.length > 0) {
          showTabbedLogView({ dateGroup, files: filesData });
        } else {
          handleNormalFileClick();
        }
      } catch (error) {
        console.error("Error handling log file click:", error);
        toast.error("Error al procesar archivos de log.");
        handleNormalFileClick();
      }
    } else {
      handleNormalFileClick();
    }
  };

  const handleFolderClick = async () => {
    if (!isFolder) return;

    try {
      setIsLoading(true);
      const folderPath = await join(currentPath, itemName);
      const content = await readDir(folderPath);

      setChildren(content);
      setSelectedFolder({ name: itemName, content, path: folderPath });
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
        setSelectedFile(null, null);
      } else {
        removeFolderName(itemName);
        setSelectedFolder(null);
      }

      toast.error(
        `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} eliminado`,
        {
          duration: 2000,
          position: "bottom-right",
          style: {
            background: "#0f172a",
            color: "#fff",
          },
        }
      );
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

  const toggleExpansion = () => {
    if (isFolder) {
      handleFolderClick();
    }
  };

  return (
    <div className="tree-item">
      <div
        className={twMerge(
          `py-2 px-2 relative select-none text-sm tree-item-container flex justify-between indent-level-${level}`,
          isSelected && !isPartofActiveTabView ? "bg-sky-950" : "",
          isPartofActiveTabView
            ? "opacity-50 cursor-not-allowed"
            : "hover:bg-amber-500 hover:cursor-pointer"
        )}
        onClick={isFile ? (isPartofActiveTabView ? undefined : handleClick) : toggleExpansion}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            if (isFile) {
              if (!isPartofActiveTabView) handleClick();
            } else {
              toggleExpansion();
            }
          }
        }}
      >
        <div
          className={`flex items-center gap-2 min-w-0${
            isSelected ? " tree-item-selected-padding" : ""
          }`}
        >
          {isFolder && (
            <span
              className={`w-4 flex justify-center transition-transform duration-400 ${
                isExpanded ? "rotate-90" : "rotate-0"
              }`}
            >
              {isLoading ? (
                <span className="text-xs animate-pulse">...</span>
              ) : (
                <IoIosArrowForward className="text-gray-400" />
              )}
            </span>
          )}
          {isFile && <span className="w-4" />}
          {isFile ? (
            <FileIcon item={itemName} />
          ) : (
            <FolderIcon item={itemName} />
          )}
          <span className="tree-item-text min-w-0 flex-1" title={itemName}>
            {itemName}
          </span>
        </div>

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
                  setSelectedFile(null, null);
                }}
                className="text-neutral-500 hover:text-gray-300 cursor-pointer p-1 hover:bg-gray-100 rounded size-5"
              />
            )}
          </div>
        )}
      </div>

      {isFolder && (
        <div
          className={`tree-children transition-all duration-500 ease-in-out overflow-hidden ${
            isExpanded
              ? "max-h-screen opacity-100 tree-expanded"
              : "max-h-0 opacity-0 tree-collapsed"
          }`}
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
