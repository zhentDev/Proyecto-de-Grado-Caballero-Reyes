use serde_json::{json, Value};
use std::fs::{read_dir, File};
use std::io::{Read, Write};
use std::path::Path;

#[tauri::command]
pub fn set_read_permission(path: &str) -> Result<String, String> {
	let base_path = std::env::current_dir().map_err(|e| e.to_string())?;
	let full_path = base_path.join("capabilities/default.json");

	let mut file = File::open(&full_path).map_err(|e| e.to_string())?;
	let mut content = String::new();
	file.read_to_string(&mut content)
		.map_err(|e| e.to_string())?;
	let mut json: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;

	// Construir el array de permisos con la ruta principal y todas las subcarpetas
	let mut allow = vec![json!("**/*"), json!({ "path": path })];

	// Buscar subcarpetas y agregarlas
	if let Ok(entries) = read_dir(Path::new(path)) {
		for entry in entries.flatten() {
			let entry_path = entry.path();
			if entry_path.is_dir() {
				allow.push(json!({ "path": format!("{}/*", entry_path.display()) }));
				allow.push(json!({ "path": format!("{}/**/*", entry_path.display()) }));
			}
		}
	}

	let new_read_permission = json!({
		"identifier": "fs:scope",
		"requireLiteralLeadingDot": false,
		"allow": allow
	});

	if let Some(permissions) = json["permissions"].as_array_mut() {
		if !permissions.iter().any(|p| {
			p["identifier"] == new_read_permission["identifier"]
				&& p["allow"] == new_read_permission["allow"]
		}) {
			permissions.push(new_read_permission);

			let mut file = File::create(&full_path).map_err(|e| e.to_string())?;
			file.write_all(
				serde_json::to_string_pretty(&json)
					.map_err(|e| e.to_string())?
					.as_bytes(),
			)
			.map_err(|e| e.to_string())?;
			return Ok("OK".to_string());
		}
	} else {
		json["permissions"] = json!([new_read_permission]);
		let mut file = File::create(&full_path).map_err(|e| e.to_string())?;
		file.write_all(
			serde_json::to_string_pretty(&json)
				.map_err(|e| e.to_string())?
				.as_bytes(),
		)
		.map_err(|e| e.to_string())?;
		return Ok("OK".to_string());
	}

	Ok("El permiso ya existe".to_string())
}
