use serde_json::{json, Value};
use std::fs::File;
use std::io::{Read, Write};
// use std::path::PathBuf;

#[tauri::command]
pub fn set_remove_permission(path: &str) -> Result<String, String> {
	// Obtener la ruta base del proyecto (directorio de ejecución)
	let base_path = std::env::current_dir().map_err(|e| e.to_string())?;
	//println!("Ruta base del proyecto: {}", base_path.display());

	// Concatenar correctamente la ruta base con la subruta
	let full_path = base_path.join("capabilities/default.json");
	//println!("Ruta completa: {}", full_path.display());

	// Leer el archivo JSON
	let mut file = File::open(&full_path).map_err(|e| e.to_string())?;
	let mut content = String::new();
	file.read_to_string(&mut content)
		.map_err(|e| e.to_string())?;
	let mut json: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;

	// Crear el nuevo permiso para escritura
	let new_remove_permission = json!({
		"identifier": "fs:allow-remove",
		"allow": [{ "path": path }]
	});

	// Verificar si el permiso ya existe
	if let Some(permissions) = json["permissions"].as_array_mut() {
		if !permissions.iter().any(|p| {
			p["identifier"] == new_remove_permission["identifier"]
				&& p["allow"] == new_remove_permission["allow"]
		}) {
			permissions.push(new_remove_permission);

			// Escribir el JSON modificado en el archivo
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
		json["permissions"] = json!([new_remove_permission]);

		// Escribir el JSON modificado en el archivo
		let mut file = File::create(&full_path).map_err(|e| e.to_string())?;
		file.write_all(
			serde_json::to_string_pretty(&json)
				.map_err(|e| e.to_string())?
				.as_bytes(),
		)
		.map_err(|e| e.to_string())?;
		return Ok("OK".to_string());
	}
	// Mostrar el contenido JSON actual
	// println!(
	// 	"Contenido JSON actual: {}",
	// 	serde_json::to_string_pretty(&json).map_err(|e| e.to_string())?
	// );

	Ok("El permiso ya existe".to_string())
}
