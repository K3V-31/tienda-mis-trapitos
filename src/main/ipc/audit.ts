import { ipcMain } from 'electron'
import { z } from 'zod'
import { IPC } from '../../shared/ipc-channels'
import { auditLogService } from '../services/audit-log.service'

function normalizeError(error: unknown) {
  if (error instanceof z.ZodError) {
    return 'validation_error'
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'unknown_error'
}

const AuditFiltersSchema = z.object({
  userId: z.number().int().positive().nullable().optional(),
  action: z.string().trim().min(1).nullable().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
})

export function registerAuditHandlers() {
  ipcMain.handle(IPC.audit.list, async (_event, rawInput) => {
    try {
      const input = AuditFiltersSchema.parse(rawInput ?? {})
      return { ok: true, data: await auditLogService.list(input) }
    } catch (error) {
      return { ok: false, error: normalizeError(error) }
    }
  })
}
