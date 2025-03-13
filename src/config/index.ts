import { invoke } from "@tauri-apps/api/core";
import { z } from "zod";

const getFromRust = async (path: string) => {
	try {
		return await invoke("set_oririn_path", { path });
	} catch (err) {
		console.log("getFromRust", err);
	}

	return "";
};

async function getEnv() {
	const path = "D:/RPA/AA/PoC 1/";
	const a = await getFromRust(path);
	console.log(path);
	console.log(a);
}

getEnv();

const envVars = z.object({
	VITE_ORIGIN_PATH: z.string(),
});

// envVars.parse(import.meta.env);
// console.log(import.meta.env.VITE_ORIGIN_PATH);

declare global {
	namespace NodeJS {
		interface ProcessEnv extends z.infer<typeof envVars> {}
	}
}
