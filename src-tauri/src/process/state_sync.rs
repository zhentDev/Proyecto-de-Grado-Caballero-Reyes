use crate::{process::watch, MonitoredProjectPath, WatcherStopper};
use std::path::PathBuf;
use tauri::{command, AppHandle, Manager, State};
use tokio::sync::mpsc;

#[command]
pub fn set_monitored_project(
	path: String,
	project_path_state: State<'_, MonitoredProjectPath>,
	watcher_stopper: State<'_, WatcherStopper>,
	app_handle: AppHandle,
) -> Result<(), String> {
	let path_buf = PathBuf::from(&path);

	if !path_buf.exists() {
		return Err(format!("El directorio proporcionado no existe: {}", path));
	}

	// Update the project path state
	*project_path_state.0.lock().unwrap() = Some(path_buf);
	println!("Ruta del proyecto monitoreado actualizada a: {}", path);

	// Stop any existing watcher first
	watch::stop_watcher(&app_handle);

	// Start the new watcher
	let (tx, rx) = mpsc::channel(1);
	*watcher_stopper.0.lock().unwrap() = Some(tx);

	let app_handle_for_watcher = app_handle.clone();
	tauri::async_runtime::spawn(async move {
		let monitored_project_path_state = app_handle_for_watcher.state::<MonitoredProjectPath>();
		if let Err(e) = watch::start_watcher(
			app_handle_for_watcher.clone(),
			monitored_project_path_state,
			rx,
		)
		.await
		{
			eprintln!("Error starting watcher: {}", e);
		}
	});

	Ok(())
}
