import Database from 'better-sqlite3'
import { app } from 'electron'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { copyFileSync, existsSync, rmSync } from 'fs'
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

export function closeDatabase() {
  if (sqlite) {
    sqlite.close()
  }

  sqlite = null
  db = null
}

export async function exportDatabase(destinationPath: string) {
  await getSqlite().backup(destinationPath)
  return destinationPath
}

export function replaceDatabaseFromFile(sourcePath: string) {
  const targetPath = getDatabaseFilePath()

  closeDatabase()

  for (const suffix of ['-wal', '-shm']) {
    const sidecarPath = `${targetPath}${suffix}`
    if (existsSync(sidecarPath)) {
      rmSync(sidecarPath)
    }
  }

  copyFileSync(sourcePath, targetPath)
  return targetPath
}
