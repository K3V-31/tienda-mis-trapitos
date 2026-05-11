import { getDb } from '../db/client'
import { auditLog } from '../db/schema'
import { requireAuth } from '../session'

type AuditEntry = {
  action: string
  entity: string
  entityId?: number | null
  payload: unknown
}

export async function writeAuditLog(entry: AuditEntry) {
  const user = requireAuth()
  const db = getDb()

  await db.insert(auditLog).values({
    userId: user.id,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId ?? null,
    payload: JSON.stringify(entry.payload),
  })
}
