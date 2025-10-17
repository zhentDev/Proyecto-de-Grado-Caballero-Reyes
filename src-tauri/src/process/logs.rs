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
    println!("🟡 Iniciando lectura del archivo: {}", path);
 
    let file = File::open(&path).map_err(|e| format!("❌ Error abriendo archivo: {}", e))?;
    println!("✅ Archivo abierto correctamente.");
 
    let reader = BufReader::new(
        DecodeReaderBytesBuilder::new()
            .encoding(Some(WINDOWS_1252))
            .build(file),
    );
 
    // Regex para validar si una columna parece ser una fecha (acepta varios formatos)
    let date_regex = Regex::new(
        r#"^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}(?:\s+\d{1,2}[:.]\d{2}(?::\d{2})?)?$"#
    ).unwrap();
 
    // Regex para detectar niveles de log comunes
    let level_regex = Regex::new(r#"(?i)^(INFO|ERROR|WARN|WARNING|DEBUG|TRACE|FATAL)$"#).unwrap();
 
    let mut processed_lines: Vec<String> = Vec::new();
    let mut line_count = 0;
 
    for line_result in reader.lines() {
        let line = line_result.map_err(|e| e.to_string())?;
        line_count += 1;
 
        if line_count <= 5 {
            println!("📄 Línea {}: {}", line_count, line);
        }
 
        let columns: Vec<&str> = line.split(&delimiter).collect();
        println!("🔹 Columnas detectadas ({}): {:?}", columns.len(), columns);
 
        if columns.len() > 1
&& (date_regex.is_match(columns[0].trim())
                || date_regex.is_match(columns[1].trim())
                || level_regex.is_match(columns[0].trim())
                || level_regex.is_match(columns[1].trim()))
        {
            processed_lines.push(line);
        } else {
            if let Some(last_line) = processed_lines.last_mut() {
                last_line.push('\n');
                last_line.push_str(&line);
            }
        }
    }
 
    println!("📊 Total de líneas procesadas: {}", line_count);
    println!("🧩 Líneas válidas para procesar: {}", processed_lines.len());
 
    let escaped_delimiter = regex::escape(&delimiter);
    let regex = Regex::new(&escaped_delimiter).map_err(|e| format!("Error en regex: {}", e))?;
    let mut rows = Vec::new();
    let mut maquina: Option<String> = None;
 
    for (i, line) in processed_lines.iter().enumerate() {
        let mut columns: Vec<String> = regex.split(line).map(|s| s.trim().to_string()).collect();
 
        // --- 🔁 Detectar si la primera columna es fecha y la segunda es nivel ---
        if columns.len() >= 2 {
            let first_is_date = date_regex.is_match(&columns[0]);
            let second_is_date = date_regex.is_match(&columns[1]);
            let first_is_level = level_regex.is_match(&columns[0]);
            let second_is_level = level_regex.is_match(&columns[1]);
 
            // Si la fecha está primero y el nivel después → invertirlas
            if first_is_date && second_is_level {
                columns.swap(0, 1);
            }
        }
 
        if i < 3 {
            println!("🔹 Fila {}: {:?}", i + 1, columns);
        }
 
        if maquina.is_none() {
            maquina = columns.last().cloned();
        }
 
        rows.push(columns);
    }
 
    println!("✅ Archivo procesado correctamente. Filas finales: {}", rows.len());
    if let Some(ref m) = maquina {
        println!("🖥️ Máquina detectada: {}", m);
    }
 
    Ok((rows, maquina))
}