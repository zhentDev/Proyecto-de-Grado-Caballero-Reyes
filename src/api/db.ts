import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;

const getInstance = async () => {
  if (!db) {
    db = await Database.load("sqlite:database.sqlite");
  }
  return db;
};

export async function createTables() {
  const db = await getInstance();
  await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        )
    `);
  await db.execute(`
        CREATE TABLE IF NOT EXISTS proyects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            path TEXT NOT NULL,
            separator TEXT NOT NULL,
            user_id INTEGER,
            last_selected INTEGER,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    `);
  // Return response if table already exists
  const proyectsResult: string = await db.select(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='proyects'"
  );
  const result: string = await db.select(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
  );
  if (proyectsResult.length > 0 && result.length > 0) {
    // Return response if table already exists
    return { message: "Table already exists" };
  }
}

export async function deleteProyect(name: string) {
  const db = await getInstance();
  await db.execute("DELETE FROM proyects WHERE name = ?", [name]);
  await db.execute("DELETE FROM proyects;");
}

// deleteProyect("hola");

export async function getProyects() {
  const db = await getInstance();
  const result = await db.select("SELECT * FROM proyects");
  return result;
}

export async function getProyect(name: string) {
  const db = await getInstance();
  const result = await db.select("SELECT * FROM proyects WHERE TRIM(LOWER(name)) = TRIM(LOWER(?))", [
    name,
  ]);
  return result;
}

export async function validateProyectExists() {
  const db = await getInstance();
  const result = await db.select(`
		SELECT 
			(SELECT EXISTS(SELECT 1 FROM proyects WHERE last_selected = 1)) as hasTrue,
			(SELECT path FROM proyects WHERE last_selected = 1 LIMIT 1) as path,
			(SELECT separator FROM proyects WHERE last_selected = 1 LIMIT 1) as separator
	`);
  const typedResult = result as Array<{
    hasTrue: number;
    path: string;
    separator: string;
  }>;
  if (typedResult[0].hasTrue === 1) {
    return {
      path: typedResult[0].path,
      delimiter: typedResult[0].separator,
    };
  }
  return { path: "", delimiter: "" };
}

export async function InsertProyect(
  proyectValue: string,
  path: string,
  sepValue: string
) {
  const db = await getInstance();
  await db.execute(
    "INSERT INTO proyects (name, path, separator, last_selected) VALUES (?, ?, ?, ?)",
    [proyectValue, path, sepValue, 1]
  );
}
