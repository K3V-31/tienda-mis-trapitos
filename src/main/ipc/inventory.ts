import { ipcMain } from 'electron'
import { z } from 'zod'
import { IPC } from '../../shared/ipc-channels'
import { inventoryService } from '../services/inventory.service'

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

const StockEntrySchema = z.object({
  items: z.array(
    z.object({
      productId: z.number().int().positive(),
      quantity: z.number().int().positive(),
    }),
  ).min(1),
  note: nullableTrimmedText,
})

const StockAdjustmentSchema = z.object({
  productId: z.number().int().positive(),
  delta: z.number().int().refine((value) => value !== 0, 'invalid_adjustment_delta'),
  note: z.string().trim().min(1).max(240),
})

export function registerInventoryHandlers() {
  ipcMain.handle(IPC.inventory.listMovements, async () => {
    try {
      return { ok: true, data: await inventoryService.listRecentMovements() }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })

  ipcMain.handle(IPC.inventory.createEntry, async (_event, rawInput) => {
    try {
      const input = StockEntrySchema.parse(rawInput)
      return { ok: true, data: await inventoryService.createEntry(input) }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })

  ipcMain.handle(IPC.inventory.createAdjustment, async (_event, rawInput) => {
    try {
      const input = StockAdjustmentSchema.parse(rawInput)
      return { ok: true, data: await inventoryService.createAdjustment(input) }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })
}
