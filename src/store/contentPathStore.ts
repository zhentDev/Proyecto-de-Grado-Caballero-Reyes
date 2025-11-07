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
	selectedFile: File | null;
	selectedFilePath: string | null;
	setSelectedFile: (file: File | null, path?: string | null) => void;

	selectedFolder: Folder | null;
	setSelectedFolder: (folder: Folder | null) => void;

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
			selectedFile: null,
			selectedFilePath: null,
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

			selectedFolder: null,
			setSelectedFolder: (folder: Folder | null) =>
				set({ selectedFolder: folder }),

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
