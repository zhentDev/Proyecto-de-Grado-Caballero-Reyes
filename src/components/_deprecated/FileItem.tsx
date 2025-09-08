import { join } from "@tauri-apps/api/path";
import { readTextFile, remove } from "@tauri-apps/plugin-fs";
import toast from "react-hot-toast";
import { FiTrash, FiX } from "react-icons/fi";
import { twMerge } from "tailwind-merge";
import { useContentPathStore } from "../../store/contentPathStore";
import FileIcon from "../HandleIcons";

interface BannerFormProps {
	item: string;
}

function FileItem({ item }: BannerFormProps) {
	const setSelectedFile = useContentPathStore((state) => state.setSelectedFile);
	const selectedFile = useContentPathStore((state) => state.selectedFile);
	const removeFileName = useContentPathStore((state) => state.removeFileName);
	const path = useContentPathStore((state) => state.pathMain);

	const handleDelete = async (file: string) => {
		const accept = await window.confirm(
			"¿Estás seguro de eliminar el archivo?",
		);
		if (!accept || !path) return;

		const filePath = await join(path, `${file}`);
		await remove(filePath);
		removeFileName(file);

		toast.error("Archivo eliminado", {
			duration: 2000,
			position: "bottom-right",
			style: {
				background: "#0f172a",
				color: "#fff",
			},
		});
	};

	return (
		<div
			className={twMerge(
				"py-2 px-2 hover:bg-amber-500 hover:cursor-pointer flex justify-between relative select-none",
				selectedFile?.name === item ? "bg-sky-950" : "",
			)}
			onClick={async () => {
				if (!path) return;
				const filePath = await join(path, `${item}`);
				console.log(filePath);
				const snippet = await readTextFile(filePath);
				setSelectedFile({ name: item, content: snippet });
				toast.success("Archivo seleccionado", {
					duration: 2000,
					position: "bottom-right",
					style: {
						background: "#0f172a",
						color: "#fff",
					},
				});
			}}
			onKeyDown={async (e) => {
				if (e.key === "Enter" || e.key === " ") {
					if (!path) return;
					const filePath = await join(path, `${item}`);
					console.log(filePath);
					const snippet = await readTextFile(filePath);
					setSelectedFile({ name: item, content: snippet });
					toast.success("Archivo seleccionado", {
						duration: 2000,
						position: "bottom-right",
						style: {
							background: "#0f172a",
							color: "#fff",
						},
					});
				}
			}}
		>
			<div className="flex flex-row max-w-max justify-center items-center gap-1.5">
				<FileIcon item={item} />
				<h1 className="pl-1 text-sm">{item}</h1>
			</div>

			{selectedFile?.name === item && (
				<div>
					<FiTrash
						onClick={(e) => {
							e.stopPropagation();
							handleDelete(item);
						}}
						className="text-neutral-500"
					/>
					<FiX
						onClick={(e) => {
							e.stopPropagation();
							setSelectedFile(null);
						}}
						className="text-neutral-500"
					/>
				</div>
			)}
		</div>
	);
}

export default FileItem;
