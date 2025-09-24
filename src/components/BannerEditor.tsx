import Editor from "@monaco-editor/react";
import { useEffect, useState } from "react";
import { TfiPencil } from "react-icons/tfi";
import { getEnv } from "../config/initializePermissions";
import { useContentPathStore } from "../store/contentPathStore";
import ExcelView from "./ExcelView/ExcelView";
import TextFileViewer from "./TextFileViewer/TextFileViewer";

function BannerEditor({ separator }: { separator: string }) {
	const selectedFile = useContentPathStore((state) => state.selectedFile);
	const pathComplete = useContentPathStore((state) => state.selectedFilePath);
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
	}, [selectedFile]);
	// }, [text, selectedFile, path]);

	const renderContent = () => {
		if (!selectedFile || !pathComplete) {
			return <TfiPencil className="text-9l text-neutral-200" />;
		}

		const fileExtension = selectedFile.name.split(".").pop()?.toLowerCase();

		switch (fileExtension) {
			case "txt":
				return (
					<TextFileViewer path={pathComplete} delimiter={` ${separator} `} />
				);
			case "xlsx":
			case "xls":
			case "csv":
				return <ExcelView path={pathComplete} />;
			default:

				return (
					<Editor
						theme="vs-dark"
						defaultLanguage="javascript"
						options={{ fontSize: 20 }}
						onChange={(value) => setText(value)}
						value={selectedFile?.content ?? ""}
					/>
				);
		}
	};

	return <>{renderContent()}</>;
}

export default BannerEditor;
