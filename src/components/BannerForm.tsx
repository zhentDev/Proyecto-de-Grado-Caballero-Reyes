import { writeTextFile } from "@tauri-apps/plugin-fs";
// import { writeTextFile } from "@tauri-apps/plugin-fs";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useContentPathStore } from "../store/contentPathStore";
// import { useSnippetStore } from "../store/snippetStore";

interface BannerFormProps {
	path: string;
}

function BannerForm({ path }: BannerFormProps) {
	const [fileName, setFileName] = useState("");
	const addFileName = useContentPathStore((state) => state.addFileName);

	return (
		<form
			onSubmit={async (e) => {
				e.preventDefault();
				console.log(`${path}${fileName}`);
				await writeTextFile(`${path}${fileName}`, "");
				setFileName("");
				addFileName(fileName);
				toast.success("Archivo creado exitosamente", {
					duration: 2000,
					position: "bottom-right",
					style: {
						background: "#0f172a",
						color: "#fff",
					},
				});
			}}
		>
			<input
				type="text"
				placeholder="Escribir file"
				className="bg-cyan-950 w-full p-4 outline-none select-none"
				onChange={(e) => setFileName(e.target.value)}
				value={fileName}
			/>
			<button type="submit" className="hidden">
				Save
			</button>
		</form>
	);
}

export default BannerForm;
