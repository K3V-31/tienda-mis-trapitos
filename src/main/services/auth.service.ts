import bcrypt from 'bcrypt'
import { eq } from 'drizzle-orm'
import type { ChangePasswordInput, LoginInput, SessionUser } from '../../shared/types'
import { getDb } from '../db/client'
import { users, type UserRow } from '../db/schema'
import { clearSession, getCurrentUser, setCurrentUser } from '../session'

function toSessionUser(user: UserRow): SessionUser {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    active: user.active,
    mustChangePassword: user.mustChangePassword,
  }
}

export const authService = {
  async login(input: LoginInput) {
    const db = getDb()
    const user = await db.query.users.findFirst({
      where: eq(users.username, input.username),
    })

    if (!user || !user.active) {
      throw new Error('invalid_credentials')
    }

    const validPassword = await bcrypt.compare(input.password, user.passwordHash)

    if (!validPassword) {
      throw new Error('invalid_credentials')
    }

    const sessionUser = toSessionUser(user)
    setCurrentUser(sessionUser)

    return sessionUser
  },

  getCurrentUser() {
    return getCurrentUser()
  },

  logout() {
    clearSession()
  },

  async changePassword(input: ChangePasswordInput) {
    const db = getDb()
    const sessionUser = getCurrentUser()

    if (!sessionUser) {
      throw new Error('unauthorized')
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, sessionUser.id),
    })

    if (!user || !user.active) {
      clearSession()
      throw new Error('unauthorized')
    }

    const validPassword = await bcrypt.compare(input.currentPassword, user.passwordHash)

    if (!validPassword) {
      throw new Error('invalid_credentials')
    }

    const passwordHash = await bcrypt.hash(input.newPassword, 10)

    await db
      .update(users)
      .set({
        passwordHash,
        mustChangePassword: false,
      })
      .where(eq(users.id, user.id))

    const updatedSessionUser = {
      ...sessionUser,
      mustChangePassword: false,
    }

    setCurrentUser(updatedSessionUser)

    return updatedSessionUser
  },
}
