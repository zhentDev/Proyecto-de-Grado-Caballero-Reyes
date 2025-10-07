import { invoke } from "@tauri-apps/api/core";

const getFromRust = async (path: string) => {
	try {
		await invoke("set_write_permission", { path });
		await invoke("set_read_permission", { path });
		return await invoke("set_remove_permission", { path });
	} catch (err) {
		console.log("getFromRust", err);
	}

	return "";
};

export async function getEnv(path: string | null) {
	if (!path) return;
	const normalizedPath = `${path.replace(/\\/g, "/")}/**/*`;

	await getFromRust(normalizedPath);

	return normalizedPath;
}
