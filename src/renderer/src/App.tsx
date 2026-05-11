import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/pages/login/LoginPage'
import { ChangePasswordPage } from '@/pages/login/ChangePasswordPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { CatalogPage } from '@/pages/catalog/CatalogPage'
import { SuppliersPage } from '@/pages/catalog/SuppliersPage'
import { CustomersPage } from '@/pages/customers/CustomersPage'
import { InventoryPage } from '@/pages/inventory/InventoryPage'
import { OffersPage } from '@/pages/offers/OffersPage'
import { PosPage } from '@/pages/pos/PosPage'
import { useAuth } from '@/shared/auth-context'
import { AppLayout } from '@/shared/layout'
import { ProtectedRoute } from '@/shared/protected-route'
import { RoleRoute } from '@/shared/role-route'

function HomeRedirect() {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.role === 'vendor') {
    return <Navigate to="/pos" replace />
  }

  if (user.role === 'stock') {
    return <Navigate to="/products" replace />
  }

  return <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route element={<AppLayout />}>
          <Route element={<RoleRoute allowedRoles={['admin']} />}>
            <Route path="/dashboard" element={<PlaceholderPage title="Dashboard administrativo" description="Entrada principal del administrador. Desde acá arranca la configuración del sistema y la supervisión de la operación." bullets={["Gestión de usuarios (próxima subfase)", "Resumen de ventas e inventario", "Acceso a auditoría y backup"]} />} />
            <Route path="/users" element={<PlaceholderPage title="Gestión de usuarios" description="El shell ya respeta roles y navegación. La pantalla queda lista para implementar ABM de usuarios en la siguiente iteración." bullets={["Crear usuarios admin, vendor y stock", "Resetear contraseñas", "Desactivar usuarios sin romper el último admin"]} />} />
            <Route path="/reports" element={<PlaceholderPage title="Reportes" description="Vista reservada para reportes básicos del admin. No mezclamos alcance: primero acceso y shell, después features." bullets={["Ventas del día", "Ventas del mes", "Totales por método de pago"]} />} />
            <Route path="/audit" element={<PlaceholderPage title="Auditoría" description="Canal reservado para trazabilidad administrativa. La arquitectura ya deja el lugar correcto para meter el módulo cuando toque." bullets={["Listado de eventos críticos", "Filtros por usuario y fecha", "Payload resumido sin secretos"]} />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['admin', 'vendor']} />}>
            <Route path="/pos" element={<PosPage />} />
            <Route path="/customers" element={<CustomersPage />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['admin', 'stock']} />}>
            <Route path="/products" element={<CatalogPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/offers" element={<OffersPage />} />
          </Route>

          <Route path="/" element={<HomeRedirect />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
