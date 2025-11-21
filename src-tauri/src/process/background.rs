use rand::Rng;
use rumqttc::{Client, Event, MqttOptions, Packet, QoS, Transport};
use rustls;
use rustls_native_certs;
use serde_json::Value;
use std::fs;
use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, EventId, Listener, Manager};
use tokio::sync::mpsc;
use tokio::time::Duration;

// State to hold the sender for stopping the MQTT receiver
pub struct MqttReceiverStopper(pub Mutex<Option<mpsc::Sender<()>>>);

impl Default for MqttReceiverStopper {
	fn default() -> Self {
		MqttReceiverStopper(Mutex::new(None))
	}
}

pub struct MqttReceiverListener(pub Mutex<Option<EventId>>);

impl Default for MqttReceiverListener {
	fn default() -> Self {
		MqttReceiverListener(Mutex::new(None))
	}
}

#[derive(serde::Deserialize, Clone)]
struct PathResponsePayload {
	#[serde(rename = "projectPath")]
	project_path: Option<String>,
	#[serde(rename = "originalPayload")]
	original_payload: Value,
}

pub async fn init(app_handle: AppHandle, mut rx: mpsc::Receiver<()>) {
	println!("MQTT Receiver: Initializing...");

	let response_handle = app_handle.clone();
	let listener_id = response_handle.clone().listen("project-path-response", move |event| {
		println!("MQTT Receiver: Received project-path-response from frontend.");
		if let Ok(payload) = serde_json::from_str::<PathResponsePayload>(event.payload()) {
			if let Some(path_str) = payload.project_path {
				let root = PathBuf::from(path_str);
				let original_payload = payload.original_payload;

				if let (Some(event_type), Some(mqtt_path_str), Some(content)) = (
					original_payload["event_type"].as_str(),
					original_payload["path"].as_str(),
					original_payload["content"].as_str(),
				) {
					let project_name = mqtt_path_str.split('/').next().unwrap_or("");
					let path_from_payload =
						PathBuf::from(mqtt_path_str.replace("/", std::path::MAIN_SEPARATOR_STR));

					let path_to_join = match path_from_payload.strip_prefix(project_name) {
						Ok(p) => p,
						Err(_) => &path_from_payload,
					};

					let target_path = root.join(path_to_join);
					println!(
						"MQTT Receiver: Final target path: {}",
						target_path.display()
					);

					match event_type {
						"created" | "modified" => {
							if let Some(parent) = target_path.parent() {
								if let Err(e) = fs::create_dir_all(parent) {
									eprintln!(
										"MQTT Receiver: Failed to create parent directories for {}: {}",
										target_path.display(),
										e
									);
									return;
								}
							}
							let mut file = match OpenOptions::new()
								.create(true)
								.append(true)
								.open(&target_path)
							{
								Ok(file) => file,
								Err(e) => {
									eprintln!(
										"MQTT Receiver: Failed to open or create file {}: {}",
										target_path.display(),
										e
									);
									return;
								}
							};

							if let Err(e) = writeln!(file, "{}", content) {
								eprintln!(
									"MQTT Receiver: Failed to write to file {}: {}",
									target_path.display(),
									e
								);
							} else {
								println!(
									"MQTT Receiver: Successfully appended to file {}",
									target_path.display()
								);
								let _ = response_handle
									.emit("file_updated", target_path.to_string_lossy().to_string());
							}
						}
						"removed" => {
							if let Err(e) = fs::remove_file(&target_path) {
								eprintln!(
									"MQTT Receiver: Failed to remove file {}: {}",
									target_path.display(),
									e
								);
							} else {
								println!(
									"MQTT Receiver: Successfully removed file {}",
									target_path.display()
								);
								let _ = response_handle
									.emit("file_updated", target_path.to_string_lossy().to_string());
							}
						}
						_ => {
							eprintln!("MQTT Receiver: Unknown event type: {}", event_type);
						}
					}
				}
			} else {
				if let Some(project_name) = payload.original_payload["projectName"].as_str() {
					eprintln!(
						"MQTT Receiver: Project '{}' not found in database. Emitting notification.",
						project_name
					);
					let _ = response_handle.emit("project-not-found", project_name.to_string());
				} else {
					eprintln!("MQTT Receiver: Project name not found in original payload for unknown project path.");
				}
			}
		} else {
			eprintln!(
				"MQTT Receiver: Failed to parse project-path-response payload: {:?}",
				event.payload()
			);
		}
	});

	let listener_state = app_handle.state::<MqttReceiverListener>();
	*listener_state.0.lock().unwrap() = Some(listener_id);

	let app_handle_for_loop = app_handle.clone();
	loop {
		println!("MQTT Receiver: Attempting to connect to broker...");

		// --- TLS and Authentication Setup (using system certificates) ---
		let broker_url = "b890714b58bc47ab852b24ea4753227b.s1.eu.hivemq.cloud";
		let broker_port = 8883;
		// IMPORTANT: Replace with your actual username and password
		let mqtt_user = "zhent";
		let mqtt_password = "Zhent1234";

		// Generate a random client ID suffix to prevent collisions
		let random_suffix: String =
			rand::thread_rng().sample_iter(&rand::distributions::Alphanumeric).take(6).map(char::from).collect();
		let client_id = format!("tauri_receiver_{}", random_suffix);

		let mut mqtt_options = MqttOptions::new(client_id, broker_url, broker_port);
		mqtt_options.set_credentials(mqtt_user, mqtt_password);
		mqtt_options.set_keep_alive(Duration::from_secs(30));

		// Configure TLS to use the system's native certificate store
		let mut root_cert_store = rustls::RootCertStore::empty();
		for cert in rustls_native_certs::load_native_certs().expect("could not load platform certs") {
			root_cert_store.add(&rustls::Certificate(cert.0)).unwrap();
		}

		let client_config = rustls::ClientConfig::builder()
			.with_safe_defaults()
			.with_root_certificates(root_cert_store)
			.with_no_client_auth();

		mqtt_options.set_transport(Transport::tls_with_config(client_config.into()));
		// --- End of TLS and Authentication Setup ---

		let (mut client, mut connection) = Client::new(mqtt_options, 10);

		// Channel to send MQTT events from the blocking thread to the async task
		let (event_tx, mut event_rx) = mpsc::channel(100);

		// Spawn a blocking task to handle the MQTT connection's blocking recv()
		let blocking_event_tx = event_tx.clone();
		tauri::async_runtime::spawn_blocking(move || {
			println!("MQTT Receiver Connection Handler (Blocking Thread): Started.");
			for notification in connection.iter() {
				if let Err(e) = blocking_event_tx.blocking_send(notification) {
					eprintln!(
						"MQTT Receiver Connection Handler (Blocking Thread): Failed to send event to async task: {}",
						e
					);
					break;
				}
			}
			println!("MQTT Receiver Connection Handler (Blocking Thread): Stopped.");
		});

		// Async task to process MQTT events received from the blocking thread
		let app_handle_for_events = app_handle_for_loop.clone();
		let mut reconnect_needed = false;

		// Subscribe to topics
		if let Err(e) = client.subscribe("project/#", QoS::AtLeastOnce) {
			eprintln!("MQTT Receiver: Failed to subscribe to topic: {}", e);
			reconnect_needed = true;
		} else {
			println!("MQTT Receiver: Subscribed to 'project/#");
		}

		while !reconnect_needed {
			tokio::select! {
				Some(notification) = event_rx.recv() => {
					match notification {
						Ok(Event::Incoming(Packet::ConnAck(_))) => {
							println!("MQTT Receiver: Connected to broker!");
						},
						Ok(Event::Incoming(Packet::Publish(publish))) => {
							let topic = publish.topic.clone();
							let payload_str = String::from_utf8_lossy(&publish.payload);

							if let Ok(json_payload) = serde_json::from_str::<Value>(&payload_str) {
								if let Some(mqtt_path_str) = json_payload["path"].as_str() {
									let mut project_name = topic.split('/').nth(1).unwrap_or("").to_string();
									if project_name.is_empty() || project_name == "*" {
										project_name = mqtt_path_str.split('/').next().unwrap_or("").to_string();
									}

									if !project_name.is_empty() {
										println!("MQTT Receiver: Requesting path for project '{}' from frontend.", project_name);
										let _ = app_handle_for_events.emit("request-project-path", serde_json::json!({
											"projectName": project_name,
											"originalPayload": json_payload
										}));
									} else {
										eprintln!("MQTT Receiver: Could not determine project name from topic '{}' or payload.", topic);
									}
								} else {
									eprintln!("MQTT Receiver: Malformed JSON payload: {}", payload_str);
								}
							} else {
								println!("MQTT Receiver: Ignoring non-JSON message on topic '{}'", topic);
							}
						},
						Ok(Event::Incoming(Packet::PingResp)) => {},
						Ok(Event::Outgoing(rumqttc::Outgoing::PingReq)) => {},
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

	let listener_state = app_handle.state::<MqttReceiverListener>();
	if let Some(listener_id) = listener_state.0.lock().unwrap().take() {
		app_handle.unlisten(listener_id);
	}

	println!("MQTT Receiver: Stopping...");
}
