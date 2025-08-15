use tauri_plugin_sql::{Migration, MigrationKind};

pub const MIGRATIONUSERS: Migration = Migration {
	version: 1,
	description: "Create_initial_tables",
	sql: "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT);",
	kind: MigrationKind::Up,
};
