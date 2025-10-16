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
    dateGroup: string;
    files: { name: string; path: string }[];
    initialIndex: number;
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
	  set((state) => {
	     console.log(`[Store] setSelectedFile called with file: ${file?.name}, path: ${path}`); // Log al inicio de la acción
	       // Only set selectedFile if tabbedLogView is not currently active
	       if (state.tabbedLogView) {
	         console.log(`[Store] setSelectedFile BLOCKED because tabbedLogView is active.`); // Log si se bloquea
	         return state; // Do not update if tabbedLogView is active
	       }
	       const newState = { selectedFile: file, selectedFilePath: path,
	  tabbedLogView: null, analysisLogView: null };
	     console.log(`[Store] setSelectedFile new state:`, newState); // Log el nuevo estado
	       return newState;
	     }),	removeFileName: (name) =>
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
        showTabbedLogView: (view) => set((state) => {
          console.log(`[Store] showTabbedLogView called with dateGroup: ${view.dateGroup}, initialIndex: ${view.initialIndex}`); // Log al inicio de la acción
          const newState = { tabbedLogView: view,
            analysisLogView: null, selectedFile: null, selectedFilePath: null };
          console.log(`[Store] showTabbedLogView new state:`, newState); // Log el nuevo estado
          return newState;
        }),
    showAnalysisLogView: (view) => set({ analysisLogView: view, tabbedLogView: null, selectedFile: null, selectedFilePath: null }),
        clearFileView: () => set((state) => {
          console.log(`[Store] clearFileView called.`); // Log al inicio de la acción
          const newState = { selectedFile: null, selectedFilePath: null,
            tabbedLogView: null, analysisLogView: null };
          console.log(`[Store] clearFileView new state:`, newState); // Log el nuevo estado
          return newState;
        }),
}));
