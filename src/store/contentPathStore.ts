import type { DirEntry } from "@tauri-apps/plugin-fs";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface File {
	name: string;
	content: string | null;
}

interface Folder {
	name: string;
	content: DirEntry[];
	path: string;
}

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

	// Estados para vistas de logs
	tabbedLogView: TabbedLogView | null;
	analysisLogView: AnalysisLogView | null;
	showTabbedLogView: (view: TabbedLogView) => void;
	showAnalysisLogView: (view: AnalysisLogView) => void;
	clearFileView: () => void;

	// Estado de rehidratación
	rehydrated: boolean;
	setRehydrated: (v: boolean) => void;
}

export const useContentPathStore = create<ContentPathState>()(
	persist(
		(set, _get) => ({
			filesNames: [],
			selectedFile: null,
			selectedFilePath: null,
			addFileName: (name) =>
				set((state) => ({ filesNames: [...state.filesNames, name] })),
			setFilesNames: (names) => set({ filesNames: names }),
			setSelectedFile: (file, path = null) =>
				set((state) => {
					if (state.tabbedLogView) return state;
					return {
						selectedFile: file,
						selectedFilePath: path,
						tabbedLogView: null,
						analysisLogView: null,
					};
				}),
			removeFileName: (name) =>
				set((state) => ({
					filesNames: state.filesNames.filter((n) => n !== name),
				})),

			foldersNames: [],
			selectedFolder: null,
			addFolderName: (name) =>
				set((state) => ({ foldersNames: [...state.foldersNames, name] })),
			setFoldersNames: (names) => set({ foldersNames: names }),
			setSelectedFolder: (folder: Folder | null) =>
				set({ selectedFolder: folder }),
			removeFolderName: (name) =>
				set((state) => ({
					foldersNames: state.foldersNames.filter((n) => n !== name),
				})),

			pathMain: null,
			setPathMain: (path) => set({ pathMain: path }),

			tabbedLogView: null,
			analysisLogView: null,
			showTabbedLogView: (view) =>
				set(() => ({
					tabbedLogView: view,
					analysisLogView: null,
					selectedFile: null,
					selectedFilePath: null,
				})),
			showAnalysisLogView: (view) =>
				set(() => ({
					analysisLogView: view,
					tabbedLogView: null,
					selectedFile: null,
					selectedFilePath: null,
				})),
			clearFileView: () =>
				set(() => ({
					selectedFile: null,
					selectedFilePath: null,
					tabbedLogView: null,
					analysisLogView: null,
				})),

			// Control de rehidratación
			rehydrated: false,
			setRehydrated: (v) => set({ rehydrated: v }),
		}),
		{
			name: "content-path-store",
			partialize: (state) => ({
				pathMain: state.pathMain, // persistimos solo el path principal
			}),
			onRehydrateStorage: () => (state) => {
				if (state && typeof state.setRehydrated === "function") {
					state.setRehydrated(true);
				}
			},
		},
	),
);
