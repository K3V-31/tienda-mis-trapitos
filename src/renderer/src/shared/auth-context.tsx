import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ChangePasswordInput, LoginInput, SessionUser } from '../../../shared/types'

type AuthContextValue = {
  user: SessionUser | null
  loading: boolean
  login: (input: LoginInput) => Promise<{ ok: true } | { ok: false; error: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  changePassword: (input: ChangePasswordInput) => Promise<{ ok: true } | { ok: false; error: string }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    setLoading(true)
    const response = await window.api.auth.currentUser()

    if (response.ok) {
      setUser(response.data)
    } else {
      setUser(null)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    void refreshUser()
  }, [refreshUser])

  const login = useCallback(async (input: LoginInput) => {
    const response = await window.api.auth.login(input)

    if (!response.ok) {
      return { ok: false as const, error: response.error }
    }

    setUser(response.data)
    return { ok: true as const }
  }, [])

  const logout = useCallback(async () => {
    await window.api.auth.logout()
    setUser(null)
  }, [])

  const changePassword = useCallback(async (input: ChangePasswordInput) => {
    const response = await window.api.auth.changePassword(input)

    if (!response.ok) {
      return { ok: false as const, error: response.error }
    }

    setUser(response.data)
    return { ok: true as const }
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      refreshUser,
      changePassword,
    }),
    [changePassword, loading, login, logout, refreshUser, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
