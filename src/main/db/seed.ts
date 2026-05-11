import bcrypt from 'bcrypt'
import { sql } from 'drizzle-orm'
import { getDb } from './client'
import { users } from './schema'

const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'admin123',
  name: 'Administrador',
} as const

export async function seedDatabase() {
  const db = getDb()
  const [result] = await db.select({ count: sql<number>`count(*)` }).from(users)

  if ((result?.count ?? 0) > 0) {
    return
  }

  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN.password, 10)

  await db.insert(users).values({
    username: DEFAULT_ADMIN.username,
    passwordHash,
    name: DEFAULT_ADMIN.name,
    role: 'admin',
    active: true,
    mustChangePassword: true,
  })
}
