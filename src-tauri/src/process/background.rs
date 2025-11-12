use crate::process::background::fs::OpenOptions;
use rand::Rng;
use rumqttc::{Client, Event, MqttOptions, Packet, QoS, Transport};
use rustls;
use rustls_native_certs;
use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Emitter;
use tauri::{AppHandle, Manager};
use tokio::sync::mpsc;
use tokio::time::Duration;

// State to hold the sender for stopping the MQTT receiver
pub struct MqttReceiverStopper(pub Mutex<Option<mpsc::Sender<()>>>);

impl Default for MqttReceiverStopper {
	fn default() -> Self {
		MqttReceiverStopper(Mutex::new(None))
	}
}

pub async fn init(app_handle: AppHandle, mut rx: mpsc::Receiver<()>) {
	println!("MQTT Receiver: Initializing...");

	let app_handle_clone = app_handle.clone();

	loop {
		println!("MQTT Receiver: Attempting to connect to broker...");

		// --- TLS and Authentication Setup (using system certificates) ---
		let broker_url = "3206f9b95f01467885968e05da78c36c.s1.eu.hivemq.cloud";
		let broker_port = 8883;
		// IMPORTANT: Replace with your actual username and password
		let mqtt_user = "zhent";
		let mqtt_password = "Zhent1234";

		// Generate a random client ID suffix to prevent collisions
		let random_suffix: String = rand::thread_rng()
			.sample_iter(&rand::distributions::Alphanumeric)
			.take(6)
			.map(char::from)
			.collect();
		let client_id = format!("tauri_receiver_{}", random_suffix);

		let mut mqtt_options = MqttOptions::new(client_id, broker_url, broker_port);
		mqtt_options.set_credentials(mqtt_user, mqtt_password);
		mqtt_options.set_keep_alive(Duration::from_secs(30));

		// Configure TLS to use the system's native certificate store
		let mut root_cert_store = rustls::RootCertStore::empty();
		for cert in rustls_native_certs::load_native_certs().expect("could not load platform certs")
		{
			root_cert_store.add(&rustls::Certificate(cert.0)).unwrap();
		}

		let client_config = rustls::ClientConfig::builder()
			.with_safe_defaults()
			.with_root_certificates(root_cert_store)
			.with_no_client_auth();

		mqtt_options.set_transport(Transport::tls_with_config(client_config.into()));
		// --- End of TLS and Authentication Setup ---

		let (client, mut connection) = Client::new(mqtt_options, 10);

		// Channel to send MQTT events from the blocking thread to the async task
		let (event_tx, mut event_rx) = mpsc::channel(100);

		// Spawn a blocking task to handle the MQTT connection's blocking recv()
		let blocking_event_tx = event_tx.clone();
		tauri::async_runtime::spawn_blocking(move || {
			println!("MQTT Receiver Connection Handler (Blocking Thread): Started.");
			for notification in connection.iter() {
				if let Err(e) = blocking_event_tx.blocking_send(notification) {
					eprintln!("MQTT Receiver Connection Handler (Blocking Thread): Failed to send event to async task: {}", e);
					break;
				}
			}
			println!("MQTT Receiver Connection Handler (Blocking Thread): Stopped.");
		});

		// Async task to process MQTT events received from the blocking thread
		let mut client_clone = client.clone();
		let app_handle_for_events = app_handle_clone.clone();
		let mut reconnect_needed = false;

		// Subscribe to topics
		if let Err(e) = client_clone.subscribe("project/#", QoS::AtLeastOnce) {
			eprintln!("MQTT Receiver: Failed to subscribe to topic: {}", e);
			reconnect_needed = true;
		} else {
			println!("MQTT Receiver: Subscribed to 'project/#'");
		}

		while !reconnect_needed {
			tokio::select! {
				Some(notification) = event_rx.recv() => {
					match notification {
						Ok(Event::Incoming(Packet::ConnAck(_))) => {
							println!("MQTT Receiver: Connected to broker!");
						},
						Ok(Event::Incoming(Packet::Publish(publish))) => {
							let topic = publish.topic;
							let payload_str = String::from_utf8_lossy(&publish.payload);
							println!("MQTT Receiver: Received message on topic '{}': {}", topic, payload_str);

							if let Ok(json_payload) = serde_json::from_str::<Value>(&payload_str) {
								if let (Some(event_type), Some(mqtt_path_str), Some(content)) = (
									json_payload["event_type"].as_str(),
									json_payload["path"].as_str(),
									json_payload["content"].as_str(),
								) {
									let native_path_str = mqtt_path_str.replace("/", std::path::MAIN_SEPARATOR_STR);
									let path = PathBuf::from(&native_path_str);

									println!("MQTT Receiver: Event Type: {}, Path: {}, Content: {}", event_type, path.display(), content);
									let monitored_project_path_state = app_handle_for_events.state::<crate::MonitoredProjectPath>();
									let root_path_guard = monitored_project_path_state.0.lock().unwrap();

									if let Some(root) = root_path_guard.as_ref() {
										let target_path = root.join(path);

								match event_type {
									"created" | "modified" => {
										if let Some(parent) = target_path.parent() {
											if let Err(e) = fs::create_dir_all(parent) {
												eprintln!("MQTT Receiver: Failed to create parent directories for {}: {}", target_path.display(), e);
												continue;
											}
										}

										let mut file = match OpenOptions::new().create(true).append(true).open(&target_path) {
											Ok(f) => f,
											Err(e) => {
												eprintln!("MQTT Receiver: Failed to open file {}: {}", target_path.display(), e);
												continue;
											}
										};

										if let Err(e) = std::io::Write::write_all(&mut file, format!("\n{}", content).as_bytes()) {
											eprintln!("MQTT Receiver: Failed to append to file {}: {}", target_path.display(), e);
										} else {
											println!("MQTT Receiver: Successfully {} file {}", event_type, target_path.display());
											let _ = app_handle_for_events.emit("file_updated", target_path.to_string_lossy().to_string());
										}
									},
									"removed" => {
										if let Err(e) = fs::remove_file(&target_path) {
											eprintln!("MQTT Receiver: Failed to remove file {}: {}", target_path.display(), e);
										} else {
											println!("MQTT Receiver: Successfully removed file {}", target_path.display());
											let _ = app_handle_for_events.emit("file_updated", target_path.to_string_lossy().to_string());
										}
									},
									_ => {
										eprintln!("MQTT Receiver: Unknown event type: {}", event_type);
									}
								}
									} else {
										eprintln!("MQTT Receiver: No monitored project path set for receiver. Cannot synchronize files.");
									}
								} else {
									eprintln!("MQTT Receiver: Malformed payload: {}", payload_str);
								}
							} else {
								eprintln!("MQTT Receiver: Failed to parse JSON payload: {}", payload_str);
							}
						},
						Ok(Event::Incoming(Packet::PingResp)) => {
							// Ignore PingResp
						},
						Ok(Event::Outgoing(rumqttc::Outgoing::PingReq)) => {
							// Ignore PingReq
						},
						Ok(event) => {
							println!("MQTT Receiver: Received event: {:?}", event);
						},
						Err(e) => {
							eprintln!("MQTT Receiver: Connection error: {:?}", e);
							reconnect_needed = true;
						}
					}
				},
				_ = rx.recv() => {
					println!("MQTT Receiver: Stop signal received. Shutting down.");
					return; // Exit the init function entirely
				}
			}
		}

		println!("MQTT Receiver: Reconnection needed. Waiting before retrying...");
		tokio::time::sleep(Duration::from_secs(5)).await; // Wait before attempting to reconnect
	}
}

pub fn stop_receiver(app_handle: &AppHandle) {
	let stopper_state = app_handle.state::<MqttReceiverStopper>();
	let mut stopper = stopper_state.0.lock().unwrap();
	if let Some(tx) = stopper.take() {
		let _ = tx.send(());
	}
	println!("MQTT Receiver: Stopping...");
}
