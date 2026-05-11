import { getSqlite } from './client'

export function migrateDatabase() {
  const sqlite = getSqlite()

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'vendor', 'stock')),
      active INTEGER NOT NULL DEFAULT 1,
      must_change_password INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TRIGGER IF NOT EXISTS users_set_updated_at
    AFTER UPDATE ON users
    FOR EACH ROW
    BEGIN
      UPDATE users
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = OLD.id;
    END;
  `)
}
