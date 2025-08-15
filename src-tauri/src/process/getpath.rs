// src/process/getpath.rs
use std::{fs, path::Path};
use tauri::command;

#[derive(serde::Serialize)]
pub struct FolderItem {
	pub name: String,
	pub path: String,
	pub is_file: bool,
	pub is_directory: bool,
}

#[command]
pub async fn open_folder_dialog() -> Result<String, String> {
	rfd::AsyncFileDialog::new()
		.pick_folder()
		.await
		.map(|f| f.path().to_string_lossy().into_owned())
		.ok_or_else(|| "No se seleccionó ninguna carpeta".to_string())
}

#[command]
pub fn get_folder_contents(path: String) -> Result<Vec<FolderItem>, String> {
	let dir = Path::new(&path);
	if !dir.is_dir() {
		return Err("La ruta no es un directorio válido".into());
	}

	fs::read_dir(dir)
		.map_err(|e| e.to_string())?
		.map(|entry| {
			let entry = entry.map_err(|e| e.to_string())?;
			let path: std::path::PathBuf = entry.path();
			Ok(FolderItem {
				name: entry.file_name().to_string_lossy().into_owned(),
				path: path.to_string_lossy().into_owned(),
				is_file: path.is_file(),
				is_directory: path.is_dir(),
			})
		})
		.collect()
}
