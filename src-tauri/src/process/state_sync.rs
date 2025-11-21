use crate::ActiveProjectPath;
use std::path::PathBuf;
use tauri::{command, State};

#[command]
pub fn set_monitored_project(
	path: String,
	active_path_state: State<'_, ActiveProjectPath>,
) -> Result<(), String> {
	let path_buf = PathBuf::from(&path);

	if !path_buf.exists() || !path_buf.is_dir() {
		return Err(format!("El directorio proporcionado no existe o no es válido: {}", path));
	}

	// Set the active path for the emitter/UI
	let mut active_path = active_path_state.0.lock().unwrap();
	*active_path = Some(path_buf.clone());
	println!("Ruta activa para el emisor actualizada a: {}", path);

    // The frontend is responsible for ensuring this project is in the DB.
    // This command just sets the active state for the backend.
	Ok(())
}