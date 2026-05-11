import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/pages/login/LoginPage'
import { ChangePasswordPage } from '@/pages/login/ChangePasswordPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
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

          <Route element={<RoleRoute allowedRoles={['vendor']} />}>
            <Route path="/pos" element={<PlaceholderPage title="POS del vendedor" description="La navegación del vendedor ya entra al área correcta. El checkout atómico va en la fase de ventas, no antes." bullets={["Búsqueda de productos", "Carrito con validación de stock", "Ticket post-venta"]} />} />
            <Route path="/customers" element={<PlaceholderPage title="Clientes" description="El módulo de clientes se habilita para vendedor, pero su implementación real se aborda en la fase correspondiente." bullets={["ABM mínimo de clientes", "Búsqueda por nombre o teléfono", "Historial de compras"]} />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['stock']} />}>
            <Route path="/products" element={<PlaceholderPage title="Catálogo y productos" description="El almacenista ya ve su shell de trabajo. Acá entra la siguiente fase completa de catálogo." bullets={["ABM de productos", "ABM de categorías", "Búsqueda y listado"]} />} />
            <Route path="/suppliers" element={<PlaceholderPage title="Proveedores" description="Pantalla lista para recibir ABM de proveedores en la fase de catálogo." bullets={["Alta y edición", "Relación con productos", "Soft delete cuando corresponda"]} />} />
            <Route path="/inventory" element={<PlaceholderPage title="Inventario" description="La sección existe en el shell pero la lógica de movimientos va en una fase posterior." bullets={["Entradas de mercancía", "Ajustes manuales", "Indicadores de stock bajo"]} />} />
            <Route path="/offers" element={<PlaceholderPage title="Ofertas" description="Sección preparada para promociones por producto. La base del flujo por roles ya quedó resuelta." bullets={["Vigencia start/end", "Descuento automático en POS", "Warnings por solapamiento"]} />} />
          </Route>

          <Route path="/" element={<HomeRedirect />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
