use notify::{RecursiveMode, Watcher};
use rumqttc::{Client, MqttOptions, QoS};
use std::fs::File;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::sync::mpsc;

use crate::MonitoredProjectPath;

use encoding_rs::WINDOWS_1252;
use std::io::{BufReader, Read, Seek, SeekFrom};
use std::path::Path;

// State to hold the sender for stopping the watcher
pub struct WatcherStopper(pub Mutex<Option<mpsc::Sender<()>>>);

impl Default for WatcherStopper {
	fn default() -> Self {
		WatcherStopper(Mutex::new(None))
	}
}

fn get_last_line(path: &Path) -> Option<String> {
	let file = File::open(path).ok()?;
	let mut reader = BufReader::new(file);
	let file_len = reader.seek(SeekFrom::End(0)).ok()?;

	if file_len == 0 {
		return None; // Empty file
	}

	let mut buffer = Vec::new();
	let _bytes_read = 0;
	let mut last_line_start = 0;

	// Read chunks from the end of the file
	let mut pos = file_len;
	while pos > 0 {
		let read_size = std::cmp::min(pos, 512); // Read in 512-byte chunks
		pos -= read_size;
		reader.seek(SeekFrom::Start(pos)).ok()?;
		buffer.resize(read_size as usize, 0);
		reader.read_exact(&mut buffer).ok()?;

		// Search for newline in the buffer, from right to left
		for i in (0..read_size as usize).rev() {
			if buffer[i] == b'\n' {
				last_line_start = i + 1;
				// If we found a newline, and it's not the very end of the file (meaning there's content after it)
				// then the line starts after this newline.
				// If it's the very last byte, it means the file ends with a newline, so we need to look further back.
				if (pos + last_line_start as u64) < file_len {
					// Found the start of the last line
					let line_bytes = &buffer[last_line_start..];
					return Some(WINDOWS_1252.decode(line_bytes).0.into_owned());
				}
			}
		}
		// If no newline found in this chunk, continue to the previous chunk
	}

	// If we reached the beginning of the file and found no newlines, the whole file is one line

	if file_len > 0 {
		reader.seek(SeekFrom::Start(0)).ok()?; // Reset cursor to beginning

		let mut all_bytes = Vec::new();

		reader.read_to_end(&mut all_bytes).ok()?;

		return Some(WINDOWS_1252.decode(&all_bytes).0.into_owned());
	}

	None
}

pub async fn start_watcher(
	app_handle: AppHandle,
	monitored_project_path: State<'_, MonitoredProjectPath>,
	mut rx: mpsc::Receiver<()>,
) -> Result<(), String> {
	println!("File Watcher: Initializing...");

	// MQTT Client Setup
	println!("MQTT: Setting up client options...");
	let mut mqtt_options = MqttOptions::new("tauri_emitter", "localhost", 1883);
	mqtt_options.set_keep_alive(Duration::from_secs(5));
	let (client, mut connection) = Client::new(mqtt_options, 10);
	println!("MQTT: Client created.");

	// Channel to send MQTT events from the blocking thread to the async task
	let (event_tx, mut event_rx) = mpsc::channel(100);

	// Spawn a blocking task to handle the MQTT connection's blocking recv()
	tauri::async_runtime::spawn_blocking(move || {
		println!("MQTT Connection Handler (Blocking Thread): Started.");
		for notification in connection.iter() {
			// connection.iter() yields blocking events
			if let Err(e) = event_tx.blocking_send(notification) {
				eprintln!("MQTT Connection Handler (Blocking Thread): Failed to send event to async task: {}", e);
				break;
			}
		}
		println!("MQTT Connection Handler (Blocking Thread): Stopped.");
	});

	// Async task to process MQTT events received from the blocking thread
	tauri::async_runtime::spawn(async move {
		println!("MQTT Event Processor (Async Task): Started.");
		while let Some(notification) = event_rx.recv().await {
			match notification {
				Ok(rumqttc::Event::Incoming(rumqttc::Packet::ConnAck(_))) => {
					println!("MQTT Event Processor: Connected to broker!");
					// Here you could signal that connection is established if needed
				}
				Ok(event) => {
					match event {
						rumqttc::Event::Incoming(rumqttc::Packet::ConnAck(_)) => {
							println!("MQTT Event Processor: Connected to broker!");
							// Here you could signal that connection is established if needed
						}
						rumqttc::Event::Incoming(rumqttc::Packet::PingResp) => {
							// Ignore PingResp
						}
						rumqttc::Event::Outgoing(rumqttc::Outgoing::PingReq) => {
							// Ignore PingReq
						}
						_ => {
							// Catch all other events
							println!("MQTT Event Processor: Received event: {:?}", event);
						}
					}
				}
				Err(e) => {
					eprintln!("MQTT Event Processor: Connection error: {:?}", e);
					// Handle connection errors, e.g., try to reconnect
				}
			}
		}
		println!("MQTT Event Processor (Async Task): Stopped.");
	});

	// No explicit waiting for connection here, rely on the event stream
	println!("MQTT: Connection handling spawned. Proceeding with watcher setup.");

	let root_path = {
		let path_guard = monitored_project_path.0.lock().unwrap();
		path_guard.clone()
	};

	let root = match root_path {
		Some(p) => p,
		None => {
			eprintln!("File Watcher: No project path set.");
			return Err("No project path set for watcher".to_string());
		}
	};

	if !root.exists() {
		return Err(format!(
			"El directorio del proyecto no existe: {}",
			root.display()
		));
	}

	let app_handle_clone = app_handle.clone();
	let client_clone = client.clone(); // Clone the client for the event handler
	let root_clone = root.clone(); // Clone root for the event handler
	let _topic = "file/events".to_string(); // Define the MQTT topic

	tauri::async_runtime::spawn(async move {
		let event_handler = move |res: Result<notify::Event, notify::Error>| {
			let app_handle_clone_inner = app_handle_clone.clone();
			let root_clone_inner = root_clone.clone(); // Clone for each event

			if let Ok(event) = res {
				match event.kind {
					notify::EventKind::Create(_)
					| notify::EventKind::Modify(_)
					| notify::EventKind::Remove(_) => {
						println!("✅ Cambio detectado: {:?}", event.paths);
						if let Err(e) = app_handle_clone_inner.emit("directory-changed", ()) {
							eprintln!("Error emitiendo directory-changed: {}", e);
						}

						for path in event.paths {
							if let Some(extension) = path.extension() {
								if extension == "log" || extension == "txt" {
									let event_type = match event.kind {
										notify::EventKind::Create(_) => "created",
										notify::EventKind::Modify(_) => "modified",
										notify::EventKind::Remove(_) => "removed",
										_ => "unknown", // Should not happen with the current match
									};

									let relative_path = path
										.strip_prefix(&root_clone_inner)
										.unwrap_or(&path)
										.to_string_lossy()
										.replace("\\", "/"); // Normalize path separators

									let file_content = if event_type != "removed" {
										get_last_line(&path).unwrap_or_default()
									} else {
										"".to_string()
									};

									let payload = serde_json::json!({
										"event_type": event_type,
										"path": format!("{}/{}", root_clone_inner.file_name().unwrap().to_string_lossy(), relative_path),
										"content": file_content,
									})
									.to_string();

									// Publish the message
									// Clone the client, topic and payload per-iteration so each spawned task owns its data
									let mut client_for_publish = client_clone.clone();
									let topic = format!(
										"project/{}/logs/{}",
										root_clone_inner.file_name().unwrap().to_string_lossy(),
										relative_path
									);
									let _topic_clone = topic.clone();
									let payload_clone = payload.clone();

									let topic_clone = topic.clone();

									tauri::async_runtime::spawn(async move {
										let publish_result = client_for_publish.publish(
											topic_clone.clone(),
											QoS::AtLeastOnce,
											false,
											payload_clone.as_bytes(),
										); // Await the publish call

										if let Err(e) = publish_result {
											eprintln!("Error publicando mensaje MQTT: {}", e);
										} else {
											println!(
												"✅ Publicado MQTT: {} -> {}",
												topic_clone, payload_clone
											);
										}
									});
								}
							}
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

		if let Err(e) = watcher.watch(&root, RecursiveMode::Recursive) {
			eprintln!(
				"Error al iniciar la monitorización de '{}': {}",
				root.display(),
				e
			);
			return;
		}

		println!("✅ Monitorizando cambios en: {}", root.display());

		// Keep the task alive until a stop signal is received
		let _ = rx.recv().await;
		println!("File Watcher: Stop signal received. Shutting down.");
	});

	Ok(())
}

pub fn stop_watcher(app_handle: &AppHandle) {
	let stopper_state = app_handle.state::<WatcherStopper>();
	let mut stopper = stopper_state.0.lock().unwrap();
	if let Some(tx) = stopper.take() {
		let _ = tx.send(());
	}
	println!("File Watcher: Stopping...");
}
