use encoding_rs::WINDOWS_1252;
use encoding_rs_io::DecodeReaderBytesBuilder;
use regex::Regex;
use std::fs::File;
use std::io::{BufRead, BufReader};
use tauri::command;

#[command]
pub fn process_log_file(
	path: String,
	delimiter: String,
) -> Result<(Vec<Vec<String>>, Option<String>), String> {
	let file = File::open(&path).map_err(|e| format!("Error abriendo archivo: {}", e))?;
	let reader = BufReader::new(
		DecodeReaderBytesBuilder::new()
			.encoding(Some(WINDOWS_1252))
			.build(file),
	);

	// Regex para validar si una columna parece ser una fecha (ej. YYYY-MM-DD, DD/MM/YYYY, etc.).
	let date_regex = Regex::new(r"^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}").unwrap();

	let mut processed_lines: Vec<String> = Vec::new();

	for line_result in reader.lines() {
		let line = line_result.map_err(|e| e.to_string())?;

		let columns: Vec<&str> = line.split(&delimiter).collect();

		// Una línea es el inicio de una nueva entrada si tiene suficientes columnas Y la segunda parece una fecha.
		if columns.len() > 1 && date_regex.is_match(columns[1].trim()) {
			processed_lines.push(line);
		} else {
			// Si no, es una continuación de la línea anterior.
			if let Some(last_line) = processed_lines.last_mut() {
				last_line.push('\n');
				last_line.push_str(&line);
			}
		}
	}

	let escaped_delimiter = regex::escape(&delimiter);
	let regex = Regex::new(&escaped_delimiter).map_err(|e| format!("Error en regex: {}", e))?;
	let mut rows = Vec::new();
	let mut maquina: Option<String> = None;

	for line in processed_lines {
		let mut columns: Vec<String> = regex.split(&line).map(|s| s.trim().to_string()).collect();

		if maquina.is_none() {
			maquina = columns.pop();
		} else {
			columns.pop();
		}
		rows.push(columns);
	}

	Ok((rows, maquina))
}