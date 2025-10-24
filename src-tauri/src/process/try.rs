use serde_json::json;
use std::thread;
use tauri::{
	menu::{Menu, MenuItem},
	tray::TrayIconBuilder,
	WindowEvent,
};
use tauri::{Emitter, Manager};

pub fn init_tray(app: &tauri::AppHandle) -> tauri::Result<()> {
	use tauri::{
		menu::{Menu, MenuItem},
		tray::TrayIconBuilder,
	};

	let show_i = MenuItem::with_id(app, "show", "Mostrar ventana", true, None::<&str>)?;
	let quit_i = MenuItem::with_id(app, "quit", "Salir", true, None::<&str>)?;
	let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

	TrayIconBuilder::new()
		.menu(&menu)
		.on_menu_event(|app, event| match event.id.as_ref() {
			"show" => {
				let win = app.get_webview_window("main").unwrap();
				win.show().unwrap();
			}
			"quit" => app.exit(0),
			_ => {}
		})
		.build(app)?;
	Ok(())
}

pub fn init_window_event(app: &tauri::AppHandle) {
	let win = app.get_webview_window("main").unwrap();
	win.clone().on_window_event(move |event| {
		if let tauri::WindowEvent::CloseRequested { api, .. } = event {
			win.hide().unwrap();
			api.prevent_close();
		}
	});
}

pub fn spawn_background_thread(app: tauri::AppHandle) {
	std::thread::spawn(move || loop {
		let payload = serde_json::json!({ "msg": "Notificación de fondo" });
		app.emit("evento_background", payload).unwrap();
		std::thread::sleep(std::time::Duration::from_secs(10));
	});
}
