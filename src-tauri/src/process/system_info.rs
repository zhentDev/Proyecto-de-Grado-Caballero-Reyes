use serde::{Serialize, Deserialize};
use tauri::AppHandle;
use sysinfo::{System, Disks, Networks};
use crate::START_TIME;


#[derive(Debug, Serialize, Deserialize)]
pub struct SystemParameters {
    // Memoria
    total_memory: u64,
    used_memory: u64,
    available_memory: u64,
    
    // Disco
    total_disk_space: u64,
    available_disk_space: u64,
    
    // Red
    network_received: u64,
    network_transmitted: u64,
    
    // CPU
    cpu_count: usize,
    cpu_usage: f32,
    
    // OS
    os_name: String,
    os_version: String,
    os_arch: String,

    // Startup Time
    startup_time_ms: u128,
}

#[tauri::command]
pub async fn get_system_parameters(_app_handle: AppHandle) -> Result<SystemParameters, String> {
    // Inicializar System para obtener información
    let mut sys = System::new_all();
    
    // Refrescar toda la información
    sys.refresh_all();
    
    // Información del OS usando tauri-plugin-os
    let os_name = tauri_plugin_os::platform().to_string();
    let os_version = tauri_plugin_os::version().to_string();
    let os_arch = tauri_plugin_os::arch().to_string();
    
    // Memoria (en bytes)
    let total_memory = sys.total_memory();
    let used_memory = sys.used_memory();
    let available_memory = sys.available_memory();
    
    // Disco
    let disks = Disks::new_with_refreshed_list();
    let (total_disk, available_disk) = disks.iter().fold((0u64, 0u64), |acc, disk| {
        (acc.0 + disk.total_space(), acc.1 + disk.available_space())
    });
    
    // Red
    let networks = Networks::new_with_refreshed_list();
    let (net_received, net_transmitted) = networks.iter().fold((0u64, 0u64), |acc, (_name, data)| {
        (acc.0 + data.total_received(), acc.1 + data.total_transmitted())
    });
    
    // CPU
    let cpu_count = sys.cpus().len();
    let cpu_usage = sys.global_cpu_usage();

    // Startup time
    let startup_time_ms = START_TIME.elapsed().as_millis();
    
    Ok(SystemParameters {
        total_memory,
        used_memory,
        available_memory,
        total_disk_space: total_disk,
        available_disk_space: available_disk,
        network_received: net_received,
        network_transmitted: net_transmitted,
        cpu_count,
        cpu_usage,
        os_name,
        os_version,
        os_arch,
        startup_time_ms,
    })
}

// Comando adicional para obtener un resumen formateado
#[tauri::command]
pub async fn get_system_info_formatted(_app_handle: AppHandle) -> Result<String, String> {
    let params = get_system_parameters(_app_handle).await?;
    
    let info = format!(
        "=== INFORMACIÓN DEL SISTEMA ===\n\
        \nArranque:\n\
        - Tiempo de Arranque: {} ms\n\
        \nSistema Operativo:\n\
        - Plataforma: {}\n\
        - Versión: {}\n\
        - Arquitectura: {}\n\
        \nMemoria:\n\
        - Total: {} GB\n\
        - Usada: {} GB\n\
        - Disponible: {} GB\n\
        \nDisco:\n\
        - Espacio Total: {} GB\n\
        - Espacio Disponible: {} GB\n\
        \nRed:\n\
        - Datos Recibidos: {} MB\n\
        - Datos Transmitidos: {} MB\n\
        \nCPU:\n\
        - Núcleos: {}\n\
        - Uso: {:.2}%",
        params.startup_time_ms,
        params.os_name,
        params.os_version,
        params.os_arch,
        params.total_memory / (1024 * 1024 * 1024),
        params.used_memory / (1024 * 1024 * 1024),
        params.available_memory / (1024 * 1024 * 1024),
        params.total_disk_space / (1024 * 1024 * 1024),
        params.available_disk_space / (1024 * 1024 * 1024),
        params.network_received / (1024 * 1024),
        params.network_transmitted / (1024 * 1024),
        params.cpu_count,
        params.cpu_usage
    );
    
    Ok(info)
}
