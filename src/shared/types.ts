export type UserRole = 'admin' | 'vendor' | 'stock'

export type SessionUser = {
  id: number
  username: string
  name: string
  role: UserRole
  active: boolean
  mustChangePassword: boolean
}

export type ApiSuccess<T> = {
  ok: true
  data: T
}

export type ApiError = {
  ok: false
  error: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

export type LoginInput = {
  username: string
  password: string
}

export type ChangePasswordInput = {
  currentPassword: string
  newPassword: string
}
