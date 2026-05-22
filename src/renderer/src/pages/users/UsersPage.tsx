import { useEffect, useState } from 'react'
import type { UserListItem, UserRole } from '../../../../shared/types'
import { useAuth } from '@/shared/auth-context'

type UserFormState = {
  username: string
  name: string
  role: UserRole
  password: string
}

type ResetPasswordFormState = {
  newPassword: string
}

const defaultUserForm: UserFormState = {
  username: '',
  name: '',
  role: 'vendor',
  password: '',
}

const defaultResetForm: ResetPasswordFormState = {
  newPassword: '',
}

function getRoleLabel(role: UserRole) {
  switch (role) {
    case 'admin':
      return 'Administrador'
    case 'vendor':
      return 'Vendedor'
    case 'stock':
      return 'Almacenista'
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'short',
  }).format(new Date(value))
}

function getErrorMessage(error: string) {
  switch (error) {
    case 'username_taken':
      return 'Ya existe un usuario con ese nombre de usuario.'
    case 'cannot_deactivate_self':
      return 'No podés desactivar tu propia cuenta.'
    case 'last_admin':
      return 'No podés desactivar al único administrador activo del sistema.'
    case 'user_not_found':
      return 'El usuario seleccionado ya no existe. Recargá la lista.'
    case 'validation_error':
      return 'Hay datos inválidos en el formulario. Revisalos y probá de nuevo.'
    case 'forbidden':
      return 'Solo el administrador puede gestionar usuarios.'
    case 'unauthorized':
      return 'La sesión expiró. Volvé a iniciar sesión.'
    default:
      return 'No se pudo completar la operación. Intentá de nuevo.'
  }
}

export function UsersPage() {
  const { user: currentUser } = useAuth()
  const [usersList, setUsersList] = useState<UserListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [userForm, setUserForm] = useState<UserFormState>(defaultUserForm)
  const [resetingUserId, setResetingUserId] = useState<number | null>(null)
  const [resetForm, setResetForm] = useState<ResetPasswordFormState>(defaultResetForm)
  const [submittingUser, setSubmittingUser] = useState(false)
  const [submittingReset, setSubmittingReset] = useState(false)

  async function loadUsers() {
    setLoading(true)
    setError(null)
    const response = await window.api.users.list()
    if (!response.ok) {
      setError(getErrorMessage(response.error))
      setLoading(false)
      return
    }
    setUsersList(response.data)
    setLoading(false)
  }

  useEffect(() => {
    void loadUsers()
  }, [])

  const handleUserSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedback(null)
    setError(null)

    if (!userForm.username.trim() || userForm.username.trim().length < 3) {
      setError('El nombre de usuario debe tener al menos 3 caracteres.')
      return
    }
    if (!userForm.name.trim()) {
      setError('El nombre completo es obligatorio.')
      return
    }
    if (userForm.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setSubmittingUser(true)
    const response = await window.api.users.create({
      username: userForm.username.trim(),
      name: userForm.name.trim(),
      role: userForm.role,
      password: userForm.password,
    })
    setSubmittingUser(false)

    if (!response.ok) {
      setError(getErrorMessage(response.error))
      return
    }

    setUserForm(defaultUserForm)
    setFeedback(`Usuario "${response.data.name}" creado. Al iniciar sesión deberá cambiar su contraseña.`)
    await loadUsers()
  }

  const handleToggleActive = async (targetUser: UserListItem) => {
    setFeedback(null)
    setError(null)

    const response = await window.api.users.setActive({ id: targetUser.id, active: !targetUser.active })

    if (!response.ok) {
      setError(getErrorMessage(response.error))
      return
    }

    setFeedback(targetUser.active ? `Usuario "${targetUser.name}" desactivado.` : `Usuario "${targetUser.name}" reactivado.`)
    await loadUsers()
  }

  const handleResetSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!resetingUserId) return
    setFeedback(null)
    setError(null)

    if (resetForm.newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }

    setSubmittingReset(true)
    const response = await window.api.users.resetPassword({ id: resetingUserId, newPassword: resetForm.newPassword })
    setSubmittingReset(false)

    if (!response.ok) {
      setError(getErrorMessage(response.error))
      return
    }

    setResetingUserId(null)
    setResetForm(defaultResetForm)
    setFeedback(`Contraseña restablecida. El usuario deberá cambiarla al iniciar sesión.`)
    await loadUsers()
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">Administración</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Gestión de usuarios</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Creá, desactivá y restablecé contraseñas de los empleados del sistema. Los usuarios nuevos deben cambiar su contraseña al primer inicio de sesión.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
            {usersList.filter((u) => u.active).length} activo{usersList.filter((u) => u.active).length === 1 ? '' : 's'} de {usersList.length} total
          </div>
        </div>

        {error ? <p className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}
        {feedback ? <p className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{feedback}</p> : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h3 className="text-xl font-semibold text-white">Crear usuario</h3>
            <p className="mt-1 text-sm text-slate-400">El rol define los permisos dentro del sistema. La contraseña inicial deberá ser cambiada al primer inicio.</p>

            <form className="mt-5 space-y-3" onSubmit={(event) => void handleUserSubmit(event)}>
              <label className="block space-y-2 text-sm text-slate-300">
                <span>Nombre de usuario</span>
                <input
                  value={userForm.username}
                  onChange={(event) => setUserForm((current) => ({ ...current, username: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                  placeholder="ej: juan.perez"
                />
              </label>

              <label className="block space-y-2 text-sm text-slate-300">
                <span>Nombre completo</span>
                <input
                  value={userForm.name}
                  onChange={(event) => setUserForm((current) => ({ ...current, name: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                  placeholder="ej: Juan Pérez"
                />
              </label>

              <label className="block space-y-2 text-sm text-slate-300">
                <span>Rol</span>
                <select
                  value={userForm.role}
                  onChange={(event) => setUserForm((current) => ({ ...current, role: event.target.value as UserRole }))}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                >
                  <option value="vendor">Vendedor</option>
                  <option value="stock">Almacenista</option>
                  <option value="admin">Administrador</option>
                </select>
              </label>

              <label className="block space-y-2 text-sm text-slate-300">
                <span>Contraseña inicial</span>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                  placeholder="Mínimo 8 caracteres"
                />
              </label>

              <button
                type="submit"
                disabled={submittingUser}
                className="w-full rounded-2xl bg-emerald-500 px-4 py-3 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submittingUser ? 'Creando usuario...' : 'Crear usuario'}
              </button>
            </form>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h3 className="text-xl font-semibold text-white">Usuarios del sistema</h3>
            <p className="mt-1 text-sm text-slate-400">Administrá el acceso de cada empleado. Los usuarios desactivados no pueden iniciar sesión.</p>

            {loading ? <p className="mt-5 text-sm text-slate-400">Cargando usuarios...</p> : null}

            <div className="mt-5 space-y-3">
              {!loading && usersList.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-700 px-4 py-5 text-sm text-slate-400">No hay usuarios registrados.</p>
              ) : null}

              {usersList.map((u) => (
                <article key={u.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-medium text-white">{u.name}</h4>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${u.active ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}>
                          {u.active ? 'Activo' : 'Inactivo'}
                        </span>
                        {u.mustChangePassword ? (
                          <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">
                            Debe cambiar clave
                          </span>
                        ) : null}
                        {u.id === currentUser?.id ? (
                          <span className="rounded-full bg-slate-700 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                            Tú
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-400">@{u.username} · {getRoleLabel(u.role)}</p>
                      <p className="mt-1 text-xs text-slate-500">Creado el {formatDate(u.createdAt)}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setResetingUserId(u.id)
                          setResetForm(defaultResetForm)
                          setError(null)
                          setFeedback(null)
                        }}
                        className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
                      >
                        Restablecer clave
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleToggleActive(u)}
                        disabled={u.id === currentUser?.id}
                        className={`rounded-xl border px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40 ${
                          u.active
                            ? 'border-rose-500/30 text-rose-200 hover:bg-rose-500/10'
                            : 'border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/10'
                        }`}
                      >
                        {u.active ? 'Desactivar' : 'Reactivar'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>

      {resetingUserId !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-black/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-white">Restablecer contraseña</h3>
                <p className="mt-1 text-sm text-slate-400">
                  El usuario de {usersList.find((u) => u.id === resetingUserId)?.name ?? ''} deberá cambiarla al iniciar sesión.
                </p>
              </div>
              <button type="button" onClick={() => setResetingUserId(null)} className="text-sm text-slate-400 hover:text-white">
                Cerrar
              </button>
            </div>

            <form className="mt-5 space-y-3" onSubmit={(event) => void handleResetSubmit(event)}>
              <label className="block space-y-2 text-sm text-slate-300">
                <span>Nueva contraseña temporal</span>
                <input
                  type="password"
                  value={resetForm.newPassword}
                  onChange={(event) => setResetForm({ newPassword: event.target.value })}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                  placeholder="Mínimo 8 caracteres"
                />
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResetingUserId(null)}
                  className="rounded-2xl border border-slate-700 px-4 py-3 text-sm text-slate-100 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingReset}
                  className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submittingReset ? 'Guardando...' : 'Restablecer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
