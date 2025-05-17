import { invoke } from "@tauri-apps/api/core";
import { z } from "zod";

const getFromRust = async (path: string) => {
	try {
		const resultWrite = await invoke("set_write_permission", { path });
		if (resultWrite === "El permiso ya existe") {
			const readWrite = await invoke("set_read_permission", { path });
			if (readWrite === "El permiso ya existe") {
				return await invoke("set_remove_permission", { path });
			}
		}
	} catch (err) {
		console.log("getFromRust", err);
	}

	return "";
};

async function getEnv() {
	const path = "D:/RPA/AA/PoC 1" + "/Inputs";
	const a = await getFromRust(path);
	console.log(path);
	console.log(a);

	return path;
}

getEnv();

const envVars = z.object({
	VITE_ORIGIN_PATH: z.string(),
});

// envVars.parse(import.meta.env);
// console.log(import.meta.env.VITE_ORIGIN_PATH);

declare global {
	namespace NodeJS {
		interface ProcessEnv extends z.infer<typeof envVars> { }
	}
}
