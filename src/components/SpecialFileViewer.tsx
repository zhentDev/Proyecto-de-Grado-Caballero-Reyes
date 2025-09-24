import { FaDownload, FaExclamationTriangle, FaEye } from "react-icons/fa";
import { getFileDescription } from "./HandleIcons";

interface SpecialFileViewerProps {
	fileName: string;
}

export default function SpecialFileViewer({
	fileName,
}: SpecialFileViewerProps) {
	const description = getFileDescription(fileName);

	const getFileCategory = (filename: string): string => {
		const extension = filename.slice(filename.lastIndexOf(".")).toLowerCase();

		const categories: { [key: string]: string } = {
			".pdf": "Documento PDF",
			".doc": "Documento de Word",
			".docx": "Documento de Word",
			".xls": "Hoja de cálculo de Excel",
			".xlsx": "Hoja de cálculo de Excel",
			".ppt": "Presentación de PowerPoint",
			".pptx": "Presentación de PowerPoint",
			".zip": "Archivo comprimido ZIP",
			".rar": "Archivo comprimido RAR",
			".7z": "Archivo comprimido 7-Zip",
			".mp3": "Archivo de audio MP3",
			".wav": "Archivo de audio WAV",
			".mp4": "Archivo de video MP4",
			".avi": "Archivo de video AVI",
			".jpg": "Imagen JPEG",
			".jpeg": "Imagen JPEG",
			".png": "Imagen PNG",
			".gif": "Imagen GIF",
			".svg": "Imagen vectorial SVG",
		};

		return categories[extension] || "Archivo especial";
	};

	const getFutureFeatures = (filename: string): string[] => {
		const extension = filename.slice(filename.lastIndexOf(".")).toLowerCase();

		const features: { [key: string]: string[] } = {
			".pdf": [
				"Vista previa de PDF",
				"Búsqueda de texto",
				"Navegación por páginas",
			],
			".doc": ["Vista previa del documento", "Extracción de texto"],
			".docx": ["Vista previa del documento", "Extracción de texto"],
			".xls": ["Vista de hoja de cálculo", "Explorador de datos"],
			".xlsx": ["Vista de hoja de cálculo", "Explorador de datos"],
			".ppt": ["Vista de presentación", "Navegación por diapositivas"],
			".pptx": ["Vista de presentación", "Navegación por diapositivas"],
			".zip": ["Explorador de archivos", "Extracción selectiva"],
			".rar": ["Explorador de archivos", "Extracción selectiva"],
			".7z": ["Explorador de archivos", "Extracción selectiva"],
			".mp3": ["Reproductor de audio", "Visualizador de metadatos"],
			".wav": ["Reproductor de audio", "Análisis de forma de onda"],
			".mp4": ["Reproductor de video", "Vista previa de miniaturas"],
			".avi": ["Reproductor de video", "Información del códec"],
			".jpg": ["Visor de imágenes", "Editor básico"],
			".jpeg": ["Visor de imágenes", "Editor básico"],
			".png": ["Visor de imágenes", "Editor básico"],
			".gif": ["Visor de imágenes animadas"],
			".svg": ["Visor de gráficos vectoriales", "Editor de código SVG"],
		};

		return features[extension] || ["Visor especializado"];
	};

	return (
		<div className="flex items-center justify-center h-full bg-gray-900 text-white">
			<div className="text-center max-w-md p-8">
				{/* Icono principal */}
				<div className="mb-6">
					<FaExclamationTriangle className="mx-auto text-6xl text-yellow-500 mb-4" />
				</div>

				{/* Título */}
				<h2 className="text-2xl font-bold mb-4 text-gray-100">
					Archivo no editable
				</h2>

				{/* Información del archivo */}
				<div className="bg-gray-800 rounded-lg p-4 mb-6 text-left">
					<div className="flex items-center mb-2">
						<span className="font-semibold text-blue-400">Archivo:</span>
						<span className="ml-2 text-gray-200">{fileName}</span>
					</div>
					<div className="flex items-center mb-2">
						<span className="font-semibold text-green-400">Tipo:</span>
						<span className="ml-2 text-gray-200">
							{getFileCategory(fileName)}
						</span>
					</div>
				</div>

				{/* Mensaje principal */}
				<p className="text-gray-300 mb-6 leading-relaxed">
					Este tipo de archivo requiere un visor especializado que será
					implementado en futuras versiones de la aplicación.
				</p>

				{/* Características futuras */}
				<div className="bg-gray-800 rounded-lg p-4 mb-6">
					<h3 className="font-semibold text-blue-400 mb-3 flex items-center">
						<FaEye className="mr-2" />
						Características planeadas:
					</h3>
					<ul className="text-sm text-gray-300 space-y-1">
						{getFutureFeatures(fileName).map((feature, index) => (
							<li key={index + feature} className="flex items-center">
								<span className="w-2 h-2 bg-blue-400 rounded-full mr-3 flex-shrink-0">
									{feature}
								</span>
							</li>
						))}
					</ul>
				</div>

				{/* Botones de acción (para futuras implementaciones) */}
				<div className="flex gap-4 justify-center">
					<button
						type="button"
						className="flex items-center px-4 py-2 bg-gray-700 text-gray-400 rounded-lg cursor-not-allowed"
						disabled
					>
						<FaEye className="mr-2" />
						Vista previa
					</button>
					<button
						type="button"
						className="flex items-center px-4 py-2 bg-gray-700 text-gray-400 rounded-lg cursor-not-allowed"
						disabled
					>
						<FaDownload className="mr-2" />
						Descargar
					</button>
				</div>

				{/* Nota al pie */}
				<p className="text-xs text-gray-500 mt-6">
					Mientras tanto, puedes usar aplicaciones externas para ver este
					archivo.
				</p>
			</div>
		</div>
	);
}
