use crate::{MonitoredProjectPath, WatcherStopper};
use std::path::PathBuf;
use tauri::{command, AppHandle, State};

#[command]
pub fn set_monitored_project(
	path: String,
	project_path_state: State<'_, MonitoredProjectPath>,
	_watcher_stopper: State<'_, WatcherStopper>,
	_app_handle: AppHandle,
) -> Result<(), String> {
	let path_buf = PathBuf::from(&path);

	if !path_buf.exists() {
		return Err(format!("El directorio proporcionado no existe: {}", path));
	}

	// Update the project path state
	*project_path_state.0.lock().unwrap() = Some(path_buf);
	println!("Ruta del proyecto monitoreado actualizada a: {}", path);

	// The watcher will be started/stopped by the app_mode_changed listener
	// when the frontend emits the app_mode_changed event after setting the path.
	// This prevents redundant restarts of the watcher.
	Ok(())
}
