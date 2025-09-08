import type { DirEntry } from "@tauri-apps/plugin-fs";
import { create } from "zustand";

interface File {
	name: string;
	content: string | null;
}

interface Folder {
	name: string;
	content: DirEntry[];
	path: string;
}

interface ContentPathState {
	filesNames: string[];
	selectedFile: File | null;
	addFileName: (name: string) => void;
	setFilesNames: (names: string[]) => void;
	setSelectedFile: (file: File | null) => void;
	removeFileName: (name: string) => void;

	foldersNames: string[];
	selectedFolder: Folder | null;
	addFolderName: (name: string) => void;
	setFoldersNames: (names: string[]) => void;
	setSelectedFolder: (folder: Folder | null) => void;
	removeFolderName: (name: string) => void;

	pathMain: string | null;
	setPathMain: (path: string | null) => void;
}

export const useContentPathStore = create<ContentPathState>((set) => ({
	filesNames: [],
	selectedFile: null,
	addFileName: (name) =>
		set((state) => ({
			filesNames: [...state.filesNames, name],
		})),
	setFilesNames: (names) => set({ filesNames: names }),
	setSelectedFile: (file) => set({ selectedFile: file }),
	removeFileName: (name) =>
		set((state) => ({
			filesNames: state.filesNames.filter((n) => n !== name),
		})),

	foldersNames: [],
	selectedFolder: null as Folder | null,
	addFolderName: (name) =>
		set((state) => ({
			foldersNames: [...state.foldersNames, name],
		})),
	setFoldersNames: (names) => set({ foldersNames: names }),
	setSelectedFolder: (folder: Folder | null) => set({ selectedFolder: folder }),
	removeFolderName: (name) =>
		set((state) => ({
			foldersNames: state.foldersNames.filter((n) => n !== name),
		})),
	pathMain: null,
	setPathMain: (path) => set({ pathMain: path }),
}));
