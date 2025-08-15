use crate::db::migrations::users::MIGRATIONUSERS;
use tauri_plugin_sql::Migration;

// Use MIGRATION inside a function or as a constant/static if needed
// Example: referencing it in a function
pub fn apply_migration() -> Vec<Migration> {
	// Use _migration as needed
	let migrations: Vec<_> = vec![MIGRATIONUSERS];
	migrations
}
