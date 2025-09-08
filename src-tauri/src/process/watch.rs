use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::mpsc;
use tauri::Emitter; // Asegúrate de importar Emitter aquí

#[tauri::command]
pub async fn watch_file(path: String, window: tauri::Window) -> Result<(), String> {
	let (tx, rx) = mpsc::channel();
	let path_buf = PathBuf::from(&path);

	// Verificar si el archivo existe primero
	if !path_buf.exists() {
		return Err("El archivo no existe watch.rs".into());
	}

	// Configuración más robusta del watcher
	let mut watcher: RecommendedWatcher = Watcher::new(
		tx,
		notify::Config::default()
			.with_poll_interval(std::time::Duration::from_secs(1))
			.with_compare_contents(true), // Compara contenido, no solo metadata
	)
	.map_err(|e| format!("Error creando watcher: {}", e))?;

	watcher
		.watch(&path_buf, RecursiveMode::NonRecursive)
		.map_err(|e| format!("Error observando archivo: {}", e))?;

	// Notificar al frontend que el watcher está listo
	window
		.emit(
			"watcher-ready",
			serde_json::json!({ "status": "ready", "path": path.clone() }),
		)
		.unwrap_or_else(|e| eprintln!("Error emitiendo evento: {}", e));

	std::thread::spawn(move || {
		for res in rx {
			match res {
				Ok(event) => {
					// Filtrar solo eventos relevantes de modificación
					if let notify::EventKind::Modify(content) = event.kind {
						match content {
							notify::event::ModifyKind::Data(_) | notify::event::ModifyKind::Any => {
								if let Some(path) = event.paths.first() {
									if *path == path_buf {
										if let Err(e) = window.emit("file-change", {}) {
											// Si el error indica que el callback no se encontró,
											// lo más probable es que la ventana se haya recargado.
											if e.to_string().contains("Couldn't find callback") {
												println!("La ventana fue recargada; dejando de emitir eventos.");
												// Opcional: salir del ciclo y detener el hilo
												break;
											} else {
												eprintln!("Error emitiendo evento: {}", e);
											}
										} else {
											println!(
												"Modificación detectada en: {}",
												path.display()
											);
										}
									}
								}
							}
							_ => {}
						}
					}
				}
				Err(e) => eprintln!("Error en watcher: {:?}", e),
			}
		}
	});

	Ok(())
}
