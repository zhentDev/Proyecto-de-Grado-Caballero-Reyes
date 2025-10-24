# Suite de Pruebas de Rendimiento para Aplicaciones Tauri 2.0

Este proyecto implementa un harness de pruebas robusto para medir automáticamente métricas de rendimiento clave en una aplicación Tauri 2.0. El sistema está diseñado para ser reproducible en Windows 11 y proporciona artefactos listos para ejecutar, incluyendo un binario Rust del harness, modificaciones mínimas en la aplicación Tauri para emitir ACKs, scripts de ejecución automatizados, y un módulo de análisis para generar tablas y gráficos.

## Arquitectura del Sistema

1.  **Harness (Rust)**: Un ejecutable independiente escrito en Rust (`harness/src/main.rs`) que controla el ciclo de vida de las pruebas. Sus funciones incluyen:
    *   Limpiar el estado antes de cada ejecución.
    *   Lanzar la aplicación Tauri y/o un "bot" simulador.
    *   Marcar tiempos de inicio (`t0`).
    *   Escuchar y esperar mensajes de Acknowledgment (ACK) de la aplicación Tauri a través de un socket TCP local.
    *   Marcar tiempos de finalización (`t1`) al recibir un ACK.
    *   Muestrear periódicamente el uso de CPU y RAM del sistema.
    *   Calcular hashes SHA-256 de archivos objetivo antes y después de la ejecución para verificar la integridad de los datos.
    *   Registrar todos los resultados en un archivo CSV y logs crudos en formato JSON.
    *   Manejar timeouts y reintentos.

2.  **Aplicación Tauri (Rust Backend)**: La aplicación Tauri 2.0 (`src-tauri/src/lib.rs`) ha sido modificada mínimamente para incluir un comando `emit_ack_tcp`. Este comando permite que el backend de la aplicación envíe mensajes ACK al harness a través de un socket TCP local cuando se completan eventos clave (ej. UI renderizada, procesamiento de logs, guardado de datos).

3.  **Scripts de Ejecución (PowerShell)**: Un script de PowerShell (`scripts/run_tests.ps1`) automatiza el proceso completo de pruebas:
    *   Limpia compilaciones y resultados anteriores.
    *   Compila el harness y la aplicación Tauri en modo `release`.
    *   Lanza la aplicación Tauri en segundo plano.
    *   Ejecuta el harness para diferentes escenarios de prueba, pasando los parámetros necesarios.
    *   Maneja el cierre de la aplicación Tauri después de cada prueba.

4.  **Módulo de Análisis (Python)**: Un script de Python (`analysis/analyze_results.py`) procesa los archivos CSV y JSON generados por el harness. Realiza las siguientes tareas:
    *   Calcula estadísticas descriptivas (media, desviación estándar, mediana, percentiles p25/p75, min, max) para las duraciones de las pruebas.
    *   Calcula el porcentaje de mejora o degradación entre diferentes condiciones de prueba.
    *   Genera gráficos PNG: boxplots de latencias, gráficos de barras de medias con barras de error, y series temporales del uso promedio de CPU.
    *   Guarda un resumen estadístico en un archivo CSV.

## Prerrequisitos

*   **Rust (stable)**: Necesario para compilar el harness y la aplicación Tauri.
*   **Python 3**: Necesario para el módulo de análisis. Asegúrate de tener `pandas`, `matplotlib`, `seaborn`, `json` instalados (`pip install pandas matplotlib seaborn`).
*   **Node.js / bun**: Necesario para las dependencias del frontend de Tauri.
*   **Windows 11**: Los scripts de ejecución están diseñados para PowerShell.
*   **WebView2 Runtime**: Asegúrate de que el runtime de WebView2 esté instalado para la aplicación Tauri.

## Artefactos Entregados

Los siguientes artefactos han sido creados o modificados:

1.  **`harness/Cargo.toml`**: Archivo de configuración de dependencias para el harness Rust.
2.  **`harness/src/main.rs`**: Código fuente completo del harness de pruebas Rust.
3.  **`src-tauri/src/lib.rs`**: Modificación para incluir el comando `emit_ack_tcp` en el backend de Tauri.
4.  **`scripts/run_tests.ps1`**: Script de PowerShell para automatizar la ejecución de pruebas.
5.  **`scripts/dummy_bot_open_project.ps1`**: Script PowerShell de ejemplo para simular la apertura de un proyecto.
6.  **`scripts/dummy_bot_store_record.ps1`**: Script PowerShell de ejemplo para simular el almacenamiento de un registro.
7.  **`scripts/dummy_bot_batch_records.ps1`**: Script PowerShell de ejemplo para simular el almacenamiento de un lote de registros.
8.  **`analysis/analyze_results.py`**: Script Python para el análisis estadístico y la generación de gráficos.
9.  **`README.md`**: Este documento, actualizado con las instrucciones y detalles de la implementación.

## Guía de Ejecución

Sigue estos pasos para configurar y ejecutar las pruebas de rendimiento:

### 1. Configuración Inicial

Asegúrate de tener Rust (stable), Python 3 y Node.js/bun instalados.

Instala las dependencias de Python:
```bash
pip install pandas matplotlib seaborn
```

### 2. Compilación

El script `run_tests.ps1` se encargará de compilar automáticamente el harness y la aplicación Tauri.

### 3. Integración en la Aplicación Tauri

El comando `emit_ack_tcp` ya ha sido añadido y registrado en `src-tauri/src/lib.rs`. Para que las pruebas funcionen, **debes invocar este comando desde tu aplicación Tauri** en los puntos clave de cada escenario de prueba.

**Ejemplo de invocación desde el frontend (TypeScript/JavaScript):**

```javascript
import { invoke } from '@tauri-apps/api/tauri';

// Para el Test A (Inicialización): Llama a esto cuando la UI esté completamente renderizada y lista.
async function onAppReady(guid: string) {
  try {
    await invoke('emit_ack_tcp', { port: 9009, test: 'Initialization', guid: guid });
    console.log(`ACK de inicialización enviado para GUID: ${guid}`);
  } catch (error) {
    console.error('Error al enviar ACK de inicialización:', error);
  }
}

// Para el Test B (Apertura de Proyecto): Llama a esto cuando el proyecto se haya cargado completamente.
async function onProjectOpened(guid: string) {
  try {
    await invoke('emit_ack_tcp', { port: 9009, test: 'OpenProject_Medium', guid: guid });
    console.log(`ACK de apertura de proyecto enviado para GUID: ${guid}`);
  } catch (error) {
    console.error('Error al enviar ACK de apertura de proyecto:', error);
  }
}

// Para el Test C (Guardar Registro): Llama a esto cuando un registro se haya guardado en la BD/archivo.
async function onRecordStored(guid: string) {
  try {
    await invoke('emit_ack_tcp', { port: 9009, test: 'StoreSingleRecord', guid: guid });
    console.log(`ACK de guardado de registro enviado para GUID: ${guid}`);
  } catch (error) {
    console.error('Error al enviar ACK de guardado de registro:', error);
  }
}

// Para el Test D (Lote de Registros): Llama a esto cuando el lote de registros se haya procesado.
async function onBatchRecordsProcessed(guid: string) {
  try {
    await invoke('emit_ack_tcp', { port: 9009, test: 'Batch100Records', guid: guid });
    console.log(`ACK de lote de registros enviado para GUID: ${guid}`);
  } catch (error) {
    console.error('Error al enviar ACK de lote de registros:', error);
  }
}
```

**Nota sobre los "Bot" Scripts:**
Los scripts `dummy_bot_*.ps1` en la carpeta `scripts/` son **placeholders**. En un escenario real, estos scripts deberían interactuar con tu aplicación Tauri para desencadenar las acciones que deseas medir. Por ejemplo, podrían usar `tauri-plugin-shell` para enviar comandos al backend de Tauri, o simular interacciones de UI si tu aplicación expone una API para ello. El `harness` espera que tu aplicación Tauri envíe el ACK correspondiente después de completar la acción.

### 4. Ejecución de las Pruebas

Abre una terminal de PowerShell en la raíz del proyecto y ejecuta el script:

```powershell
.\scripts\run_tests.ps1
```

El script realizará los siguientes pasos automáticamente:
1.  Limpiará los directorios `target` del harness y de la aplicación Tauri.
2.  Compilará el harness Rust en modo `release`.
3.  Compilará la aplicación Tauri en modo `release`.
4.  Para cada escenario de prueba definido:
    *   Lanzará la aplicación Tauri en segundo plano.
    *   Ejecutará el harness, que a su vez podría lanzar un script "bot" si está configurado.
    *   El harness esperará el ACK de la aplicación Tauri.
    *   Una vez finalizada la prueba, el harness registrará los resultados y el script de PowerShell cerrará la aplicación Tauri.

### 5. Análisis de Resultados

Una vez que `run_tests.ps1` haya completado todas las pruebas, los resultados se guardarán en un nuevo directorio dentro de `results/` (ej. `results/20251020_HHMMSS`).

El script de PowerShell te indicará cómo ejecutar el análisis:

```powershell
python analysis/analyze_results.py <ruta_al_directorio_de_resultados>
```

**Ejemplo:**

```powershell
python analysis/analyze_results.py results/20251020_123456
```

El script de análisis generará:
*   **`summary_statistics.csv`**: Un archivo CSV con estadísticas descriptivas (media, stddev, mediana, p25, p75, min, max) para `duration_ms` por cada combinación de condición y prueba. También incluirá el porcentaje de mejora y notas interpretativas.
*   **`boxplot_duration_ms.png`**: Un boxplot que muestra la distribución de las duraciones de las pruebas.
*   **`barplot_mean_duration_ms.png`**: Un gráfico de barras que muestra las medias de duración con barras de error (desviación estándar).
*   **`cpu_time_series.png`**: Un gráfico de series temporales que muestra el uso promedio de CPU durante las ejecuciones.

## Formato CSV de Resultados

El archivo CSV principal (`results_*.csv`) tendrá las siguientes columnas:

*   `condition`: Condición de la prueba (ej. "before", "after").
*   `test`: Nombre del escenario de prueba (ej. "Initialization", "StoreSingleRecord").
*   `run_id`: Identificador único de la ejecución dentro de un escenario.
*   `guid`: GUID único generado para cada ejecución.
*   `t0_iso`: Marca de tiempo ISO 8601 del inicio de la prueba (cuando el harness lanza el bot/app).
*   `t1_iso`: Marca de tiempo ISO 8601 de la recepción del ACK por el harness.
*   `duration_ms`: Duración de la prueba en milisegundos (`t1` - `t0`).
*   `cpu_avg_pct`: Uso promedio de CPU durante la prueba (%).
*   `cpu_peak_pct`: Uso pico de CPU durante la prueba (%).
*   `ram_avg_mb`: Uso promedio de RAM durante la prueba (MB).
*   `ram_peak_mb`: Uso pico de RAM durante la prueba (MB).
*   `sha_before`: Hash SHA-256 del archivo objetivo antes de la prueba.
*   `sha_after`: Hash SHA-256 del archivo objetivo después de la prueba.
*   `ack_raw`: Mensaje ACK JSON recibido (escapado para CSV).
*   `exit_code`: Código de salida del proceso "bot" o de la aplicación (si aplica).
*   `notes`: Notas adicionales, como timeouts o errores de integridad.

## Interpretación de Resultados

*   **Mejora/Degradación**: El script de análisis calculará el porcentaje de cambio entre las condiciones "before" y "after".
    *   `>= 5%`: Considerado una mejora apreciable.
    *   `<= -5%`: Considerado una degradación apreciable.
*   **Confiabilidad**: Si la desviación estándar (`stddev`) es mayor al 30% de la media, los resultados pueden no ser concluyentes debido a la alta variabilidad.
*   **Integridad de Datos**: La columna `notes` indicará `integrity_mismatch` si los hashes `sha_before` y `sha_after` de un archivo objetivo no coinciden, y no se esperaba un cambio.

## Reproducibilidad y Versionado

El harness guarda la fecha y hora de la ejecución en el nombre del directorio de resultados. Para una reproducibilidad completa, se recomienda registrar el hash del commit de Git del repositorio en el momento de la ejecución de las pruebas. Esto se puede añadir manualmente a las notas de la ejecución o al script de PowerShell.
