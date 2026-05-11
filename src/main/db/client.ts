import Database from 'better-sqlite3'
import { app } from 'electron'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { join } from 'path'
import * as schema from './schema'

let sqlite: Database.Database | null = null
let db: ReturnType<typeof drizzle<typeof schema>> | null = null

function getDatabaseFilePath() {
  return join(app.getPath('userData'), 'app.db')
}

export function getSqlite() {
  if (!sqlite) {
    sqlite = new Database(getDatabaseFilePath())
    sqlite.pragma('journal_mode = WAL')
    sqlite.pragma('foreign_keys = ON')
  }

  return sqlite
}

export function getDb() {
  if (!db) {
    db = drizzle(getSqlite(), { schema })
  }

  return db
}

export function getDatabasePath() {
  return getDatabaseFilePath()
}
