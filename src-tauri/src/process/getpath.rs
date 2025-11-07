use crate::MonitoredProjectPath;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{command, State};

#[command]
pub async fn open_folder_dialog(state: State<'_, MonitoredProjectPath>) -> Result<String, String> {
	let folder = rfd::AsyncFileDialog::new().pick_folder().await;

	if let Some(folder_handle) = folder {
		let path_str = folder_handle.path().to_string_lossy().into_owned();
		let path_buf = PathBuf::from(&path_str);

		// Guarda la ruta en el estado manejado
		*state.0.lock().unwrap() = Some(path_buf);
		println!("Ruta del proyecto monitoreado guardada: {}", path_str);

		Ok(path_str)
	} else {
		Err("No se seleccionó ninguna carpeta".to_string())
	}
}

#[derive(serde::Serialize, Debug, Clone)]
pub struct Item {
    pub name: String,
    pub path: String,
    pub is_file: bool,
    pub is_directory: bool,
    pub children: Vec<Item>,
}

#[command]
pub fn get_folder_contents(path: String) -> Result<Vec<Item>, String> {
    let dir = Path::new(&path);
    if !dir.is_dir() {
        return Err("La ruta no es un directorio válido".into());
    }
    read_directory_recursively(dir)
}

fn read_directory_recursively(path: &Path) -> Result<Vec<Item>, String> {
    fs::read_dir(path)
        .map_err(|e| e.to_string())?
        .map(|entry| {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().into_owned();

            if path.is_dir() {
                let children = read_directory_recursively(&path)?;
                Ok(Item {
                    name,
                    path: path.to_string_lossy().into_owned(),
                    is_file: false,
                    is_directory: true,
                    children,
                })
            } else {
                Ok(Item {
                    name,
                    path: path.to_string_lossy().into_owned(),
                    is_file: true,
                    is_directory: false,
                    children: vec![],
                })
            }
        })
        .collect()
}
