import { ipcMain } from 'electron'
import { z } from 'zod'
import { IPC } from '../../shared/ipc-channels'
import { customersService } from '../services/customers.service'

function normalizeError(error: unknown) {
  if (error instanceof z.ZodError) {
    return 'validation_error'
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'unknown_error'
}

const nullableTrimmedText = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== 'string') {
      return null
    }

    const normalized = value.trim()
    return normalized.length > 0 ? normalized : null
  })

const CustomerSchema = z.object({
  name: z.string().trim().min(1).max(140),
  phone: nullableTrimmedText,
  email: nullableTrimmedText.refine((value) => !value || z.email().safeParse(value).success, 'invalid_email'),
  address: nullableTrimmedText,
})

const CustomerUpdateSchema = CustomerSchema.extend({
  id: z.number().int().positive(),
})

const CustomerFiltersSchema = z.object({
  search: z.string().trim().optional(),
})

const CustomerHistorySchema = z.object({
  customerId: z.number().int().positive(),
})

export function registerCustomerHandlers() {
  ipcMain.handle(IPC.customers.list, async (_event, rawInput) => {
    try {
      const input = CustomerFiltersSchema.parse(rawInput ?? {})
      return { ok: true, data: await customersService.list(input) }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })

  ipcMain.handle(IPC.customers.create, async (_event, rawInput) => {
    try {
      const input = CustomerSchema.parse(rawInput)
      return { ok: true, data: await customersService.create(input) }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })

  ipcMain.handle(IPC.customers.update, async (_event, rawInput) => {
    try {
      const input = CustomerUpdateSchema.parse(rawInput)
      return { ok: true, data: await customersService.update(input) }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })

  ipcMain.handle(IPC.customers.history, async (_event, rawInput) => {
    try {
      const input = CustomerHistorySchema.parse(rawInput)
      return { ok: true, data: await customersService.history(input.customerId) }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })
}
