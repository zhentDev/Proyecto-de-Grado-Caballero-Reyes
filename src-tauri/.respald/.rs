// use sha2::{Digest, Sha256};
// use std::{
// 	fs,
// 	path::PathBuf,
// 	thread,
// 	time::{Duration, Instant},
// };
// use tauri::{Emitter, Window};

// #[tauri::command]
// pub async fn watch_file(path: String, window: Window) -> Result<(), String> {
// 	let path_buf = PathBuf::from(&path);

// 	// Verificar si el archivo existe
// 	if !path_buf.exists() {
// 		return Err("El archivo no existe.".into());
// 	}

// 	// Canonicalizar el path para evitar problemas con symlinks o rutas relativas
// 	let canonical_path = std::fs::canonicalize(&path_buf)
// 		.map_err(|e| format!("Error canonicalizando path: {}", e))?;

// 	// Emitir evento al frontend indicando que el watcher está listo
// 	window
// 		.emit(
// 			"watcher-ready",
// 			serde_json::json!({ "status": "ready", "path": path.clone() }),
// 		)
// 		.unwrap_or_else(|e| eprintln!("Error emitiendo watcher-ready: {}", e));

// 	// Lanzar hilo de monitoreo por hash con debounce
// 	let window = window.clone();
// 	thread::spawn(move || {
// 		let mut last_hash = None;
// 		let mut last_emit = Instant::now();

// 		loop {
// 			thread::sleep(Duration::from_secs(2)); // Intervalo de polling

// 			match fs::read(&canonical_path) {
// 				Ok(content) => {
// 					let hash = Sha256::digest(&content);

// 					// Detectar cambio real en contenido
// 					if Some(hash.clone()) != last_hash {
// 						last_hash = Some(hash);

// 						// Emitir solo si han pasado al menos 2 segundos desde el último evento
// 						if last_emit.elapsed() > Duration::from_secs(2) {
// 							last_emit = Instant::now();

// 							if let Err(e) = window.emit("file-change", {}) {
// 								eprintln!("Error emitiendo file-change: {}", e);
// 							} else {
// 								println!(
// 									"✅ Cambio detectado por hash en: {}",
// 									canonical_path.display()
// 								);
// 							}
// 						}
// 					}
// 				}
// 				Err(e) => {
// 					eprintln!("Error leyendo archivo: {}", e);
// 				}
// 			}
// 		}
// 	});

// 	Ok(())
// }
