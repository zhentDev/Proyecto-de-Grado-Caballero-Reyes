use tauri_plugin_fs::FsExt;

mod permissions;
mod process;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
	tauri::Builder::default()
		.plugin(tauri_plugin_dialog::init())
		.plugin(tauri_plugin_fs::init())
		.plugin(tauri_plugin_opener::init())
		.setup(|app| {
			// allowed the given directory
			let scope = app.fs_scope();
			let _ = scope.allow_directory(r"D:/tauri-app/avatar.txt", false);
			dbg!(scope.is_allowed(r"D:/tauri-app/avatar.txt"));

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
		])
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}
