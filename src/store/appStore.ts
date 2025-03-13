import { create } from "zustand";

interface OriginFolder {
	name: string | null;
}

interface OriginFiles {
	filesNames: string[];
}

export const useOriginFolderStore = create<OriginFiles>((set) => ({
	name: null,
	folderNames: [],
	filesNames: [],
}));
