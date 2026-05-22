import { getDb } from '../db/client'
import { auditLog } from '../db/schema'
import { requireAuth } from '../session'

type AuditExecutor = Pick<ReturnType<typeof getDb>, 'insert'>

type AuditEntry = {
  action: string
  entity: string
  entityId?: number | null
  payload: unknown
  userId?: number
}

export async function writeAuditLog(entry: AuditEntry, executor: AuditExecutor = getDb()) {
  // Si el caller ya provee userId (como hace salesService.checkout), lo usamos directamente
  // sin requerir que la sesión esté activa en este contexto.
  const userId = entry.userId ?? requireAuth().id

  await executor.insert(auditLog).values({
    userId,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId ?? null,
    payload: JSON.stringify(entry.payload),
  })
}
