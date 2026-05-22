import { useEffect, useState } from 'react'
import type { Category, InventoryMovement, Product, Supplier } from '../../../../shared/types'
import { stockAdjustmentSchema, stockEntrySchema } from '@/features/inventory/schemas'
import { useAuth } from '@/shared/auth-context'

type EntryFormState = {
  productId: string
  quantity: string
  note: string
}

type AdjustmentFormState = {
  productId: string
  delta: string
  note: string
}

const defaultEntryForm: EntryFormState = {
  productId: '',
  quantity: '',
  note: '',
}

const defaultAdjustmentForm: AdjustmentFormState = {
  productId: '',
  delta: '',
  note: '',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getErrorMessage(error: string) {
  switch (error) {
    case 'validation_error':
      return 'Hay datos inválidos en el formulario de inventario.'
    case 'empty_stock_entry':
      return 'Agregá al menos un producto para registrar entrada.'
    case 'invalid_stock_quantity':
      return 'La cantidad de entrada debe ser un entero positivo.'
    case 'invalid_adjustment_delta':
      return 'El ajuste debe ser un entero distinto de cero.'
    case 'invalid_adjustment_note':
      return 'El ajuste necesita un motivo claro.'
    case 'negative_stock':
      return 'Ese ajuste dejaría el stock en negativo. Así no se opera un inventario serio.'
    case 'product_not_found':
      return 'El producto seleccionado ya no existe. Recargá la lista.'
    case 'forbidden':
      return 'Tu rol no tiene permiso para esa operación de inventario.'
    case 'unauthorized':
      return 'La sesión expiró. Volvé a iniciar sesión.'
    default:
      return 'No se pudo registrar el movimiento de inventario.'
  }
}

function getReasonLabel(reason: InventoryMovement['reason']) {
  switch (reason) {
    case 'entry':
      return 'Entrada'
    case 'adjustment':
      return 'Ajuste'
    case 'sale':
      return 'Venta'
  }
}

export function InventoryPage() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [supplierFilter, setSupplierFilter] = useState('all')
  const [entryForm, setEntryForm] = useState<EntryFormState>(defaultEntryForm)
  const [adjustmentForm, setAdjustmentForm] = useState<AdjustmentFormState>(defaultAdjustmentForm)
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    setError(null)

    const [categoriesResponse, suppliersResponse, productsResponse, movementsResponse] = await Promise.all([
      window.api.catalog.listCategories(),
      window.api.catalog.listSuppliers(),
      window.api.catalog.listProducts({
        search,
        categoryId: categoryFilter === 'all' ? null : Number(categoryFilter),
        supplierId: supplierFilter === 'all' ? null : Number(supplierFilter),
        active: 'all',
      }),
      window.api.inventory.listMovements(),
    ])

    if (!categoriesResponse.ok) {
      setError(getErrorMessage(categoriesResponse.error))
      setLoading(false)
      return
    }

    if (!suppliersResponse.ok) {
      setError(getErrorMessage(suppliersResponse.error))
      setLoading(false)
      return
    }

    if (!productsResponse.ok) {
      setError(getErrorMessage(productsResponse.error))
      setLoading(false)
      return
    }

    if (!movementsResponse.ok) {
      setError(getErrorMessage(movementsResponse.error))
      setLoading(false)
      return
    }

    setCategories(categoriesResponse.data)
    setSuppliers(suppliersResponse.data)
    setProducts(productsResponse.data)
    setMovements(movementsResponse.data)
    setLoading(false)
  }

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    void loadData()
  }, [search, categoryFilter, supplierFilter])

  const handleEntrySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedback(null)
    setError(null)

    const parsed = stockEntrySchema.safeParse(entryForm)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisá la entrada de stock.')
      return
    }

    const response = await window.api.inventory.createEntry({
      items: [{ productId: Number(parsed.data.productId), quantity: Number(parsed.data.quantity) }],
      note: parsed.data.note || null,
    })

    if (!response.ok) {
      setError(getErrorMessage(response.error))
      return
    }

    setEntryForm(defaultEntryForm)
    setFeedback('Entrada registrada y stock actualizado.')
    await loadData()
  }

  const handleAdjustmentSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedback(null)
    setError(null)

    const parsed = stockAdjustmentSchema.safeParse(adjustmentForm)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisá el ajuste manual.')
      return
    }

    const response = await window.api.inventory.createAdjustment({
      productId: Number(parsed.data.productId),
      delta: Number(parsed.data.delta),
      note: parsed.data.note,
    })

    if (!response.ok) {
      setError(getErrorMessage(response.error))
      return
    }

    setAdjustmentForm(defaultAdjustmentForm)
    setFeedback('Ajuste manual aplicado y auditado.')
    await loadData()
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">Inventario</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Inventario y movimientos</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          El stock no se “arregla” tocando un número. Se mueve con entradas, ventas y ajustes auditados. Si no, después nadie sabe qué pasó.
        </p>
        {error ? <p className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}
        {feedback ? <p className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{feedback}</p> : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h3 className="text-xl font-semibold text-white">Entrada de mercadería</h3>
            <p className="mt-1 text-sm text-slate-400">Registrá las unidades recibidas de reposición. El movimiento queda registrado en el historial.</p>

            <form className="mt-5 space-y-3" onSubmit={handleEntrySubmit}>
              <label className="block space-y-2 text-sm text-slate-300">
                <span>Producto</span>
                <select value={entryForm.productId} onChange={(event) => setEntryForm((current) => ({ ...current, productId: event.target.value }))} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400">
                  <option value="">Seleccioná un producto</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} · Stock {product.stock}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2 text-sm text-slate-300">
                <span>Cantidad</span>
                <input value={entryForm.quantity} onChange={(event) => setEntryForm((current) => ({ ...current, quantity: event.target.value }))} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="12" />
              </label>

              <label className="block space-y-2 text-sm text-slate-300">
                <span>Referencia / nota</span>
                <textarea value={entryForm.note} onChange={(event) => setEntryForm((current) => ({ ...current, note: event.target.value }))} className="min-h-24 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="Ej: Remito 328 / proveedor mayorista" />
              </label>

              <button type="submit" className="w-full rounded-2xl bg-emerald-500 px-4 py-3 font-medium text-slate-950 transition hover:bg-emerald-400">
                Registrar entrada
              </button>
            </form>
          </div>

          {user?.role === 'admin' ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
              <h3 className="text-xl font-semibold text-white">Ajuste manual</h3>
              <p className="mt-1 text-sm text-slate-400">Solo disponible para administradores. Usalo para corregir diferencias por mermas, robos o conteos físicos. El motivo es obligatorio.</p>

              <form className="mt-5 space-y-3" onSubmit={handleAdjustmentSubmit}>
                <label className="block space-y-2 text-sm text-slate-300">
                  <span>Producto</span>
                  <select value={adjustmentForm.productId} onChange={(event) => setAdjustmentForm((current) => ({ ...current, productId: event.target.value }))} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400">
                    <option value="">Seleccioná un producto</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} · Stock {product.stock}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2 text-sm text-slate-300">
                  <span>Delta</span>
                  <input value={adjustmentForm.delta} onChange={(event) => setAdjustmentForm((current) => ({ ...current, delta: event.target.value }))} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="-2 o 5" />
                </label>

                <label className="block space-y-2 text-sm text-slate-300">
                  <span>Motivo</span>
                  <textarea value={adjustmentForm.note} onChange={(event) => setAdjustmentForm((current) => ({ ...current, note: event.target.value }))} className="min-h-24 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="Ej: rotura detectada en conteo físico" />
                </label>

                <button type="submit" className="w-full rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 font-medium text-amber-100 transition hover:bg-amber-500/20">
                  Aplicar ajuste
                </button>
              </form>
            </div>
          ) : null}
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="grid gap-3 lg:grid-cols-3">
              <label className="space-y-2 text-sm text-slate-300">
                <span className="block">Buscar</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="Producto o categoría" />
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span className="block">Categoría</span>
                <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400">
                  <option value="all">Todas</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span className="block">Proveedor</span>
                <select value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400">
                  <option value="all">Todos</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h3 className="text-xl font-semibold text-white">Stock disponible</h3>
            <p className="mt-1 text-sm text-slate-400">Los productos con menos de 5 unidades quedan marcados para reposición rápida.</p>

            {loading ? <p className="mt-5 text-sm text-slate-400">Cargando inventario...</p> : null}

            <div className="mt-5 space-y-3">
              {!loading && products.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-700 px-4 py-5 text-sm text-slate-400">No hay productos para este filtro.</p> : null}
              {products.map((product) => (
                <article key={product.id} className={`rounded-2xl border p-4 ${product.stock < 5 ? 'border-amber-500/30 bg-amber-500/5' : 'border-slate-800 bg-slate-950/70'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="font-medium text-white">{product.name}</h4>
                      <p className="text-sm text-slate-400">
                        {product.categoryName} · {product.supplierName ?? 'Sin proveedor'} · {product.active ? 'Activo' : 'Inactivo'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-semibold ${product.stock < 5 ? 'text-amber-200' : 'text-emerald-300'}`}>Stock {product.stock}</p>
                      {product.stock < 5 ? <p className="text-xs text-amber-200">Reposición sugerida</p> : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h3 className="text-xl font-semibold text-white">Movimientos recientes</h3>
            <div className="mt-5 space-y-3">
              {movements.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-700 px-4 py-5 text-sm text-slate-400">Todavía no hay movimientos registrados.</p> : null}
              {movements.map((movement) => (
                <article key={movement.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-medium text-white">{movement.productName}</h4>
                        <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">{movement.categoryName}</span>
                        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">{getReasonLabel(movement.reason)}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-400">{formatDate(movement.createdAt)} · {movement.userName}</p>
                      {movement.note ? <p className="mt-2 text-sm text-slate-300">{movement.note}</p> : null}
                    </div>
                    <span className={`rounded-full px-3 py-2 text-sm font-semibold ${movement.delta > 0 ? 'bg-emerald-500/10 text-emerald-200' : 'bg-rose-500/10 text-rose-200'}`}>
                      {movement.delta > 0 ? `+${movement.delta}` : movement.delta}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
