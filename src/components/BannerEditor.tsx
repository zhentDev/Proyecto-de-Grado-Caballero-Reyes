import Editor from "@monaco-editor/react";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { useEffect, useState } from "react";
import { TfiPencil } from "react-icons/tfi";
import { useContentPathStore } from "../store/contentPathStore";
import TextFileViewer from "./TextFileViewer/TextFileViewer";

function BannerEditor() {
	const selectedFile = useContentPathStore((state) => state.selectedFile);
	const [text, setText] = useState<string | undefined>("");
	const path = useContentPathStore((state) => state.pathMain);

	useEffect(() => {
		if (!selectedFile) {
			setText("");
			return;
		}
		console.log(text);

		const saveText = setTimeout(async () => {
			await writeTextFile(`${path}\\${selectedFile.name}`, text ?? "");
		}, 1000);

		return () => {
			clearTimeout(saveText);
		};
	}, [text]);

	return (
		<>
			{selectedFile ? (
				selectedFile.name.toLowerCase().endsWith('.txt') ? (
					<TextFileViewer
						path={path + selectedFile.name}
						delimiter=" - "
					/>
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
