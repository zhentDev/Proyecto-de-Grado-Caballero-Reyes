mod db;
mod permissions;
mod process;

use tauri::path::BaseDirectory::AppConfig;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
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
		// .setup(|_app| Ok(()))
		.setup(|_app| {
			println!("{:?}", AppConfig);
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
			process::excel::guardar_excel
		])
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}
