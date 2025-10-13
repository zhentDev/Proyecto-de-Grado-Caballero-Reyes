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

// New interfaces for the different log view modes
export interface TabbedLogView {
    files: { name: string; path: string }[];
}

export interface AnalysisLogView {
    fileName: string;
    logContent: string;
}

interface ContentPathState {
	filesNames: string[];
	selectedFile: File | null;
	selectedFilePath: string | null;
	addFileName: (name: string) => void;
	setFilesNames: (names: string[]) => void;
	setSelectedFile: (file: File | null, path?: string | null) => void;
	removeFileName: (name: string) => void;

	foldersNames: string[];
	selectedFolder: Folder | null;
	addFolderName: (name: string) => void;
	setFoldersNames: (names: string[]) => void;
	setSelectedFolder: (folder: Folder | null) => void;
	removeFolderName: (name: string) => void;

	pathMain: string | null;
	setPathMain: (path: string | null) => void;

    // New state for log viewers
    tabbedLogView: TabbedLogView | null;
    analysisLogView: AnalysisLogView | null;
    showTabbedLogView: (view: TabbedLogView) => void;
    showAnalysisLogView: (view: AnalysisLogView) => void;
    clearFileView: () => void;
}

export const useContentPathStore = create<ContentPathState>((set) => ({
	filesNames: [],
	selectedFile: null,
	selectedFilePath: null,
	addFileName: (name) =>
		set((state) => ({ filesNames: [...state.filesNames, name] })),
	setFilesNames: (names) => set({ filesNames: names }),
    // Updated to use the new clear function
	setSelectedFile: (file, path = null) =>
		set(() => {
            return { selectedFile: file, selectedFilePath: path, tabbedLogView: null, analysisLogView: null };
        }),
	removeFileName: (name) =>
		set((state) => ({ filesNames: state.filesNames.filter((n) => n !== name) })),

	foldersNames: [],
	selectedFolder: null as Folder | null,
	addFolderName: (name) =>
		set((state) => ({ foldersNames: [...state.foldersNames, name] })),
	setFoldersNames: (names) => set({ foldersNames: names }),
	setSelectedFolder: (folder: Folder | null) => set({ selectedFolder: folder }),
	removeFolderName: (name) =>
		set((state) => ({ foldersNames: state.foldersNames.filter((n) => n !== name) })),
	pathMain: null,
	setPathMain: (path) => set({ pathMain: path }),

    // New state implementation for log viewers
    tabbedLogView: null,
    analysisLogView: null,
    showTabbedLogView: (view) => set({ tabbedLogView: view, analysisLogView: null, selectedFile: null, selectedFilePath: null }),
    showAnalysisLogView: (view) => set({ analysisLogView: view, tabbedLogView: null, selectedFile: null, selectedFilePath: null }),
    clearFileView: () => set({ selectedFile: null, selectedFilePath: null, tabbedLogView: null, analysisLogView: null }),
}));
