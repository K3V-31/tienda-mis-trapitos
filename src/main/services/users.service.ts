import bcrypt from 'bcrypt'
import { eq, ne } from 'drizzle-orm'
import type { CreateUserInput, ResetUserPasswordInput, SetUserActiveInput, UserListItem } from '../../shared/types'
import { getDb } from '../db/client'
import { users, type UserRow } from '../db/schema'
import { getCurrentUser } from '../session'

function toUserListItem(user: UserRow): UserListItem {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    active: user.active,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
  }
}

function requireAdmin() {
  const sessionUser = getCurrentUser()
  if (!sessionUser) throw new Error('unauthorized')
  if (sessionUser.role !== 'admin') throw new Error('forbidden')
  return sessionUser
}

export const usersService = {
  async list(): Promise<UserListItem[]> {
    requireAdmin()
    const db = getDb()
    const rows = await db.select().from(users).orderBy(users.createdAt)
    return rows.map(toUserListItem)
  },

  async create(input: CreateUserInput): Promise<UserListItem> {
    const sessionUser = requireAdmin()
    const db = getDb()

    const existing = await db.query.users.findFirst({
      where: eq(users.username, input.username),
    })

    if (existing) throw new Error('username_taken')

    const passwordHash = await bcrypt.hash(input.password, 10)

    const [created] = await db
      .insert(users)
      .values({
        username: input.username,
        name: input.name,
        role: input.role,
        passwordHash,
        mustChangePassword: true,
      })
      .returning()

    if (!created) throw new Error('create_failed')

    void sessionUser
    return toUserListItem(created)
  },

  async setActive(input: SetUserActiveInput): Promise<UserListItem> {
    const sessionUser = requireAdmin()
    const db = getDb()

    if (!input.active) {
      // Prevent deactivating yourself
      if (input.id === sessionUser.id) throw new Error('cannot_deactivate_self')

      // Ensure at least one admin remains active
      const admins = await db.query.users.findMany({
        where: eq(users.role, 'admin'),
      })
      const activeAdmins = admins.filter((u) => u.active)
      const targetIsAdmin = admins.find((u) => u.id === input.id)
      if (targetIsAdmin && activeAdmins.length <= 1) {
        throw new Error('last_admin')
      }
    }

    const [updated] = await db
      .update(users)
      .set({ active: input.active })
      .where(eq(users.id, input.id))
      .returning()

    if (!updated) throw new Error('user_not_found')
    return toUserListItem(updated)
  },

  async resetPassword(input: ResetUserPasswordInput): Promise<UserListItem> {
    requireAdmin()
    const db = getDb()

    const passwordHash = await bcrypt.hash(input.newPassword, 10)

    const [updated] = await db
      .update(users)
      .set({ passwordHash, mustChangePassword: true })
      .where(eq(users.id, input.id))
      .returning()

    if (!updated) throw new Error('user_not_found')
    return toUserListItem(updated)
  },
}
