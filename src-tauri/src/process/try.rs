use crate::MonitoredProjectPath;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::WindowEvent;
use tauri::{Emitter, Manager, State};
use tokio::time::{sleep, Duration};
use walkdir::WalkDir;

pub fn init_tray(app: &tauri::AppHandle) -> tauri::Result<()> {
	// Initial menu state
	let initial_menu = {
		let show =
			tauri::menu::MenuItem::with_id(app, "show", "Ocultar ventana", true, None::<&str>)?;
		let open_logs = MenuItem::with_id(app, "open_logs", "Abrir carpeta de logs", true, None::<&str>)?;
		let quit = MenuItem::with_id(app, "quit", "Salir", true, None::<&str>)?;
		Menu::with_items(app, &[&show, &open_logs, &quit])?
	};

	    TrayIconBuilder::with_id("main-tray")		.on_tray_icon_event(|tray, event| match event {
			TrayIconEvent::Click {
				button: MouseButton::Left,
				button_state: MouseButtonState::Up,
				..
			} => {
				println!("left click pressed and released");
				// in this example, let's show and focus the main window when the tray is clicked
				let app = tray.app_handle();
				if let Some(window) = app.get_webview_window("main") {
					let _ = window.unminimize();
					let _ = window.show();
					let _ = window.set_focus();
				}
			}
			_ => {}
		})
		.menu(&initial_menu)
		.icon(app.default_window_icon().unwrap().clone())
		.on_menu_event(move |app, event| {
			let window = app.get_webview_window("main").unwrap();
			match event.id().as_ref() {
				"show" => {
					let new_menu = if window.is_visible().unwrap_or(false) {
						window.hide().unwrap();
						// Create a menu for when the window is hidden
						let show_item =
							MenuItem::with_id(app, "show", "Mostrar ventana", true, None::<&str>)
								.unwrap();
                        let open_logs_item = MenuItem::with_id(app, "open_logs", "Abrir carpeta de logs", true, None::<&str>).unwrap();
						let quit_item =
							MenuItem::with_id(app, "quit", "Salir", true, None::<&str>).unwrap();
						Menu::with_items(app, &[&show_item, &open_logs_item, &quit_item]).unwrap()
					} else {
						window.show().unwrap();
						window.set_focus().unwrap();
						// Create a menu for when the window is visible
						let show_item =
							MenuItem::with_id(app, "show", "Ocultar ventana", true, None::<&str>)
								.unwrap();
                        let open_logs_item = MenuItem::with_id(app, "open_logs", "Abrir carpeta de logs", true, None::<&str>).unwrap();
						let quit_item =
							MenuItem::with_id(app, "quit", "Salir", true, None::<&str>).unwrap();
						Menu::with_items(app, &[&show_item, &open_logs_item, &quit_item]).unwrap()
					};
					// Set the new menu on the tray
					app.tray_by_id("main-tray")
						.unwrap()
						.set_menu(Some(new_menu))
						.unwrap();
				}
                "open_logs" => {
                    let state: State<MonitoredProjectPath> = app.state();
                    let monitored_path = state.0.lock().unwrap();

                    if let Some(root) = &*monitored_path {
                        println!("Buscando carpeta de logs en el proyecto monitoreado: {:?}", root);
                        let mut log_path_found = None;
                        let excluded_dirs = [".git", "node_modules", "target"];
                        let walker = WalkDir::new(root).into_iter();
                        for entry in walker.filter_entry(|e| {
                            !excluded_dirs.contains(&e.file_name().to_string_lossy().as_ref())
                        }) {
                            let entry = match entry {
                                Ok(e) => e,
                                Err(_) => continue, // Skip entries we can't read
                            };

                            if entry.file_type().is_dir() {
                                let file_name = entry.file_name().to_string_lossy().to_lowercase();
                                if file_name == "log" || file_name == "logs" {
                                    log_path_found = Some(entry.path().to_path_buf());
                                    break; // Found the first one, stop searching
                                }
                            }
                        }

                        if let Some(log_path) = log_path_found {
                            println!("Carpeta de logs encontrada en: {:?}", log_path);
                            if let Err(e) = opener::open(&log_path) {
                                eprintln!("Error al abrir la carpeta de logs '{}': {}", log_path.display(), e);
                            }
                        } else {
                            eprintln!("Carpeta de logs no encontrada en el proyecto.");
                            let _ = app.emit("error_notification", "No se encontró la carpeta de logs en el proyecto actual.");
                        }
                    } else {
                        eprintln!("No se ha abierto ningún proyecto para monitorear.");
                        let _ = app.emit("error_notification", "Por favor, abre una carpeta de proyecto primero.");
                    }
                }
				"quit" => {
					println!("quit menu item was clicked");
					app.exit(0);
				}
				_ => {
					println!("menu item {:?} not handled", event.id);
				}
			}
		})
		.show_menu_on_left_click(true)
		.build(app)?;
	Ok(())
}

pub fn init_window_event(app: &tauri::AppHandle) {
	let app_handle = app.clone();
	app.get_webview_window("main")
		.unwrap()
		.on_window_event(move |event| {
			if let WindowEvent::CloseRequested { api, .. } = event {
				api.prevent_close();
				let window = app_handle.get_webview_window("main").unwrap();
				window.hide().unwrap();

				// Rebuild the menu to update the text
				let show_item =
					MenuItem::with_id(&app_handle, "show", "Mostrar ventana", true, None::<&str>)
						.unwrap();
                let open_logs_item = MenuItem::with_id(&app_handle, "open_logs", "Abrir carpeta de logs", true, None::<&str>).unwrap();
				let quit_item =
					MenuItem::with_id(&app_handle, "quit", "Salir", true, None::<&str>).unwrap();
				let menu = Menu::with_items(&app_handle, &[&show_item, &open_logs_item, &quit_item]).unwrap();

				app_handle
					.tray_by_id("main-tray")
					.unwrap()
					.set_menu(Some(menu))
					.unwrap();
			}
		});
}

pub async fn spawn_background_thread(app: tauri::AppHandle) {
	loop {
		let payload = serde_json::json!({ "msg": "Notificación de fondo" });
		if let Err(e) = app.emit("evento_background", payload) {
			eprintln!("Failed to emit background event: {}", e);
		}
		sleep(Duration::from_secs(10)).await;
	}
}
