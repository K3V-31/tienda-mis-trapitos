import { ipcMain } from 'electron'
import { z } from 'zod'
import { IPC } from '../../shared/ipc-channels'
import { usersService } from '../services/users.service'

const CreateUserSchema = z.object({
  username: z.string().trim().min(3),
  name: z.string().trim().min(1),
  role: z.enum(['admin', 'vendor', 'stock']),
  password: z.string().min(8),
})

const SetUserActiveSchema = z.object({
  id: z.number().int().positive(),
  active: z.boolean(),
})

const ResetPasswordSchema = z.object({
  id: z.number().int().positive(),
  newPassword: z.string().min(8),
})

function normalizeError(error: unknown) {
  if (error instanceof z.ZodError) return 'validation_error'
  if (error instanceof Error) return error.message
  return 'unknown_error'
}

export function registerUsersHandlers() {
  ipcMain.handle(IPC.users.list, async () => {
    try {
      const data = await usersService.list()
      return { ok: true, data }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })

  ipcMain.handle(IPC.users.create, async (_event, rawInput) => {
    try {
      const input = CreateUserSchema.parse(rawInput)
      const data = await usersService.create(input)
      return { ok: true, data }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })

  ipcMain.handle(IPC.users.setActive, async (_event, rawInput) => {
    try {
      const input = SetUserActiveSchema.parse(rawInput)
      const data = await usersService.setActive(input)
      return { ok: true, data }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })

  ipcMain.handle(IPC.users.resetPassword, async (_event, rawInput) => {
    try {
      const input = ResetPasswordSchema.parse(rawInput)
      const data = await usersService.resetPassword(input)
      return { ok: true, data }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })
}
