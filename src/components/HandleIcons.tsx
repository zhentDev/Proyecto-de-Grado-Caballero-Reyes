// Importar iconos mejorados
import {
	BsFiletypeJson, BsFiletypeXml, BsFiletypeYml,
	BsFiletypeCss, BsFiletypeHtml
} from "react-icons/bs";
import {
	FaFolder, FaRegFile, FaFileArchive, FaFileAlt, FaDatabase, FaImage, FaMusic, FaVideo
} from "react-icons/fa";
import {
	FaFileImage, FaFileVideo, FaFileAudio, FaFileLines,
	FaFileZipper
} from "react-icons/fa6";
import {
	LuFolderInput, LuFolderOutput, LuFolders,
	LuFolderArchive, LuFolderCheck, LuFolderHeart
} from "react-icons/lu";
import { TbFolderCog, TbMarkdown, TbFileTypeSvg, TbFolderCode } from "react-icons/tb";
import {
	SiPython, SiJavascript, SiTypescript, SiReact, SiVuedotjs, SiPhp, SiRuby, SiGo, SiRust, SiSharp,
	SiCplusplus, SiC, SiSwift, SiKotlin, SiDart,
} from "react-icons/si";
import { FaJava } from 'react-icons/fa6';
import { FaFileWord, FaFilePowerpoint, FaFileExcel } from "react-icons/fa";
import {
	MdFolder, MdTableChart,
	MdAudioFile, MdVideoFile, MdImageSearch
} from "react-icons/md";
import { BsFileEarmarkPdf } from 'react-icons/bs';

// Definir tipos de archivos y sus características
type FileCategory = 'code' | 'document' | 'image' | 'audio' | 'video' | 'archive' | 'data' | 'config' | 'text' | 'special';

interface FileTypeInfo {
	icon: JSX.Element;
	category: FileCategory;
	canOpen: boolean; // Si se puede abrir en el editor
	description: string;
}

// Componente para iconos de archivos
export default function FileIcon({ item }: { item: string }) {
	// Sistema completo de iconos por extensión con mejores iconos
	const extensionMap: { [key: string]: FileTypeInfo } = {
		// Archivos de código
		".js": { icon: <SiJavascript className="text-yellow-400" />, category: 'code', canOpen: true, description: 'JavaScript' },
		".jsx": { icon: <SiReact className="text-blue-400" />, category: 'code', canOpen: true, description: 'React JSX' },
		".ts": { icon: <SiTypescript className="text-blue-600" />, category: 'code', canOpen: true, description: 'TypeScript' },
		".tsx": { icon: <SiReact className="text-blue-400" />, category: 'code', canOpen: true, description: 'React TSX' },
		".py": { icon: <SiPython className="text-yellow-500" />, category: 'code', canOpen: true, description: 'Python' },
		".java": { icon: <FaJava className="text-orange-600" />, category: 'code', canOpen: true, description: 'Java' },
		".c": { icon: <SiC className="text-blue-600" />, category: 'code', canOpen: true, description: 'C' },
		".cpp": { icon: <SiCplusplus className="text-blue-700" />, category: 'code', canOpen: true, description: 'C++' },
		".cs": { icon: <SiSharp className="text-purple-600" />, category: 'code', canOpen: true, description: 'C#' },
		".php": { icon: <SiPhp className="text-purple-500" />, category: 'code', canOpen: true, description: 'PHP' },
		".rb": { icon: <SiRuby className="text-red-600" />, category: 'code', canOpen: true, description: 'Ruby' },
		".go": { icon: <SiGo className="text-cyan-500" />, category: 'code', canOpen: true, description: 'Go' },
		".rs": { icon: <SiRust className="text-orange-700" />, category: 'code', canOpen: true, description: 'Rust' },
		".swift": { icon: <SiSwift className="text-orange-500" />, category: 'code', canOpen: true, description: 'Swift' },
		".kt": { icon: <SiKotlin className="text-purple-500" />, category: 'code', canOpen: true, description: 'Kotlin' },
		".dart": { icon: <SiDart className="text-blue-500" />, category: 'code', canOpen: true, description: 'Dart' },
		".vue": { icon: <SiVuedotjs className="text-green-500" />, category: 'code', canOpen: true, description: 'Vue.js' },

		// Archivos web
		".html": { icon: <BsFiletypeHtml className="text-orange-600" />, category: 'code', canOpen: true, description: 'HTML' },
		".css": { icon: <BsFiletypeCss className="text-blue-500" />, category: 'code', canOpen: true, description: 'CSS' },
		".scss": { icon: <BsFiletypeCss className="text-pink-500" />, category: 'code', canOpen: true, description: 'Sass' },
		".sass": { icon: <BsFiletypeCss className="text-pink-600" />, category: 'code', canOpen: true, description: 'Sass' },

		// Archivos de configuración y datos
		".json": { icon: <BsFiletypeJson className="text-yellow-300" />, category: 'data', canOpen: true, description: 'JSON' },
		".xml": { icon: <BsFiletypeXml className="text-green-600" />, category: 'data', canOpen: true, description: 'XML' },
		".yaml": { icon: <BsFiletypeYml className="text-red-500" />, category: 'config', canOpen: true, description: 'YAML' },
		".yml": { icon: <BsFiletypeYml className="text-red-500" />, category: 'config', canOpen: true, description: 'YAML' },
		".sql": { icon: <FaDatabase className="text-blue-400" />, category: 'data', canOpen: true, description: 'SQL' },
		".csv": { icon: <MdTableChart className="text-green-400" />, category: 'data', canOpen: true, description: 'CSV' },

		// Archivos de texto
		".txt": { icon: <FaFileLines className="text-gray-300" />, category: 'text', canOpen: true, description: 'Text File' },
		".md": { icon: <TbMarkdown className="text-blue-300" />, category: 'text', canOpen: true, description: 'Markdown' },
		".log": { icon: <FaFileAlt className="text-yellow-600" />, category: 'text', canOpen: true, description: 'Log File' },

		// Documentos (no editables directamente) - ICONOS MEJORADOS
		".doc": { icon: <FaFileWord className="text-blue-700" />, category: 'document', canOpen: false, description: 'Word Document' },
		".docx": { icon: <FaFileWord className="text-blue-700" />, category: 'document', canOpen: false, description: 'Word Document' },
		".xls": { icon: <FaFileExcel className="text-green-700" />, category: 'document', canOpen: false, description: 'Excel Spreadsheet' },
		".xlsx": { icon: <FaFileExcel className="text-green-700" />, category: 'document', canOpen: false, description: 'Excel Spreadsheet' },
		".ppt": { icon: <FaFilePowerpoint className="text-orange-600" />, category: 'document', canOpen: false, description: 'PowerPoint' },
		".pptx": { icon: <FaFilePowerpoint className="text-orange-600" />, category: 'document', canOpen: false, description: 'PowerPoint' },

		// Archivos comprimidos
		".zip": { icon: <FaFileZipper className="text-yellow-600" />, category: 'archive', canOpen: false, description: 'ZIP Archive' },
		".pdf": { icon: <BsFileEarmarkPdf className="text-red-500" />, category: 'archive', canOpen: false, description: 'ZIP Archive' },
		".rar": { icon: <FaFileArchive className="text-purple-600" />, category: 'archive', canOpen: false, description: 'RAR Archive' },
		".7z": { icon: <FaFileArchive className="text-orange-600" />, category: 'archive', canOpen: false, description: '7-Zip Archive' },
		".tar": { icon: <FaFileArchive className="text-gray-600" />, category: 'archive', canOpen: false, description: 'TAR Archive' },
		".gz": { icon: <FaFileArchive className="text-gray-600" />, category: 'archive', canOpen: false, description: 'GZip Archive' },

		// Imágenes
		".jpg": { icon: <FaImage className="text-blue-500" />, category: 'image', canOpen: false, description: 'JPEG Image' },
		".jpeg": { icon: <FaImage className="text-blue-500" />, category: 'image', canOpen: false, description: 'JPEG Image' },
		".png": { icon: <FaImage className="text-green-500" />, category: 'image', canOpen: false, description: 'PNG Image' },
		".gif": { icon: <FaFileImage className="text-pink-500" />, category: 'image', canOpen: false, description: 'GIF Image' },
		".svg": { icon: <TbFileTypeSvg className="text-orange-500" />, category: 'image', canOpen: false, description: 'SVG Vector' },
		".bmp": { icon: <FaFileImage className="text-blue-400" />, category: 'image', canOpen: false, description: 'Bitmap Image' },
		".webp": { icon: <FaFileImage className="text-purple-400" />, category: 'image', canOpen: false, description: 'WebP Image' },

		// Audio
		".mp3": { icon: <FaMusic className="text-green-600" />, category: 'audio', canOpen: false, description: 'MP3 Audio' },
		".wav": { icon: <MdAudioFile className="text-blue-600" />, category: 'audio', canOpen: false, description: 'WAV Audio' },
		".flac": { icon: <FaFileAudio className="text-yellow-600" />, category: 'audio', canOpen: false, description: 'FLAC Audio' },
		".ogg": { icon: <FaFileAudio className="text-purple-600" />, category: 'audio', canOpen: false, description: 'OGG Audio' },

		// Video
		".mp4": { icon: <FaVideo className="text-red-600" />, category: 'video', canOpen: false, description: 'MP4 Video' },
		".avi": { icon: <MdVideoFile className="text-blue-600" />, category: 'video', canOpen: false, description: 'AVI Video' },
		".mkv": { icon: <FaFileVideo className="text-purple-600" />, category: 'video', canOpen: false, description: 'MKV Video' },
		".mov": { icon: <FaFileVideo className="text-gray-600" />, category: 'video', canOpen: false, description: 'MOV Video' },
	};

	// Función para obtener extensión del archivo
	const getFileExtension = (filename: string): string => {
		const lastDot = filename.lastIndexOf('.');
		return lastDot !== -1 ? filename.slice(lastDot).toLowerCase() : '';
	};

	// Buscar por extensión
	const extension = getFileExtension(item);
	if (extensionMap[extension]) {
		const fileInfo = extensionMap[extension];
		return (
			<div
				className="flex items-center justify-center w-5 h-5"
				title={`${fileInfo.description} (${fileInfo.canOpen ? 'Editable' : 'Preview only'})`}
			>
				{fileInfo.icon}
			</div>
		);
	}

	// Archivo desconocido
	return (
		<div className="flex items-center justify-center w-5 h-5" title={`Archivo: ${item}`}>
			<FaRegFile className="text-gray-400" />
		</div>
	);
}

// Componente separado para iconos de carpetas
export function FolderIcon({ item }: { item: string }) {
	const specialFolderIcons: { [key: string]: JSX.Element } = {
		// Carpetas de entrada/salida
		"Inputs": <LuFolderInput className="text-blue-600" />,
		"Input": <LuFolderInput className="text-blue-600" />,
		"Entrada": <LuFolderInput className="text-blue-600" />,
		"Entradas": <LuFolderInput className="text-blue-600" />,
		"Outputs": <LuFolderOutput className="text-green-600" />,
		"Output": <LuFolderOutput className="text-green-600" />,
		"Salida": <LuFolderOutput className="text-green-600" />,
		"Salidas": <LuFolderOutput className="text-green-600" />,
		// Configuración
		"Config": <TbFolderCog className="text-orange-600" />,
		"Configuration": <TbFolderCog className="text-orange-600" />,
		"Settings": <TbFolderCog className="text-orange-600" />,
		"Configuracion": <TbFolderCog className="text-orange-600" />,
		"Ajustes": <TbFolderCog className="text-orange-600" />,
		// Plantillas/Templates
		"Plantillas": <LuFolders className="text-purple-600" />,
		"Templates": <LuFolders className="text-purple-600" />,
		"Modelos": <LuFolders className="text-purple-600" />,
		// Logs
		"Logs": <TbFolderCog className="text-yellow-600" />,
		"Log": <TbFolderCog className="text-yellow-600" />,
		"Registros": <TbFolderCog className="text-yellow-600" />,
		// Documentos
		"Documents": <MdFolder className="text-blue-500" />,
		"Documentos": <MdFolder className="text-blue-500" />,
		"Docs": <MdFolder className="text-blue-500" />,
		// Multimedia
		"Images": <MdImageSearch className="text-green-500" />,
		"Imagenes": <MdImageSearch className="text-green-500" />,
		"Pictures": <MdImageSearch className="text-green-500" />,
		"Fotos": <MdImageSearch className="text-green-500" />,
		"Videos": <MdVideoFile className="text-red-500" />,
		"Movies": <MdVideoFile className="text-red-500" />,
		"Peliculas": <MdVideoFile className="text-red-500" />,
		"Audio": <MdAudioFile className="text-pink-500" />,
		"Music": <MdAudioFile className="text-pink-500" />,
		"Musica": <MdAudioFile className="text-pink-500" />,
		"Sound": <MdAudioFile className="text-pink-500" />,
		// Código/Desarrollo
		"src": <TbFolderCode className="text-cyan-600" />,
		"source": <TbFolderCode className="text-cyan-600" />,
		"code": <TbFolderCode className="text-cyan-600" />,
		"desarrollo": <TbFolderCode className="text-cyan-600" />,
		// Archivos
		"Archive": <LuFolderArchive className="text-gray-600" />,
		"Archives": <LuFolderArchive className="text-gray-600" />,
		"Archivo": <LuFolderArchive className="text-gray-600" />,
		"Archivos": <LuFolderArchive className="text-gray-600" />,
		// Especiales
		"Temp": <TbFolderCog className="text-gray-500" />,
		"Temporal": <TbFolderCog className="text-gray-500" />,
		"Cache": <TbFolderCog className="text-gray-500" />,
		"Backup": <LuFolderCheck className="text-indigo-600" />,
		"Respaldo": <LuFolderCheck className="text-indigo-600" />,
		"Favorites": <LuFolderHeart className="text-red-500" />,
		"Favoritos": <LuFolderHeart className="text-red-500" />,
	};

	if (item in specialFolderIcons) {
		return (
			<div className="flex items-center justify-center w-5 h-5" title={`Carpeta especial: ${item}`}>
				{specialFolderIcons[item]}
			</div>
		);
	}

	return (
		<div className="flex items-center justify-center w-5 h-5" title={`Carpeta: ${item}`}>
			<FaFolder className="text-blue-600" />
		</div>
	);
}

// Función auxiliar para verificar si un archivo se puede abrir
export function canOpenFile(filename: string): boolean {
	const lastDot = filename.lastIndexOf('.');
	const extension = lastDot !== -1 ? filename.slice(lastDot).toLowerCase() : '';
	const editableExtensions = [
		'.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.cs',
		'.php', '.rb', '.go', '.rs', '.swift', '.kt', '.dart', '.vue', '.html', '.css', '.scss', '.sass',
		'.json', '.xml', '.yaml', '.yml', '.sql', '.csv', '.txt', '.md', '.log'
	];
	return editableExtensions.includes(extension);
}

// Función para obtener descripción del tipo de archivo
export function getFileDescription(filename: string): string {
	const getFileExtension = (filename: string): string => {
		const lastDot = filename.lastIndexOf('.');
		return lastDot !== -1 ? filename.slice(lastDot).toLowerCase() : '';
	};

	const extension = getFileExtension(filename);

	// Mapeo simple de extensiones a descripciones
	const descriptions: { [key: string]: string } = {
		'.pdf': 'PDF Document - Vista previa no disponible',
		'.doc': 'Word Document - Vista previa no disponible',
		'.docx': 'Word Document - Vista previa no disponible',
		'.xls': 'Excel Spreadsheet - Vista previa no disponible',
		'.xlsx': 'Excel Spreadsheet - Vista previa no disponible',
		'.ppt': 'PowerPoint Presentation - Vista previa no disponible',
		'.pptx': 'PowerPoint Presentation - Vista previa no disponible',
		'.zip': 'ZIP Archive - No se puede abrir',
		'.rar': 'RAR Archive - No se puede abrir',
		'.7z': '7-Zip Archive - No se puede abrir',
		'.mp3': 'MP3 Audio - Reproductor no disponible',
		'.wav': 'WAV Audio - Reproductor no disponible',
		'.mp4': 'MP4 Video - Reproductor no disponible',
		'.avi': 'AVI Video - Reproductor no disponible',
		'.jpg': 'JPEG Image - Visor de imágenes no disponible',
		'.png': 'PNG Image - Visor de imágenes no disponible',
	};

	return descriptions[extension] || 'Archivo no reconocido';
}
