use sha2::{Digest, Sha256};
use std::{fs, path::PathBuf, thread, time::Duration};
use tauri::{Emitter, Window};

#[tauri::command]
pub async fn watch_file(path: String, window: Window) -> Result<(), String> {
	let path_buf = PathBuf::from(&path);

	if !path_buf.exists() {
		return Err("El archivo no existe.".into());
	}

	let canonical_path = std::fs::canonicalize(&path_buf)
		.map_err(|e| format!("Error canonicalizando path: {}", e))?;

	// Emitir evento de que el watcher está listo
	window
		.emit(
			"watcher-ready",
			serde_json::json!({ "status": "ready", "path": path.clone() }),
		)
		.unwrap_or_else(|e| eprintln!("Error emitiendo watcher-ready: {}", e));

	// Lanzar hilo de polling por hash
	let window = window.clone();
	thread::spawn(move || {
		let mut last_hash = None;

		loop {
			thread::sleep(Duration::from_secs(2));

			match fs::read(&canonical_path) {
				Ok(content) => {
					let hash = Sha256::digest(&content);

					if Some(hash.clone()) != last_hash {
						last_hash = Some(hash);
						let _ = window.emit("file-change", {});
						println!(
							"✅ Cambio detectado por hash en: {}",
							canonical_path.display()
						);
					}
				}
				Err(e) => {
					eprintln!("Error leyendo archivo: {}", e);
				}
			}
		}
	});

	Ok(())
}
