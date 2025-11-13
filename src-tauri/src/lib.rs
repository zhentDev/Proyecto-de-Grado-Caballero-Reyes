mod db;
mod permissions;
mod process;

use once_cell::sync::Lazy;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Instant;
use tauri::{path::BaseDirectory::AppConfig, Manager}; // Removed State
use tokio::sync::mpsc;

use crate::process::background::MqttReceiverStopper;
use crate::process::mode::{AppMode, AppModeState};
use crate::process::watch::WatcherStopper; // Import MqttReceiverStopper

use tauri::{menu::MenuItemBuilder, Emitter, Listener};

// Estado para guardar la ruta del proyecto monitoreado
pub struct MonitoredProjectPath(pub Mutex<Option<PathBuf>>);

pub static START_TIME: Lazy<Instant> = Lazy::new(Instant::now);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
	let _ = *START_TIME;
	tauri::Builder::default()
		.manage(MonitoredProjectPath(Mutex::new(None))) // Añadir el estado manejado
		.manage(AppModeState(Mutex::new(AppMode::None))) // Add this line
		.manage(WatcherStopper::default()) // Manage WatcherStopper
		.manage(MqttReceiverStopper::default()) // Manage MqttReceiverStopper
		.plugin(
			tauri_plugin_sql::Builder::default()
				.add_migrations(
					"sqlite://src-tauri/src/db/database.sqlite",
					db::db::apply_migration(),
				)
				.build(),
		)
		.plugin(tauri_plugin_dialog::init())
		.plugin(tauri_plugin_fs::init())
		.plugin(tauri_plugin_opener::init())
		.plugin(tauri_plugin_os::init())
		.setup(|app| {
			println!("{:?}", AppConfig);

			// Prevent tray icon duplication on hot-reloads
			if app.tray_by_id("main-tray").is_none() {
				let app_mode_state = app.state::<AppModeState>();
				process::r#try::init_tray(app.app_handle(), app_mode_state.clone())?;
			}

			process::r#try::init_window_event(app.app_handle());

			// Spawn the async background task
			let app_handle = app.app_handle().clone();
			let app_handle_for_bg = app_handle.clone();
			tauri::async_runtime::spawn(async move {
				process::r#try::spawn_background_thread(app_handle_for_bg).await;
			});

			app.listen("app_mode_changed", move |_event| {
				println!(
					"Received app_mode_changed event with payload: {:?}",
					_event.payload()
				);

				// Parse the payload to get the new AppMode
				let new_mode: AppMode =
					serde_json::from_str(_event.payload()).unwrap_or_else(|e| {
						eprintln!("Error parsing AppMode from event payload: {}", e);
						AppMode::None // Default to None on error
					});

				let app_mode_state = app_handle.state::<AppModeState>();
				// Update the AppModeState with the new mode
				*app_mode_state.0.lock().unwrap() = new_mode;

				// let monitored_project_path = app_handle.state::<MonitoredProjectPath>();
				let current_mode = new_mode; // Use the new_mode from the event payload

				println!("App mode changed to: {:?}", current_mode);

				// Stop any running services first
				process::watch::stop_watcher(&app_handle);
				process::background::stop_receiver(&app_handle); // Stop MQTT receiver

				match current_mode {
					AppMode::Emitter => {
						let (tx, rx) = mpsc::channel(1);
						let watcher_stopper_state = app_handle.state::<WatcherStopper>();
						*watcher_stopper_state.0.lock().unwrap() = Some(tx);

						let app_handle_for_watcher = app_handle.clone();
						tauri::async_runtime::spawn(async move {
							let monitored_project_path =
								app_handle_for_watcher.state::<MonitoredProjectPath>();
							let app_handle_for_watcher_clone = app_handle_for_watcher.clone();
							if let Err(e) = process::watch::start_watcher(
								app_handle_for_watcher_clone,
								monitored_project_path,
								rx,
							)
							.await
							{
								eprintln!("Error starting watcher: {}", e);
							}
						});
					}
					AppMode::Receiver => {
						let (tx, rx) = mpsc::channel(1);
						let receiver_stopper_state = app_handle.state::<MqttReceiverStopper>();
						*receiver_stopper_state.0.lock().unwrap() = Some(tx); // Store tx for MQTT receiver stopper

						let app_handle_for_receiver = app_handle.clone();
						tauri::async_runtime::spawn(async move {
							process::background::init(app_handle_for_receiver, rx).await;
						});
					}
					AppMode::None => {
						// No specific action needed, services are already stopped
					}
				}
			});

			MenuItemBuilder::new("Toggle")
				.accelerator("Ctrl+Shift+T")
				.build(app)?;

			Ok(())
		})
		.invoke_handler(tauri::generate_handler![
			permissions::write::set_write_permission,
			permissions::read::set_read_permission,
			permissions::remove::set_remove_permission,
			process::logs::process_log_file,
			process::watch_file::watch_file,
			process::getpath::open_folder_dialog,
			process::getpath::get_folder_contents,
			process::excel::leer_excel,
			process::excel::guardar_excel,
			process::system_info::get_system_parameters,
			process::system_info::get_system_info_formatted,
			process::state_sync::set_monitored_project
		])
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}
