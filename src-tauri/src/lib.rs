use std::fs::File;
use std::io::{Read, Write};
use serde_json::{Value, json};

use tauri_plugin_fs::FsExt;


#[tauri::command]
fn set_oririn_path(path: &str) -> Result<String, String> {
    let json_path = "C:/Users/cabal/Desktop/Proyecto-de-Grado-Caballero-Reyes/src-tauri/capabilities/default.json";

    // Leer el archivo JSON
    let mut file = File::open(json_path).map_err(|e| e.to_string())?;
    let mut content = String::new();
    file.read_to_string(&mut content).map_err(|e| e.to_string())?;
    let mut json: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    // Crear el nuevo permiso
    let new_permission = json!({
        "identifier": "fs:allow-write-text-file",
        "allow": [{ "path": path }]
    });

    // Verificar si el permiso ya existe
    let mut permission_exists = false;
    if let Some(permissions) = json["permissions"].as_array() {
        for permission in permissions {
            if permission["identifier"] == new_permission["identifier"] && permission["allow"] == new_permission["allow"] {
                permission_exists = true;
                break;
            }
        }
    }

    // Agregar el nuevo permiso solo si no existe
    if !permission_exists {
        if let Some(permissions) = json["permissions"].as_array_mut() {
            permissions.push(new_permission);
        }

        // Escribir el JSON modificado en el archivo
        let mut file = File::create(json_path).map_err(|e| e.to_string())?;
        file.write_all(serde_json::to_string_pretty(&json).map_err(|e| e.to_string())?.as_bytes()).map_err(|e| e.to_string())?;

		// Devolver mensaje de éxito
        return Ok("OK".to_string());
    }

    // Mostrar el contenido JSON actual
    println!("Contenido JSON actual: {}", serde_json::to_string_pretty(&json).map_err(|e| e.to_string())?);

	// Devolver mensaje si el permiso ya existe
    Ok("El permiso ya existe".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
	tauri::Builder::default()
		.plugin(tauri_plugin_dialog::init())
		.plugin(tauri_plugin_fs::init())
		.plugin(tauri_plugin_opener::init())
		.setup(|app| {
			// allowed the given directory
			let scope = app.fs_scope();
			let _ = scope.allow_directory(r"D:/tauri-app/avatar.txt", false);
			dbg!(scope.is_allowed(r"D:/tauri-app/avatar.txt"));

			Ok(())
		})
		.invoke_handler(tauri::generate_handler![set_oririn_path])
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}
