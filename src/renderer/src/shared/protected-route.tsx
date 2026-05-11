import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './auth-context'

export function ProtectedRoute() {
  const { loading, user } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-50">
        <div className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Mis Trapitos POS</p>
          <p className="text-lg font-medium">Cargando sesión...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }

  return <Outlet />
}
