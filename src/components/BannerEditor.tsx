import Editor from "@monaco-editor/react";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { useEffect, useState } from "react";
import { TfiPencil } from "react-icons/tfi";
import { getEnv } from "../config/initializePermissions";
import { useContentPathStore } from "../store/contentPathStore";
import TextFileViewer from "./TextFileViewer/TextFileViewer";

function BannerEditor({ separator }: { separator: string }) {
	const selectedFile = useContentPathStore((state) => state.selectedFile);
	const [text, setText] = useState<string | undefined>("");
	const path = useContentPathStore((state) => state.pathMain);

	getEnv(path);

	useEffect(() => {
		if (!selectedFile) {
			setText("");
			return;
		}
		
		// Solo inicializar el texto para archivos que NO sean .txt
		if (!selectedFile.name.toLowerCase().endsWith(".txt")) {
			setText(selectedFile.content || "");
		}
	}, [selectedFile]); // Remover 'text' de las dependencias para evitar bucles

	// UseEffect separado para manejar cambios en el texto (auto-guardado)
	useEffect(() => {
		if (!selectedFile || selectedFile.name.toLowerCase().endsWith(".txt")) {
			return; // No hacer nada para archivos .txt
		}

		// Aquí iría la lógica de auto-guardado si está habilitada
		// const saveText = setTimeout(async () => {
		// 	await writeTextFile(`${path}\\${selectedFile.name}`, text ?? "");
		// }, 1000);
		// return () => clearTimeout(saveText);
	}, [text, selectedFile, path]);

	const pathComplete = path ? `${path}\\${selectedFile?.name}` : "";

	return (
		<>
			{selectedFile ? (
				selectedFile.name.toLowerCase().endsWith(".txt") ? (
					<TextFileViewer path={pathComplete} delimiter={` ${separator} `} />
				) : (
					<Editor
						theme="vs-dark"
						defaultLanguage="javascript"
						options={{ fontSize: 20 }}
						onChange={(value) => setText(value)}
						value={selectedFile?.content ?? ""}
					/>
				)
			) : (
				<TfiPencil className="text-9l text-neutral-200" />
			)}
		</>
	);
}

export default BannerEditor;
