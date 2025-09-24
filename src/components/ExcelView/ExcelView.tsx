import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

type ExcelData = {
	sheets: string[];
	rows: string[][];
};

let idCounter = 0;
const uniqueId = (prefix = "") => `${prefix}${idCounter++}`;

const MIN_ROWS = 20;
const MIN_COLS = 15;
const CHAR_WIDTH = 9; // Increased from 8
const MIN_COL_WIDTH = 100;

function ExcelView({ path }: { path: string }) {
	const [menuVisible, setMenuVisible] = useState(false);
	const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

	const [data, setData] = useState<string[][]>([]);
	const [gridData, setGridData] = useState<string[][]>([]);
	const [sheets, setSheets] = useState<string[]>([]);
	const [activeSheet, setActiveSheet] = useState("");
	const [colWidths, setColWidths] = useState<number[]>([]);

	useEffect(() => {
		if (path) {
			abrirExcel(path);
		}
	}, [path]);

	useEffect(() => {
		const rows = Math.max(MIN_ROWS, data.length);
		let maxCols = MIN_COLS;
		if (data.length > 0) {
			maxCols = Math.max(MIN_COLS, ...data.map((r) => r.length));
		}

		const newGrid: string[][] = Array.from({ length: rows }, () =>
			Array.from({ length: maxCols }, () => "")
		);

		for (let i = 0; i < data.length; i++) {
			for (let j = 0; j < data[i].length; j++) {
				newGrid[i][j] = data[i][j];
			}
		}

		setGridData(newGrid);
	}, [data]);

	useEffect(() => {
		if (gridData.length === 0) return;

		const newColWidths: number[] = [];
		const numCols = gridData[0].length;

		for (let j = 0; j < numCols; j++) {
			let maxLen = 0;
			for (let i = 0; i < gridData.length; i++) {
				const cellLength = gridData[i][j]?.length || 0;
				if (cellLength > maxLen) {
					maxLen = cellLength;
				}
			}
			newColWidths[j] = Math.max(MIN_COL_WIDTH, maxLen * CHAR_WIDTH + 24); // Increased padding
		}
		setColWidths(newColWidths);
	}, [gridData]);

	async function abrirExcel(filePath: string) {
		try {
			const res = await invoke<ExcelData>("leer_excel", { ruta: filePath });
			setSheets(res.sheets || []);
			setActiveSheet(res.sheets?.[0] || "");
			setData(res.rows || []);
		} catch (err) {
			alert(`Error al abrir Excel: ${err}`);
		}
	}

	async function cambiarHoja(hoja: string) {
		try {
			const res = await invoke<ExcelData>("leer_excel", {
				ruta: path,
				hoja,
			});
			setActiveSheet(hoja);
			setData(res.rows || []);
		} catch (err) {
			alert(`Error al cambiar de hoja: ${err}`);
		}
	}

	async function guardarExcel() {
		try {
			// Filter empty rows and columns before saving
			const filteredData = data.filter((row) =>
				row.some((cell) => cell && cell.trim() !== "")
			);
			await invoke("guardar_excel", { ruta: path, datos: filteredData });
			alert("Archivo guardado con éxito!");
		} catch (err) {
			alert(`Error al guardar Excel: ${err}`);
		}
	}

	function handleContextMenu(e: React.MouseEvent) {
		e.preventDefault();
		setMenuPos({ x: e.clientX, y: e.clientY });
		setMenuVisible(true);
	}

	function handleClick() {
		setMenuVisible(false);
	}

	function editarCelda(i: number, j: number, valor: string) {
		console.log(`Editing cell (${i}, ${j}) with value:`, valor);
		const newData = [...data];
		while (newData.length <= i) {
			newData.push([]);
		}
		const newRow = [...newData[i]];
		while (newRow.length <= j) {
			newRow.push("");
		}
		newRow[j] = valor;
		newData[i] = newRow;
		setData(newData);
	}

	function agregarColumna() {
		const newGrid = gridData.map((fila) => [...fila, ""]);
		setGridData(newGrid);
		setMenuVisible(false);
	}

	function agregarFila() {
		const newRow = Array(gridData[0]?.length || MIN_COLS).fill("");
		const newGrid = [...gridData, newRow];
		setGridData(newGrid);
		setMenuVisible(false);
	}

	return (
		<div
			className="p-4 bg-[#1f2327] text-white h-full flex flex-col"
			onClick={handleClick}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					handleClick();
				}
			}}
		>
			<div className="mb-4 flex gap-2 flex-shrink-0">
				<button
					type="button"
					onClick={guardarExcel}
					className="bg-sky-700 text-white px-4 py-2 rounded-md hover:bg-sky-800 transition-colors"
				>
					Guardar Excel
				</button>
				{sheets.length > 0 && (
					<select
						value={activeSheet}
						onChange={(e) => cambiarHoja(e.target.value)}
						className="bg-[#25333d] border border-slate-500 rounded-md px-3 py-1"
					>
						{sheets.map((sheet) => (
							<option key={sheet} value={sheet}>
								{sheet}
							</option>
						))}
					</select>
				)}
			</div>

			<div className="overflow-auto flex-grow">
				<table className="border-collapse" onContextMenu={handleContextMenu}>
					<colgroup>
						{colWidths.map((width, j) => (
							<col key={uniqueId(`col-${j}`)} style={{ width: `${width}px` }} />
						))}
					</colgroup>
					<tbody>
						{gridData.map((row, i) => (
							<tr key={uniqueId("row-")}>
								{row.map((cell, j) => (
									<td
										key={uniqueId("cell-")}
										className="border border-slate-700 p-0 h-7"
									>
										<input
											value={cell}
											onChange={(e) => editarCelda(i, j, e.target.value)}
											className="w-full h-full bg-transparent outline-none px-2"
										/>
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>

				{menuVisible && (
					<ul
						className="absolute bg-[#25333d] border border-slate-700 rounded-md shadow-lg"
						style={{ top: menuPos.y, left: menuPos.x }}
					>
						<li
							onClick={agregarFila}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									agregarFila();
								}
							}}
							className="px-4 py-2 hover:bg-sky-700 cursor-pointer"
						>
							➕ Agregar Fila
						</li>
						<li
							onClick={agregarColumna}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									agregarColumna();
								}
							}}
							className="px-4 py-2 hover:bg-sky-700 cursor-pointer"
						>
							➕ Agregar Columna
						</li>
					</ul>
				)}
			</div>
		</div>
	);
}

export default ExcelView;
