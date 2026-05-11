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
  const user = requireAuth()

  await executor.insert(auditLog).values({
    userId: entry.userId ?? user.id,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId ?? null,
    payload: JSON.stringify(entry.payload),
  })
}
