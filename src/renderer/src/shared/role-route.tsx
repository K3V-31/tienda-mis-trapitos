import type { UserRole } from '../../../shared/types'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './auth-context'

export function RoleRoute({ allowedRoles }: { allowedRoles: UserRole[] }) {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(user.role)) {
    const fallback = user.role === 'vendor' ? '/pos' : user.role === 'stock' ? '/products' : '/dashboard'
    return <Navigate to={fallback} replace />
  }

  return <Outlet />
}
