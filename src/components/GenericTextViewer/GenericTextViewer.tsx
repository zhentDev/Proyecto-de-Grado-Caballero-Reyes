import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface GenericTextViewerProps {
	path: string;
}

function GenericTextViewer({ path }: GenericTextViewerProps) {
	const [content, setContent] = useState("");
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const loadFile = async () => {
			setLoading(true);
			try {
				const fileContent = await readTextFile(path);
				setContent(fileContent);
			} catch (error) {
				console.error("Error loading file:", error);
				toast.error("No se pudo cargar el archivo.");
			} finally {
				setLoading(false);
			}
		};
		loadFile();
	}, [path]);

	const handleSave = async () => {
		try {
			await writeTextFile(path, content);
			toast.success("Archivo guardado con éxito.");
		} catch (error) {
			console.error("Error saving file:", error);
			toast.error("Error al guardar el archivo.");
		}
	};

	if (loading) {
		return <div>Cargando...</div>;
	}

	return (
		<div className="flex flex-col h-full w-full bg-gray-800 text-white">
			<div className="flex-none p-2 border-b border-gray-700">
				<button
					onClick={handleSave}
					className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-bold"
				>
					Guardar
				</button>
			</div>
			<textarea
				value={content}
				onChange={(e) => setContent(e.target.value)}
				className="flex-grow w-full p-4 bg-gray-900 text-gray-200 font-mono focus:outline-none resize-none"
				spellCheck="false"
			/>
		</div>
	);
}

export default GenericTextViewer;
