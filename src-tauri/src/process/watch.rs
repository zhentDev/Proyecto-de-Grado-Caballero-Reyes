use sha2::{Digest, Sha256};
use std::{fs, path::PathBuf, thread, time::Duration};
use tauri::{Emitter, Window};
 
#[tauri::command]

pub async fn watch_file(path: String, window: Window) -> Result<(), String> {

    // ✅ 1. Limpiar prefijo \\?\ si está presente
    let clean_path = if path.starts_with("\\\\?\\") {
        path.trim_start_matches("\\\\?\\").to_string()
    } else {
        path.clone()
    };
 
    let path_buf = PathBuf::from(&clean_path);
 
    if !path_buf.exists() {

        return Err(format!("El archivo no existe: {}", clean_path));

    }
 
    // ✅ 2. Intentar canonicalizar pero si falla, continuar con la ruta limpia

    let canonical_path = match std::fs::canonicalize(&path_buf) {
        Ok(p) => p,
        Err(_) => path_buf.clone(), // ← usa ruta directa si canonicalize falla
    };
 
    // ✅ 3. Emitir evento inicial de que el watcher está listo

    window

        .emit(

            "watcher-ready",

            serde_json::json!({ "status": "ready", "path": clean_path }),

        )

        .unwrap_or_else(|e| eprintln!("Error emitiendo watcher-ready: {}", e));
 
    // ✅ 4. Iniciar hilo que vigila los cambios por hash

    let window = window.clone();

    thread::spawn(move || {

        let mut last_hash = None;
 
        loop {

            thread::sleep(Duration::from_secs(2));
 
            match fs::read(&canonical_path) {

                Ok(content) => {

                    let hash = Sha256::digest(&content);
 
                    if Some(hash.clone()) != last_hash {

                        last_hash = Some(hash);

                        let _ = window.emit("file-change", {});

                        println!(

                            "✅ Cambio detectado por hash en: {}",

                            canonical_path.display()

                        );

                    }

                }

                Err(e) => {

                    eprintln!("⚠️ Error leyendo archivo (puede estar bloqueado o no existir): {}", e);

                }

            }

        }

    });
 
    Ok(())

}

 