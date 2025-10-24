use clap::Parser;
use csv::{Reader, Writer};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

#[derive(Parser, Debug)]
struct Cli {
    #[arg(short, long)]
    input: PathBuf,
}

#[derive(Debug, Deserialize)]
struct Record {
    condition: String,
    test: String,
    duration_ms: i64,
}

#[derive(Debug, Serialize)]
struct SummaryRow {
    condition: String,
    test: String,
    runs: usize,
    mean_ms: f64,
    stddev_ms: f64,
    median_ms: f64,
    p25_ms: f64,
    p75_ms: f64,
    min_ms: i64,
    max_ms: i64,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();

    let mut rdr = Reader::from_path(&cli.input)?;
    let mut records_by_test: HashMap<(String, String), Vec<f64>> = HashMap::new();

    for result in rdr.deserialize() {
        let record: Record = result?;
        if record.duration_ms >= 0 { // Ignorar filas con errores (timeouts)
            records_by_test
                .entry((record.condition.clone(), record.test.clone()))
                .or_default()
                .push(record.duration_ms as f64);
        }
    }

    let output_path = cli.input.parent().unwrap_or_else(|| std::path::Path::new(".")).join("summary.csv");
    let mut wtr = Writer::from_path(output_path)?;

    println!("Analysis Summary:");
    println!("{:<20} {:<20} {:>10} {:>10} {:>10}", "Condition", "Test", "Mean (ms)", "StdDev (ms)", "Runs");
    println!("-------------------------------------------------------------------");

    for ((condition, test), durations) in records_by_test {
        let mut sorted_durations = durations.clone();
        sorted_durations.sort_by(|a, b| a.partial_cmp(b).unwrap());

        let mean = statistical::mean(&durations);
        let stddev = statistical::standard_deviation(&durations, Some(mean));
        let median = statistical::median(&sorted_durations);
        let min = sorted_durations.first().cloned().unwrap_or(0.0) as i64;
        let max = sorted_durations.last().cloned().unwrap_or(0.0) as i64;
        
        // Usar nuestra propia función de percentiles
        let p25 = percentile(&sorted_durations, 25.0);
        let p75 = percentile(&sorted_durations, 75.0);

        let summary_row = SummaryRow {
            condition: condition.clone(),
            test: test.clone(),
            runs: durations.len(),
            mean_ms: mean,
            stddev_ms: stddev,
            median_ms: median,
            p25_ms: p25,
            p75_ms: p75,
            min_ms: min,
            max_ms: max,
        };

        wtr.serialize(summary_row)?;

        println!("{:<20} {:<20} {:>10.2} {:>10.2} {:>10}", condition, test, mean, stddev, durations.len());
    }

    wtr.flush()?;
    println!("\nSummary statistics written to summary.csv");

    Ok(())
}

/// Calcula el percentil p-ésimo de un conjunto de datos ordenado.
/// p debe estar entre 0.0 y 100.0.
fn percentile(sorted_data: &[f64], p: f64) -> f64 {
    if sorted_data.is_empty() {
        return 0.0;
    }
    if p >= 100.0 {
        return sorted_data[sorted_data.len() - 1];
    }

    let n = sorted_data.len() as f64;
    let rank = (p / 100.0) * (n - 1.0);
    let lower_index = rank.floor() as usize;
    let upper_index = rank.ceil() as usize;

    if lower_index == upper_index {
        return sorted_data[lower_index];
    }

    let lower_value = sorted_data[lower_index];
    let upper_value = sorted_data[upper_index];
    let weight = rank - lower_index as f64;

    lower_value + weight * (upper_value - lower_value)
}
