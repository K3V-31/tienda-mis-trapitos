import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { systemService } from '../services/system.service'

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'unknown_error'
}

export function registerSystemHandlers() {
  ipcMain.handle(IPC.system.exportDatabase, async () => {
    try {
      return { ok: true, data: await systemService.exportDatabase() }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })

  ipcMain.handle(IPC.system.importDatabase, async () => {
    try {
      return { ok: true, data: await systemService.importDatabase() }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })
}
