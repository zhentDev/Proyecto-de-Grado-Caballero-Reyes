use encoding_rs::WINDOWS_1252;
use encoding_rs_io::DecodeReaderBytesBuilder;
use regex::Regex;
use std::fs::File;
// use std::fs::{File, OpenOptions};
use std::io::{BufRead, BufReader};
// use std::io::{BufRead, BufReader, Write};
use tauri::command;

#[command]
pub fn process_log_file(
	path: String,
	delimiter: String,
) -> Result<(Vec<Vec<String>>, Option<String>), String> {
	// Abrir archivo con decoder de encoding
	let file =
		File::open(&path).map_err(|e| format!("Error abriendo archivo desde log.rs: {}", e))?;
	let reader = BufReader::new(
		DecodeReaderBytesBuilder::new()
			.encoding(Some(WINDOWS_1252))
			.build(file),
	);

	let escaped_delimiter = regex::escape(&delimiter);
	let regex = Regex::new(&escaped_delimiter).map_err(|e| format!("Error en regex: {}", e))?;

	let mut rows = Vec::new();

	let mut maquina: Option<String> = None;
	for (_, line_result) in reader.lines().enumerate() {
		let line = line_result.map_err(|e| {
			// Convertir bytes problemáticos a String válido
			let error_message = e.to_string();
			let (cow, _, _) = WINDOWS_1252.decode(error_message.as_bytes());
			cow.into_owned()
		})?;

		let mut columns: Vec<String> = regex.split(&line).map(|s| s.trim().to_string()).collect();

		if maquina.is_none() {
			maquina = columns.pop();
		} else {
			columns.pop();
		};

		rows.push(columns);
	}

	Ok((rows, maquina))
}
