import asyncio
import websockets
import json
import os
import sys
import argparse
import hashlib
import csv
import uuid
import psutil
import time
from datetime import datetime, timezone
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# --- Configuración --- #
PORT = 9009
INACTIVITY_SECONDS = 60
MONITOR_INTERVAL_SECONDS = 0.25 # 250ms

# --- Variables Globales --- #
# Para manejar el estado del watcher de archivos
current_observer = None
current_watched_path = None

# Para manejar el monitoreo de archivos individuales
file_monitors = {}

# --- Clases y Funciones Auxiliares --- #
class FileActivityHandler(FileSystemEventHandler):
    def __init__(self, file_path, activity_queue):
        super().__init__()
        self.file_path = file_path
        self.activity_queue = activity_queue

    def on_modified(self, event):
        if event.is_directory: # Ignorar eventos de directorio
            return
        if os.path.abspath(event.src_path) == os.path.abspath(self.file_path):
            # print(f"[DEBUG] Actividad detectada en {self.file_path}")
            try:
                self.activity_queue.put_nowait(time.time())
            except asyncio.QueueFull:
                pass # Ignorar si la cola está llena

class FileMonitor:
    def __init__(self, file_path, output_writer, raw_logs_dir):
        self.file_path = file_path
        self.output_writer = output_writer
        self.raw_logs_dir = raw_logs_dir
        self.guid = str(uuid.uuid4())
        self.t0 = datetime.now(timezone.utc)
        self.sha_before = self._calculate_hash()
        self.cpu_samples = []
        self.ram_samples = []
        self.activity_queue = asyncio.Queue(maxsize=1) # Cola para señalar actividad
        self.last_activity_time = time.time()
        self.stop_event = asyncio.Event()
        self.monitor_task = None
        self.watcher_observer = None

    def _calculate_hash(self):
        if not os.path.exists(self.file_path):
            return "n/a"
        hasher = hashlib.sha256()
        try:
            with open(self.file_path, 'rb') as f:
                while chunk := f.read(4096):
                    hasher.update(chunk)
            return hasher.hexdigest()
        except Exception as e:
            print(f"[ERROR] Falló el cálculo del hash para {self.file_path}: {e}")
            return "hash_error"

    async def _system_monitor_loop(self):
        while not self.stop_event.is_set():
            cpu_percent = psutil.cpu_percent(interval=None) # Non-blocking
            ram_info = psutil.virtual_memory()
            ram_mb = ram_info.used / (1024 * 1024)
            self.cpu_samples.append(cpu_percent)
            self.ram_samples.append(ram_mb)
            await asyncio.sleep(MONITOR_INTERVAL_SECONDS)

    async def start(self):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] [INFO] Monitoreo iniciado para: {self.file_path}")
        self.monitor_task = asyncio.create_task(self._system_monitor_loop())

        # Iniciar watcher de archivos para este archivo específico
        event_handler = FileActivityHandler(self.file_path, self.activity_queue)
        self.watcher_observer = Observer()
        self.watcher_observer.schedule(event_handler, os.path.dirname(self.file_path), recursive=False)
        self.watcher_observer.start()

        try:
            while not self.stop_event.is_set():
                try:
                    # Esperar actividad o timeout
                    activity_time = await asyncio.wait_for(self.activity_queue.get(), timeout=INACTIVITY_SECONDS)
                    self.last_activity_time = activity_time
                    # print(f"[DEBUG] Actividad registrada en {self.file_path}")
                except asyncio.TimeoutError:
                    # No hubo actividad en INACTIVITY_SECONDS
                    if (time.time() - self.last_activity_time) >= INACTIVITY_SECONDS:
                        print(f"[{datetime.now().strftime('%H:%M:%S')}] [INFO] No hay actividad en {INACTIVITY_SECONDS}s para {self.file_path}. Finalizando.")
                        break # Salir del bucle principal
                    else:
                        # Falso positivo de timeout, seguir esperando
                        pass
        except asyncio.CancelledError:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] [INFO] Monitoreo cancelado para {self.file_path}")
        finally:
            self.stop_event.set()
            if self.monitor_task:
                self.monitor_task.cancel()
                await asyncio.gather(self.monitor_task, return_exceptions=True) # Esperar a que termine
            if self.watcher_observer:
                self.watcher_observer.stop()
                self.watcher_observer.join()
            await self._finalize_monitoring()

    async def _finalize_monitoring(self):
        self.t1 = datetime.now(timezone.utc)
        self.sha_after = self._calculate_hash()

        duration_ms = int((self.t1 - self.t0).total_seconds() * 1000)

        cpu_avg = np.mean(self.cpu_samples) if self.cpu_samples else 0.0
        cpu_peak = np.max(self.cpu_samples) if self.cpu_samples else 0.0
        ram_avg = np.mean(self.ram_samples) if self.ram_samples else 0.0
        ram_peak = np.max(self.ram_samples) if self.ram_samples else 0.0

        # Escribir fila CSV
        csv_row = {
            "condition": "live_monitoring",
            "test": "log_file_activity",
            "run_id": os.path.basename(self.file_path),
            "guid": self.guid,
            "t0_iso": self.t0.isoformat(timespec='milliseconds'),
            "t1_iso": self.t1.isoformat(timespec='milliseconds'),
            "duration_ms": duration_ms,
            "cpu_avg_pct": round(cpu_avg, 2),
            "cpu_peak_pct": round(cpu_peak, 2),
            "ram_avg_mb": round(ram_avg, 2),
            "ram_peak_mb": round(ram_peak, 2),
            "sha_before": self.sha_before,
            "sha_after": self.sha_after,
            "notes": "",
        }
        self.output_writer.writerow(csv_row)
        print(f"[{datetime.now().strftime('%H:%M:%S')}] [INFO] Resultados guardados para {self.file_path}")

        # Escribir log crudo (simplificado)
        raw_log_data = {
            "guid": self.guid,
            "file_path": self.file_path,
            "t0": self.t0.isoformat(timespec='milliseconds'),
            "t1": self.t1.isoformat(timespec='milliseconds'),
            "cpu_samples": self.cpu_samples,
            "ram_samples": self.ram_samples,
        }
        raw_log_file = os.path.join(self.raw_logs_dir, f"run_{self.guid}.json")
        with open(raw_log_file, 'w') as f:
            json.dump(raw_log_data, f, indent=4)

# --- Funciones del Servidor WebSocket --- #
async def handle_client(websocket, path):
    global current_observer, current_watched_path

    print(f"[{datetime.now().strftime('%H:%M:%S')}] [INFO] Cliente conectado.")
    try:
        async for message in websocket:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] [DEBUG] Mensaje recibido: {message}")
            try:
                data = json.loads(message)
                if data.get("command") == "SetWatchPath":
                    new_path = data.get("path")
                    if new_path:
                        print(f"[{datetime.now().strftime('%H:%M:%S')}] [INFO] Comando recibido: Vigilar ruta: {new_path}")

                        # Detener observador anterior si existe
                        if current_observer and current_observer.is_alive():
                            print(f"[{datetime.now().strftime('%H:%M:%S')}] [INFO] Deteniendo observador anterior para {current_watched_path}")
                            current_observer.stop()
                            current_observer.join()
                            current_observer = None
                            current_watched_path = None
                            # Cancelar todos los monitores de archivos activos
                            for monitor in file_monitors.values():
                                if monitor.monitor_task:
                                    monitor.monitor_task.cancel()
                                    await asyncio.gather(monitor.monitor_task, return_exceptions=True)
                            file_monitors.clear()

                        # Iniciar nuevo observador
                        if not os.path.isdir(new_path):
                            response_msg = {"status": "error", "message": f"La ruta no es un directorio válido: {new_path}"}
                            await websocket.send(json.dumps(response_msg))
                            continue

                        current_watched_path = new_path
                        event_handler = DirectoryEventHandler(file_monitors, output_writer, raw_logs_dir)
                        current_observer = Observer()
                        current_observer.schedule(event_handler, new_path, recursive=False)
                        current_observer.start()
                        print(f"[{datetime.now().strftime('%H:%M:%S')}] [INFO] Observador iniciado para: {new_path}")
                        response_msg = {"status": "ok", "message": "Now watching new path"}
                        await websocket.send(json.dumps(response_msg))
                    else:
                        response_msg = {"status": "error", "message": "Ruta no proporcionada"}
                        await websocket.send(json.dumps(response_msg))
                else:
                    response_msg = {"status": "error", "message": "Comando desconocido"}
                    await websocket.send(json.dumps(response_msg))
            except json.JSONDecodeError:
                response_msg = {"status": "error", "message": "Formato JSON inválido"}
                await websocket.send(json.dumps(response_msg))
    except websockets.exceptions.ConnectionClosedOK:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] [INFO] Cliente desconectado.")
    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] [ERROR] Error en la conexión del cliente: {e}")

class DirectoryEventHandler(FileSystemEventHandler):
    def __init__(self, file_monitors_dict, output_writer, raw_logs_dir):
        super().__init__()
        self.file_monitors = file_monitors_dict
        self.output_writer = output_writer
        self.raw_logs_dir = raw_logs_dir

    def on_created(self, event):
        if not event.is_directory and self._is_log_file(event.src_path):
            print(f"[{datetime.now().strftime('%H:%M:%S')}] [INFO] Archivo de log creado: {event.src_path}")
            file_monitor = FileMonitor(event.src_path, self.output_writer, self.raw_logs_dir)
            self.file_monitors[event.src_path] = file_monitor
            asyncio.create_task(file_monitor.start())

    def on_modified(self, event):
        if not event.is_directory and self._is_log_file(event.src_path):
            if event.src_path in self.file_monitors:
                # Señalar actividad al monitor de archivo específico
                try:
                    self.file_monitors[event.src_path].activity_queue.put_nowait(time.time())
                except asyncio.QueueFull:
                    pass

    def _is_log_file(self, path):
        # Implementar lógica para filtrar archivos de log si es necesario
        # Por ahora, cualquier archivo no directorio es considerado potencial log
        return os.path.isfile(path) and path.lower().endswith(('.log', '.txt')) # Ejemplo: solo .log o .txt

# --- Función Principal --- #
async def main():
    parser = argparse.ArgumentParser(description="Python Performance Test Harness.")
    parser.add_argument("--outdir", default="results", help="Directory to save test results.")
    parser.add_argument("--port", type=int, default=PORT, help="Port for the WebSocket server.")
    parser.add_argument("--inactivity_seconds", type=int, default=INACTIVITY_SECONDS, help="Seconds of inactivity before stopping file monitoring.")
    parser.add_argument("--monitor_interval_seconds", type=float, default=MONITOR_INTERVAL_SECONDS, help="Interval for system resource monitoring.")
    args = parser.parse_args()

    global PORT, INACTIVITY_SECONDS, MONITOR_INTERVAL_SECONDS
    PORT = args.port
    INACTIVITY_SECONDS = args.inactivity_seconds
    MONITOR_INTERVAL_SECONDS = args.monitor_interval_seconds

    # Preparar directorio de resultados
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    results_dir = os.path.join(args.outdir, timestamp)
    raw_logs_dir = os.path.join(results_dir, "raw_logs")
    os.makedirs(raw_logs_dir, exist_ok=True)

    csv_path = os.path.join(results_dir, "live_results.csv")
    csv_file = open(csv_path, 'w', newline='')
    fieldnames = ["condition", "test", "run_id", "guid", "t0_iso", "t1_iso", "duration_ms",
                  "cpu_avg_pct", "cpu_peak_pct", "ram_avg_mb", "ram_peak_mb", "sha_before", "sha_after", "notes"]
    output_writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
    output_writer.writeheader()

    print(f"[{datetime.now().strftime('%H:%M:%S')}] [INFO] Harness Python iniciado en el puerto {PORT}")
    print(f"[{datetime.now().strftime('%H:%M:%S')}] [INFO] Resultados se guardarán en: {results_dir}")

    stop_server = asyncio.Event()
    async with websockets.serve(handle_client, "127.0.0.1", PORT):
        await stop_server.wait() # Mantener el servidor corriendo indefinidamente

    csv_file.close()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] [INFO] Harness detenido por el usuario.")
    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] [ERROR] Error inesperado: {e}")
