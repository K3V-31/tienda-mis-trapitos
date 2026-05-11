import { ipcMain } from 'electron'
import { z } from 'zod'
import { IPC } from '../../shared/ipc-channels'
import { authService } from '../services/auth.service'

const LoginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
})

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

function normalizeError(error: unknown) {
  if (error instanceof z.ZodError) {
    return 'validation_error'
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'unknown_error'
}

export function registerAuthHandlers() {
  ipcMain.handle(IPC.auth.login, async (_event, rawInput) => {
    try {
      const input = LoginSchema.parse(rawInput)
      const user = await authService.login(input)
      return { ok: true, data: user }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })

  ipcMain.handle(IPC.auth.logout, async () => {
    try {
      authService.logout()
      return { ok: true, data: null }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })

  ipcMain.handle(IPC.auth.currentUser, async () => {
    try {
      return { ok: true, data: authService.getCurrentUser() }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })

  ipcMain.handle(IPC.auth.changePassword, async (_event, rawInput) => {
    try {
      const input = ChangePasswordSchema.parse(rawInput)
      const user = await authService.changePassword(input)
      return { ok: true, data: user }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })
}
