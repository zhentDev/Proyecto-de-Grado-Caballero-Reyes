use notify::{RecursiveMode, Watcher};
use std::path::PathBuf;
use tauri::{Emitter, Window};

#[tauri::command]
pub async fn watch_file(path: String, window: Window) -> Result<(), String> {
    // 1. Limpiar prefijo \\?\ si está presente
    let clean_path = if path.starts_with("\\\\?\\") {
        path.trim_start_matches("\\\\?\\").to_string()
    } else {
        path.clone()
    };

    let path_buf = PathBuf::from(&clean_path);

    if !path_buf.exists() {
        return Err(format!("El archivo no existe: {}", clean_path));
    }

    let window_clone = window.clone();

    // 2. Lanzar una tarea en segundo plano para la monitorización
    tauri::async_runtime::spawn(async move {
        let event_handler = move |res: Result<notify::Event, notify::Error>| {
            if let Ok(event) = res {
                match event.kind {
                    notify::EventKind::Create(_) => {
                        println!("✅ Archivo creado: {:?}", event.paths);
                        if let Err(e) = window_clone.emit("directory-changed", {}) {
                            eprintln!("Error emitiendo directory-changed por creación: {}", e);
                        }
                    }
                    notify::EventKind::Modify(_) => {
                        println!("✅ Cambio detectado: {:?}", event.paths);
                        if let Err(e) = window_clone.emit("directory-changed", {}) {
                            eprintln!("Error emitiendo directory-changed por modificación: {}", e);
                        }
                    }
                    notify::EventKind::Remove(_) => {
                        println!("✅ Archivo eliminado: {:?}", event.paths);
                        if let Err(e) = window_clone.emit("directory-changed", {}) {
                            eprintln!("Error emitiendo directory-changed por eliminación: {}", e);
                        }
                    }
                    _ => {} // Ignorar otros tipos de eventos
                }
            }
        };

        let mut watcher = match notify::recommended_watcher(event_handler) {
            Ok(w) => w,
            Err(e) => {
                eprintln!("Error al crear el file watcher: {}", e);
                return;
            }
        };

        if let Err(e) = watcher.watch(&path_buf, RecursiveMode::Recursive) {
            eprintln!("Error al iniciar la monitorización de '{}': {}", path_buf.display(), e);
            return;
        }

        // Emitir evento de que el watcher está listo
        if let Err(e) = window.emit(
            "watcher-ready",
            serde_json::json!({ "status": "ready", "path": clean_path }),
        ) {
            eprintln!("Error emitiendo watcher-ready: {}", e);
        }

        println!("✅ Monitorizando cambios en: {}", path_buf.display());

        // La tarea debe mantenerse viva para que el watcher siga funcionando.
        // Usamos un canal que nunca recibe mensajes para suspender la tarea indefinidamente.
        let (tx, mut rx) = tauri::async_runtime::channel::<()>(1);
        let _tx = tx; // Mantenemos el emisor vivo
        let _ = rx.recv().await; // Esperamos para siempre
    });

    Ok(())
}