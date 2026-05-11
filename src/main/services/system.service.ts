import Database from 'better-sqlite3'
import { app, dialog } from 'electron'
import { existsSync } from 'fs'
import { basename } from 'path'
import type { DatabaseTransferResult } from '../../shared/types'
import { exportDatabase, getDatabasePath, replaceDatabaseFromFile } from '../db/client'
import { requireAuth, requireRole } from '../session'
import { writeAuditLog } from './audit.service'

type SqliteMasterRow = {
  name: string
}

function requireSystemAccess() {
  const user = requireAuth()
  return requireRole(user, ['admin'])
}

function validateImportedDatabase(filePath: string) {
  const database = new Database(filePath, { readonly: true, fileMustExist: true })

  try {
    const rows = database.prepare('SELECT name FROM sqlite_master WHERE type = ?').all('table') as SqliteMasterRow[]

    const tables = new Set(rows.map((row) => row.name))
    for (const requiredTable of ['users', 'products', 'sales', 'audit_log']) {
      if (!tables.has(requiredTable)) {
        throw new Error('invalid_database_file')
      }
    }
  } finally {
    database.close()
  }
}

export const systemService = {
  async exportDatabase(): Promise<DatabaseTransferResult> {
    const user = requireSystemAccess()
    const result = await dialog.showSaveDialog({
      title: 'Exportar base de datos',
      defaultPath: 'mis-trapitos-backup.db',
      filters: [{ name: 'Base de datos SQLite', extensions: ['db', 'sqlite', 'sqlite3'] }],
    })

    if (result.canceled || !result.filePath) {
      return { canceled: true, filePath: null, relaunching: false }
    }

    await exportDatabase(result.filePath)

    await writeAuditLog({
      action: 'export',
      entity: 'database',
      payload: {
        destinationFileName: basename(result.filePath),
        databasePath: getDatabasePath(),
        exportedByUserId: user.id,
      },
    })

    return { canceled: false, filePath: result.filePath, relaunching: false }
  },

  async importDatabase(): Promise<DatabaseTransferResult> {
    requireSystemAccess()
    const result = await dialog.showOpenDialog({
      title: 'Importar base de datos',
      properties: ['openFile'],
      filters: [{ name: 'Base de datos SQLite', extensions: ['db', 'sqlite', 'sqlite3'] }],
    })

    const selectedFile = result.filePaths[0]
    if (result.canceled || !selectedFile) {
      return { canceled: true, filePath: null, relaunching: false }
    }

    if (!existsSync(selectedFile)) {
      throw new Error('database_file_not_found')
    }

    validateImportedDatabase(selectedFile)
    replaceDatabaseFromFile(selectedFile)

    setTimeout(() => {
      app.relaunch()
      app.exit(0)
    }, 150)

    return { canceled: false, filePath: selectedFile, relaunching: true }
  },
}
