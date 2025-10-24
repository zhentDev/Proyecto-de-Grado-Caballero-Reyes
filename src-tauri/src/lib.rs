mod db;
mod permissions;
mod process;

use once_cell::sync::Lazy;
use std::time::Instant;
use tauri::{path::BaseDirectory::AppConfig, Manager};
use tauri_plugin_os;

pub static START_TIME: Lazy<Instant> = Lazy::new(Instant::now);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
	let _ = *START_TIME;
	tauri::Builder::default()
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

			process::r#try::init_tray(&app.app_handle())?;
			process::r#try::init_window_event(&app.app_handle());
			process::r#try::spawn_background_thread(app.app_handle().clone());
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
			process::system_info::get_system_info_formatted
		])
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}
