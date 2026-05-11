import { ipcMain } from 'electron'
import { z } from 'zod'
import { IPC } from '../../shared/ipc-channels'
import { offersService } from '../services/offers.service'

function normalizeError(error: unknown) {
  if (error instanceof z.ZodError) {
    return 'validation_error'
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'unknown_error'
}

const OfferSchema = z.object({
  productId: z.number().int().positive(),
  discountPercent: z.number().int().min(1).max(99),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
})

const OfferUpdateSchema = OfferSchema.extend({
  id: z.number().int().positive(),
})

const OfferDeleteSchema = z.object({
  id: z.number().int().positive(),
})

const OfferFiltersSchema = z.object({
  productId: z.number().int().positive().nullable().optional(),
  status: z.enum(['all', 'active', 'scheduled', 'expired']).optional(),
})

export function registerOffersHandlers() {
  ipcMain.handle(IPC.offers.list, async (_event, rawInput) => {
    try {
      const input = OfferFiltersSchema.parse(rawInput ?? {})
      return { ok: true, data: await offersService.list(input) }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })

  ipcMain.handle(IPC.offers.create, async (_event, rawInput) => {
    try {
      const input = OfferSchema.parse(rawInput)
      return { ok: true, data: await offersService.create(input) }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })

  ipcMain.handle(IPC.offers.update, async (_event, rawInput) => {
    try {
      const input = OfferUpdateSchema.parse(rawInput)
      return { ok: true, data: await offersService.update(input) }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })

  ipcMain.handle(IPC.offers.delete, async (_event, rawInput) => {
    try {
      const input = OfferDeleteSchema.parse(rawInput)
      return { ok: true, data: await offersService.delete(input) }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })
}
