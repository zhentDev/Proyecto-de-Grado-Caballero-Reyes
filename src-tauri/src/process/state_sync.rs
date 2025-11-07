use crate::MonitoredProjectPath;
use notify::event::{Event, EventKind, ModifyKind};
use notify::{RecursiveMode, Watcher};
use std::path::PathBuf;
use tauri::{command, Emitter, State, Window};

#[command]
pub fn set_monitored_project(
	path: String,
	state: State<'_, MonitoredProjectPath>,
) -> Result<(), String> {
	let path_buf = PathBuf::from(&path);

	if !path_buf.exists() {
		return Err(format!("El directorio proporcionado no existe: {}", path));
	}

	*state.0.lock().unwrap() = Some(path_buf);
	println!("Ruta del proyecto monitoreado actualizada a: {}", path);
	Ok(())
}

#[command]
pub async fn listen_for_directory_changes(path: String, window: Window) -> Result<(), String> {
	let path_buf = PathBuf::from(&path);
	if !path_buf.is_dir() {
		return Err(format!(
			"La ruta proporcionada no es un directorio: {}",
			path
		));
	}

	tauri::async_runtime::spawn(async move {
		let event_handler = move |res: Result<Event, notify::Error>| {
			if let Ok(event) = res {
				match event.kind {
					EventKind::Create(_)
					| EventKind::Remove(_)
					| EventKind::Modify(ModifyKind::Name(_)) => {
						println!("Cambio en el directorio detectado: {:?}", event);
						if let Err(e) = window.emit("directory-changed", {}) {
							eprintln!("Error al emitir el evento directory-changed: {}", e);
						}
					}
					_ => {} // Ignorar otros eventos
				}
			}
		};

		let mut watcher = match notify::recommended_watcher(event_handler) {
			Ok(w) => w,
			Err(e) => {
				eprintln!("Error al crear el vigilante de directorio: {}", e);
				return;
			}
		};

		if let Err(e) = watcher.watch(&path_buf, RecursiveMode::Recursive) {
			eprintln!(
				"Error al iniciar la vigilancia del directorio '{}': {}",
				path_buf.display(),
				e
			);
			return;
		}

		println!("Vigilando cambios en el directorio: {}", path_buf.display());

		// Mantener la tarea viva indefinidamente
		let (tx, mut rx) = tauri::async_runtime::channel::<()>(1);
		let _tx = tx;
		let _ = rx.recv().await;
	});

	Ok(())
}
