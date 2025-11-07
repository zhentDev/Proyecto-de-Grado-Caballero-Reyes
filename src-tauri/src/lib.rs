mod db;
mod permissions;
mod process;

use once_cell::sync::Lazy;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Instant;
use tauri::{path::BaseDirectory::AppConfig, Manager};
use tauri_plugin_os;

// Estado para guardar la ruta del proyecto monitoreado
pub struct MonitoredProjectPath(pub Mutex<Option<PathBuf>>);

pub static START_TIME: Lazy<Instant> = Lazy::new(Instant::now);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
	let _ = *START_TIME;
	tauri::Builder::default()
        .manage(MonitoredProjectPath(Mutex::new(None))) // Añadir el estado manejado
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
				process::r#try::init_tray(&app.app_handle())?;
			}

			process::r#try::init_window_event(&app.app_handle());

			// Spawn the async background task
			let app_handle = app.app_handle().clone();
			tauri::async_runtime::spawn(async move {
				process::r#try::spawn_background_thread(app_handle).await;
			});

			Ok(())
		})
		.invoke_handler(tauri::generate_handler![
			permissions::write::set_write_permission,
			permissions::read::set_read_permission,
			permissions::remove::set_remove_permission,
			process::logs::process_log_file,
			process::watch::watch_file,
			process::getpath::open_folder_dialog,
			process::getpath::get_folder_contents,
			process::excel::leer_excel,
			process::excel::guardar_excel,
			            process::system_info::get_system_parameters,
						process::system_info::get_system_info_formatted,
						            process::state_sync::set_monitored_project,
									process::state_sync::listen_for_directory_changes		])
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}
