import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import os
import sys
import json
from glob import glob

def analyze_results(results_dir):
    all_csv_files = glob(os.path.join(results_dir, "results_*.csv"))
    if not all_csv_files:
        print(f"No CSV result files found in {results_dir}")
        return

    all_data = []
    for csv_file in all_csv_files:
        df = pd.read_csv(csv_file)
        all_data.append(df)

    if not all_data:
        print("No data to analyze.")
        return

    combined_df = pd.concat(all_data, ignore_index=True)

    # --- Statistical Analysis ---
    summary_stats = combined_df.groupby(['condition', 'test'])['duration_ms'].agg(
        ['mean', 'std', 'median', lambda x: x.quantile(0.25), lambda x: x.quantile(0.75), 'min', 'max']
    ).rename(columns={'<lambda_0>': 'p25', '<lambda_1>': 'p75'})

    # Calculate improvement percentage (if 'before' and 'after' conditions exist)
    if 'before' in summary_stats.index.get_level_values('condition') and \
       'after' in summary_stats.index.get_level_values('condition'):
        
        improvement_data = []
        for test_name in summary_stats.index.get_level_values('test').unique():
            mean_before = summary_stats.loc[('before', test_name), 'mean']
            mean_after = summary_stats.loc[('after', test_name), 'mean']
            
            if mean_before > 0:
                improvement_pct = ((mean_before - mean_after) / mean_before) * 100
                notes = ""
                if improvement_pct >= 5:
                    notes = "Mejora apreciable"
                elif improvement_pct < -5:
                    notes = "Degradación apreciable"
                else:
                    notes = "Cambio no significativo"
                
                std_after = summary_stats.loc[('after', test_name), 'std']
                if std_after / mean_after * 100 > 30:
                    notes += " (StdDev > 30% de la media, no concluyente)"

                improvement_data.append({
                    'test': test_name,
                    'mean_before': mean_before,
                    'mean_after': mean_after,
                    'improvement_pct': improvement_pct,
                    'notes': notes
                })
        
        improvement_df = pd.DataFrame(improvement_data).set_index('test')
        summary_stats = summary_stats.join(improvement_df)

    summary_stats_path = os.path.join(results_dir, "summary_statistics.csv")
    summary_stats.to_csv(summary_stats_path)
    print(f"Summary statistics saved to {summary_stats_path}")

    # --- Plotting ---
    # Boxplot of duration_ms
    plt.figure(figsize=(12, 7))
    sns.boxplot(data=combined_df, x='test', y='duration_ms', hue='condition')
    plt.title('Distribution of Duration (ms) by Test and Condition')
    plt.xlabel('Test Scenario')
    plt.ylabel('Duration (ms)')
    plt.xticks(rotation=45, ha='right')
    plt.tight_layout()
    boxplot_path = os.path.join(results_dir, "boxplot_duration_ms.png")
    plt.savefig(boxplot_path)
    print(f"Boxplot saved to {boxplot_path}")
    plt.close()

    # Bar chart of mean duration_ms with error bars (stddev)
    plt.figure(figsize=(12, 7))
    sns.barplot(data=combined_df, x='test', y='duration_ms', hue='condition', errorbar='sd', capsize=0.1)
    plt.title('Mean Duration (ms) with Standard Deviation by Test and Condition')
    plt.xlabel('Test Scenario')
    plt.ylabel('Mean Duration (ms)')
    plt.xticks(rotation=45, ha='right')
    plt.tight_layout()
    barplot_path = os.path.join(results_dir, "barplot_mean_duration_ms.png")
    plt.savefig(barplot_path)
    print(f"Bar plot saved to {barplot_path}")
    plt.close()

    # Time series of CPU usage (requires parsing raw logs)
    raw_log_files = glob(os.path.join(results_dir, "raw_logs", "run_*.json"))
    if raw_log_files:
        cpu_time_series_data = []
        for log_file in raw_log_files:
            with open(log_file, 'r') as f:
                raw_log = json.load(f)
                condition = raw_log['notes'].split(';')[0].split(': ')[1] if 'condition' in raw_log['notes'] else 'unknown' # Extract condition from notes or filename
                test = raw_log['notes'].split(';')[1].split(': ')[1] if 'test' in raw_log['notes'] else 'unknown' # Extract test from notes or filename
                
                # Fallback to filename if notes are not structured as expected
                if 'unknown' in [condition, test]:
                    filename_parts = os.path.basename(log_file).split('_')
                    if len(filename_parts) >= 4:
                        condition = filename_parts[1]
                        test = filename_parts[2]

                run_id = raw_log['run_id']
                
                for ts_str, cpu_pct in raw_log['cpu_samples']:
                    # Calculate relative time from the start of the run
                    # Assuming the first sample's timestamp is close to t0
                    first_ts = pd.to_datetime(raw_log['cpu_samples'][0][0])
                    current_ts = pd.to_datetime(ts_str)
                    relative_time_ms = (current_ts - first_ts).total_seconds() * 1000
                    
                    cpu_time_series_data.append({
                        'condition': condition,
                        'test': test,
                        'run_id': run_id,
                        'relative_time_ms': relative_time_ms,
                        'cpu_pct': cpu_pct
                    })
        
        if cpu_time_series_data:
            cpu_ts_df = pd.DataFrame(cpu_time_series_data)
            
            # Aggregate CPU usage by relative time, condition, and test
            # This averages CPU usage across runs at similar relative timestamps
            avg_cpu_ts_df = cpu_ts_df.groupby(['condition', 'test', 'relative_time_ms'])['cpu_pct'].mean().reset_index()
            
            plt.figure(figsize=(14, 8))
            sns.lineplot(data=avg_cpu_ts_df, x='relative_time_ms', y='cpu_pct', hue='condition', style='test')
            plt.title('Average CPU Usage Over Time by Test and Condition')
            plt.xlabel('Relative Time (ms)')
            plt.ylabel('Average CPU Usage (%)')
            plt.grid(True)
            plt.tight_layout()
            cpu_ts_path = os.path.join(results_dir, "cpu_time_series.png")
            plt.savefig(cpu_ts_path)
            print(f"CPU Time Series plot saved to {cpu_ts_path}")
            plt.close()
        else:
            print("No CPU time series data to plot.")
    else:
        print("No raw log files found for CPU time series analysis.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python analyze_results.py <path_to_results_directory>")
        sys.exit(1)
    
    results_directory = sys.argv[1]
    analyze_results(results_directory)