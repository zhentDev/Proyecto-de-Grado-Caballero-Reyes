use serde::Serialize;
use umya_spreadsheet::{reader, writer, Spreadsheet, Worksheet};

#[derive(Serialize)]
pub struct ExcelData {
	sheets: Vec<String>,
	rows: Vec<Vec<String>>,
}

#[tauri::command]
pub fn leer_excel(ruta: String, hoja: Option<String>) -> Result<ExcelData, String> {
	// Abrir el archivo
	let workbook = reader::xlsx::read(&ruta).map_err(|e| e.to_string())?;

	// Obtener todos los nombres de hojas
	let sheets: Vec<String> = workbook
		.get_sheet_collection()
		.iter()
		.map(|s| s.get_name().to_string())
		.collect();

	if sheets.is_empty() {
		return Err("El archivo no contiene hojas".to_string());
	}

	// Elegir la hoja
	let sheet_name = hoja.unwrap_or_else(|| sheets[0].clone());

	let sheet: &Worksheet = workbook
		.get_sheet_by_name(&sheet_name)
		.map_err(|_| "No se encontró ninguna hoja".to_string())?;

	// Detectar el rango máximo de la hoja
	let max_rows = sheet.get_highest_row();
	let max_cols = sheet.get_highest_column();

	let mut rows = Vec::new();
	for i in 1..=max_rows {
		let mut row_data = Vec::new();
		for j in 1..=max_cols {
			let val = sheet
				.get_cell((j as u32, i as u32))
				.map(|c| c.get_value().to_string())
				.unwrap_or_default();
			row_data.push(val);
		}
		rows.push(row_data);
	}

	Ok(ExcelData { sheets, rows })
}

#[tauri::command]
pub fn guardar_excel(ruta: String, datos: Vec<Vec<String>>) -> Result<(), String> {
	let mut book: Spreadsheet = reader::xlsx::read(&ruta).map_err(|e| e.to_string())?;

	// get_sheet_mut también devuelve Result
	let sheet = book
		.get_sheet_mut(&0)
		.map_err(|_| "No se encontró ninguna hoja".to_string())?;

	for (i, row) in datos.iter().enumerate() {
		for (j, cell) in row.iter().enumerate() {
			sheet
				.get_cell_mut(((j + 1) as u32, (i + 1) as u32))
				.set_value(cell);
		}
	}

	writer::xlsx::write(&book, &ruta).map_err(|e| e.to_string())
}
