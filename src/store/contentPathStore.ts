import { create } from "zustand";

interface File {
	name: string;
	content: string | null;
}

interface ContentPathState {
	filesNames: string[];
	selectedFile: File | null;
	addFileName: (name: string) => void;
	setFilesNames: (names: string[]) => void;
	setSelectedFile: (file: File | null) => void;
	removeFileName: (name: string) => void;

	foldersNames: string[];
	selectedFolder: string | null;
	addFolderName: (name: string) => void;
	setFoldersNames: (names: string[]) => void;
	setSelectedFolder: (folder: string | null) => void;
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
	selectedFolder: null,
	addFolderName: (name) =>
		set((state) => ({
			foldersNames: [...state.foldersNames, name],
		})),
	setFoldersNames: (names) => set({ foldersNames: names }),
	setSelectedFolder: (folder) => set({ selectedFolder: folder }),
	removeFolderName: (name) =>
		set((state) => ({
			foldersNames: state.foldersNames.filter((n) => n !== name),
		})),
	pathMain: null,
	setPathMain: (path) => set({ pathMain: path }),
}));
