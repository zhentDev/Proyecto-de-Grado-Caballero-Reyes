use chrono::Utc;
use clap::Parser;
use csv::Writer;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use sysinfo::{System, SystemExt, CpuExt};
use tokio::net::TcpListener;
use tokio::task::JoinHandle;
use tokio::sync::{mpsc, broadcast};
use uuid::Uuid;
use log::{info, error, debug};
use env_logger;
use notify::{Event, EventKind, RecursiveMode, Watcher};
use tokio_tungstenite::{accept_async, tungstenite::Message};
use futures_util::{StreamExt, SinkExt};
use std::collections::HashMap;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Cli {
    #[arg(long, default_value = "results")]
    outdir: PathBuf,
    #[arg(long, default_value_t = 9009)]
    port: u16,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "command")]
enum HarnessCommand {
    SetWatchPath { path: String },
}

#[derive(Serialize, Clone)]
struct CsvRow {
    condition: String,
    test: String,
    run_id: String,
    guid: String,
    t0_iso: String,
    t1_iso: String,
    duration_ms: i64,
    cpu_avg_pct: f32,
    cpu_peak_pct: f32,
    ram_avg_mb: u64,
    ram_peak_mb: u64,
    sha_before: String,
    sha_after: String,
    notes: String,
}

#[tokio::main] async fn main() -> Result<(), Box<dyn std::error::Error>> {
env_logger::Builder::new()
        .format(|buf, record| {
            writeln!(
                buf,
                "{} [{}] - {}",
                chrono::Local::now().format("%H:%M:%S"),
                record.level(),
                record.args()
            )
        })
        .init();
    let cli = Cli::parse();

    let listener = TcpListener::bind(format!("127.0.0.1:{}", cli.port)).await?;
    info!("Harness server listening on port {}", cli.port);

    let results_dir = cli.outdir.join(Utc::now().format("%Y%m%d_%H%M%S").to_string());
    std::fs::create_dir_all(&results_dir)?;
    let csv_path = results_dir.join("live_results.csv");
    let writer = Arc::new(Mutex::new(Writer::from_path(csv_path)?));

    let mut watch_task: Option<(JoinHandle<()>, broadcast::Sender<()>)> = None;

    while let Ok((stream, _)) = listener.accept().await {
        let ws_stream = accept_async(stream).await?;
        let (mut write, mut read) = ws_stream.split();

        info!("Tauri client connected.");

        while let Some(Ok(msg)) = read.next().await {
            if let Message::Text(text) = msg {
                match serde_json::from_str::<HarnessCommand>(&text) {
                    Ok(HarnessCommand::SetWatchPath { path }) => {
                        info!("Received command to watch path: {}", path);

                        // Stop previous watcher if it exists
                        if let Some((handle, stop_tx)) = watch_task.take() {
                            info!("Stopping previous file watcher.");
                            let _ = stop_tx.send(());
                            handle.await?;
                        }

                        // Start new watcher
                        let (stop_tx, stop_rx) = broadcast::channel(1);
                        let writer_clone = Arc::clone(&writer);
                        let handle = tokio::spawn(async move {
                            watch_directory(PathBuf::from(path), writer_clone, stop_rx).await;
                        });
                        watch_task = Some((handle, stop_tx));
                        
                        let response = Message::Text("{{\"status\":\"ok\", \"message\":\"Now watching new path\"}}".to_string());
                        write.send(response).await?;
                    }
                    Err(e) => {
                        error!("Failed to parse command: {}", e);
                        let response = Message::Text(format!("{{\"status\":\"error\", \"message\":\"{}\"}}", e));
                        write.send(response).await?;
                    }
                }
            }
        }
    }
    Ok(())
}

async fn watch_directory(path: PathBuf, writer: Arc<Mutex<Writer<std::fs::File>>>, mut stop_rx: broadcast::Receiver<()>) {
    debug!("{} - watch_directory: Iniciando para la ruta: {:?}", chrono::Local::now().format("%H:%M:%S"), path);
    let (tx, mut rx) = mpsc::channel(10);
    let mut watcher = match notify::recommended_watcher(move |res| {
        match res {
            Ok(event) => {
                debug!("{} - watch_directory: Evento recibido de notify: {:?}", chrono::Local::now().format("%H:%M:%S"), event);
                let _ = tx.blocking_send(event);
            }
            Err(e) => error!("{} - watch_directory: Error de notify: {:?}", chrono::Local::now().format("%H:%M:%S"), e),
        }
    }) {
        Ok(w) => w,
        Err(e) => {
            error!("{} - watch_directory: Falló al crear watcher: {}", chrono::Local::now().format("%H:%M:%S"), e);
            return;
        }
    };

    if let Err(e) = watcher.watch(&path, RecursiveMode::NonRecursive) {
        error!("{} - watch_directory: Falló al vigilar la ruta '{}': {}", chrono::Local::now().format("%H:%M:%S"), path.display(), e);
        return;
    }

    info!("{} - Now watching directory: {:?}", chrono::Local::now().format("%H:%M:%S"), path);
    let mut handled_files = HashMap::new();

    loop {
        tokio::select! {
            Some(event) = rx.recv() => {
                debug!("{} - watch_directory: Evento recibido del canal: {:?}", chrono::Local::now().format("%H:%M:%S"), event);
                if let EventKind::Create(_) = event.kind {
                    for p in event.paths {
                        if p.is_file() && !handled_files.contains_key(&p) {
                            info!("{} - New log file detected: {:?}", chrono::Local::now().format("%H:%M:%S"), p);
                            handled_files.insert(p.clone(), ());
                            let writer_clone = Arc::clone(&writer);
                            tokio::spawn(async move {
                                monitor_file(p, writer_clone).await;
                            });
                        }
                    }
                }
            }
            _ = stop_rx.recv() => {
                info!("{} - Received stop signal. Shutting down directory watcher for {:?}.", chrono::Local::now().format("%H:%M:%S"), path);
                break;
            }
        }
    }
}

async fn monitor_file(path: PathBuf, writer: Arc<Mutex<Writer<std::fs::File>>>) {
    // This function is mostly the same, but simplified
    let file_id = path.to_string_lossy().to_string();
    let guid = Uuid::new_v4().to_string();
    let t0 = Utc::now();
    let sha_before = calculate_hash(&path).unwrap_or_else(|_| "hash_error".to_string());

    let (stop_tx, _) = broadcast::channel(1);
    let monitoring_handle = tokio::spawn(run_system_monitor(stop_tx.subscribe()));

    let (activity_tx, mut activity_rx) = mpsc::channel(10);
    let mut file_watcher = notify::recommended_watcher(move |res: Result<Event, _>| {
        if let Ok(event) = res {
            if let EventKind::Modify(_) = event.kind {
                debug!("File activity detected: {:?}", event.paths);
                let _ = activity_tx.blocking_send(());
            }
        }
    }).unwrap();
    file_watcher.watch(&path, RecursiveMode::NonRecursive).unwrap();

    info!("[{}] Monitoring started.", file_id);

    loop {
        match tokio::time::timeout(Duration::from_secs(60), activity_rx.recv()).await {
            Ok(Some(_)) => continue,
            _ => break, // Timeout or channel closed
        }
    }
    info!("[{}] No activity for 60s. Finalizing measurements.", file_id);

    let t1 = Utc::now();
    let duration = t1.signed_duration_since(t0).num_milliseconds();

    let _ = stop_tx.send(());
    let (cpu_samples, ram_samples) = match monitoring_handle.await {
        Ok(Ok(data)) => data,
        _ => (vec![], vec![]),
    };

    let sha_after = calculate_hash(&path).unwrap_or_else(|_| "hash_error".to_string());

    let cpu_avg = if !cpu_samples.is_empty() { cpu_samples.iter().sum::<f32>() / cpu_samples.len() as f32 } else { 0.0 };
    let cpu_peak = cpu_samples.iter().fold(0.0f32, |a, &b| a.max(b));
    let ram_avg = if !ram_samples.is_empty() { ram_samples.iter().sum::<u64>() / ram_samples.len() as u64 } else { 0 };
    let ram_peak = *ram_samples.iter().max().unwrap_or(&0);

    let csv_row = CsvRow {
        condition: "live_monitoring".to_string(),
        test: "log_file_activity".to_string(),
        run_id: file_id.clone(),
        guid,
        t0_iso: t0.to_rfc3339(),
        t1_iso: t1.to_rfc3339(),
        duration_ms: duration,
        cpu_avg_pct: cpu_avg,
        cpu_peak_pct: cpu_peak,
        ram_avg_mb: ram_avg,
        ram_peak_mb: ram_peak,
        sha_before,
        sha_after,
        notes: "".to_string(),
    };

    let mut wtr = writer.lock().unwrap();
    let _ = wtr.serialize(csv_row);
    wtr.flush().unwrap();
    info!("[{}] Results saved.", file_id);
}

async fn run_system_monitor(mut stop_rx: broadcast::Receiver<()>) -> Result<(Vec<f32>, Vec<u64>), ()> {
    // Same as before
    let mut sys = System::new_all();
    let mut cpu_samples = Vec::new();
    let mut ram_samples = Vec::new();
    let mut interval = tokio::time::interval(Duration::from_millis(250));
    loop {
        tokio::select! {
            _ = interval.tick() => {
                sys.refresh_cpu();
                sys.refresh_memory();
                cpu_samples.push(sys.global_cpu_info().cpu_usage());
                ram_samples.push(sys.used_memory() / 1024 / 1024);
            }
            _ = stop_rx.recv() => break,
        }
    }
    Ok((cpu_samples, ram_samples))
}

fn calculate_hash(path: &Path) -> Result<String, std::io::Error> {
    // Same as before
    let mut file = std::fs::File::open(path)?;
    let mut hasher = Sha256::new();
    let mut buffer = [0; 1024];
    loop {
        let n = file.read(&mut buffer)?;
        if n == 0 { break; }
        hasher.update(&buffer[..n]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}