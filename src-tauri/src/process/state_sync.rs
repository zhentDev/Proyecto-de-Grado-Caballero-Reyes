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

