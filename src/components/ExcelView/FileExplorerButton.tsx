import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";

interface FolderExplorerButtonProps {
	onFolderSelected?: (path: string) => void;
	buttonText?: string;
	className?: string;
}

export const FolderExplorerButton = ({
	onFolderSelected,
	buttonText = "Seleccionar carpeta",
	className = "",
}: FolderExplorerButtonProps) => {
	const [selectedPath, setSelectedPath] = useState<string | null>(null);

	const handleClick = async () => {
		try {
			// IMPORTANTE: Cambiar a 'open_folder_dialog' en el backend
			const path = await invoke<string>("open_folder_dialog");
			setSelectedPath(path);
			onFolderSelected?.(path);
		} catch (error) {
			console.error("Error al seleccionar carpeta:", error);
			setSelectedPath(
				`Error: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	};

	return (
		<div className={`folder-explorer-container ${className}`}>
			<button
				type="button"
				onClick={handleClick}
				className="folder-explorer-button"
			>
				{buttonText}
			</button>
			{selectedPath && (
				<div className="folder-path-display">
					<p>
						Carpeta seleccionada: <code>{selectedPath}</code>
					</p>
				</div>
			)}
		</div>
	);
};
