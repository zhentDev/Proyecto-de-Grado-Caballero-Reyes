import {
    BsFiletypeJson,
    BsFiletypeXlsx,
} from "react-icons/bs";
import {
    PiFileTxt,
    PiFileCsv,
    PiFolderStarLight,
} from "react-icons/pi";
import { SiPython } from "react-icons/si";
import { TbBrandJavascript, TbFolderCog } from "react-icons/tb";
import { FaFolder } from "react-icons/fa";
import { LuFolderInput, LuFolderOutput } from "react-icons/lu";


export default function FileIcon({ item }: { item: string }) {
    // Mapear extensiones a íconos
    const extensionIcons = {
        ".json": <BsFiletypeJson className="text-neutral-500" />,
        ".txt": <PiFileTxt className="text-neutral-500" />,
        ".xlsx": <BsFiletypeXlsx className="text-neutral-500" />,
        ".csv": <PiFileCsv className="text-neutral-500" />,
        ".py": <SiPython className="text-neutral-500" />,
        ".js": <TbBrandJavascript className="text-neutral-500" />,
    };

    // Mapear nombres específicos a íconos
    const folderIcons = {
        Inputs: <LuFolderInput className="text-neutral-500" />,
        Outputs: <LuFolderOutput className="text-neutral-500" />,
        Config: <TbFolderCog className="text-neutral-500" />,
        Plantillas: <PiFolderStarLight className="text-neutral-500" />,
    };

    // Mostrar el ícono por extensión
    for (const [extension, icon] of Object.entries(extensionIcons)) {
        if (item.endsWith(extension)) return icon;
    }

    // Mostrar el ícono por nombre específico
    if (folderIcons[item as keyof typeof folderIcons]) return folderIcons[item as keyof typeof folderIcons];

    // Ícono por defecto (carpeta)
    return <FaFolder className="text-neutral-500" />;
}