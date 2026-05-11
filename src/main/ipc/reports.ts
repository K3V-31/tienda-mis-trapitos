import { ipcMain } from 'electron'
import { z } from 'zod'
import { IPC } from '../../shared/ipc-channels'
import { reportsService } from '../services/reports.service'

function normalizeError(error: unknown) {
  if (error instanceof z.ZodError) {
    return 'validation_error'
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'unknown_error'
}

const SalesReportFiltersSchema = z.object({
  period: z.enum(['today', 'month', 'custom']),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export function registerReportsHandlers() {
  ipcMain.handle(IPC.reports.salesSummary, async (_event, rawInput) => {
    try {
      const input = SalesReportFiltersSchema.parse(rawInput)
      return { ok: true, data: await reportsService.getSalesReport(input) }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })
}
