use tauri::{Emitter, Manager};

use std::thread;
use tauri::menu::{Menu, MenuItem, MenuItemBuilder};
use tauri::tray::TrayIconBuilder;
use tauri::Event;

pub fn init_tray(app: &tauri::AppHandle) -> tauri::Result<()> {
	// Initial menu state
	let initial_menu = {
		let show =
			tauri::menu::MenuItem::with_id(app, "show", "Ocultar ventana", true, None::<&str>)?;
		let quit = MenuItem::with_id(app, "quit", "Salir", true, None::<&str>)?;
		Menu::with_items(app, &[&show, &quit])?
	};

	TrayIconBuilder::new()
		.menu(&initial_menu)
		.on_menu_event(move |app, event| {
			let window = app.get_webview_window("main").unwrap();
			// println!("Window {:?}", window);
			match event.id().as_ref() {
				"show" => {
					let new_menu = if window.is_visible().unwrap_or(false) {
						window.hide().unwrap();
						// Create a menu for when the window is hidden
						let show_item =
							MenuItem::with_id(app, "show", "Mostrar ventana", true, None::<&str>)
								.unwrap();
						let quit_item =
							MenuItem::with_id(app, "quit", "Salir", true, None::<&str>).unwrap();
						Menu::with_items(app, &[&show_item, &quit_item]).unwrap()
					} else {
						window.show().unwrap();
						window.set_focus().unwrap();
						// Create a menu for when the window is visible
						let show_item =
							MenuItem::with_id(app, "show", "Ocultar ventana", true, None::<&str>)
								.unwrap();
						let quit_item =
							MenuItem::with_id(app, "quit", "Salir", true, None::<&str>).unwrap();
						Menu::with_items(app, &[&show_item, &quit_item]).unwrap()
					};
					// Set the new menu on the tray
					app.tray_by_id("main-tray")
						.unwrap()
						.set_menu(Some(new_menu))
						.unwrap();
				}
				"quit" => {
					app.exit(0);
				}
				_ => {}
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
			if let tauri::WindowEvent::CloseRequested { api, .. } = event {
				api.prevent_close();
				let window = app_handle.get_webview_window("main").unwrap();
				window.hide().unwrap();

				// Rebuild the menu to update the text
				let show_item =
					MenuItem::with_id(&app_handle, "show", "Mostrar ventana", true, None::<&str>)
						.unwrap();
				let quit_item =
					MenuItem::with_id(&app_handle, "quit", "Salir", true, None::<&str>).unwrap();
				let menu = Menu::with_items(&app_handle, &[&show_item, &quit_item]).unwrap();

				app_handle
					.tray_by_id("main-tray")
					.unwrap()
					.set_menu(Some(menu))
					.unwrap();
			}
		});
}

pub fn spawn_background_thread(app: tauri::AppHandle) {
	thread::spawn(move || loop {
		let payload = serde_json::json!({ "msg": "Notificación de fondo" });
		app.emit("evento_background", payload).unwrap();
		thread::sleep(std::time::Duration::from_secs(10));
	});
}
