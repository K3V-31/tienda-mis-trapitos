import type { SessionUser, UserRole } from '../shared/types'

let currentUser: SessionUser | null = null

export function setCurrentUser(user: SessionUser | null) {
  currentUser = user
}

export function getCurrentUser() {
  return currentUser
}

export function clearSession() {
  currentUser = null
}

export function requireAuth() {
  if (!currentUser) {
    throw new Error('unauthorized')
  }

  return currentUser
}

export function requireRole(user: SessionUser, roles: UserRole[]) {
  if (!roles.includes(user.role)) {
    throw new Error('forbidden')
  }

  return user
}
