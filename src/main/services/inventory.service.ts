import { asc, desc, eq, inArray } from 'drizzle-orm'
import type { CreateStockAdjustmentInput, CreateStockEntryInput, InventoryMovement } from '../../shared/types'
import { getDb } from '../db/client'
import { categories, products, stockMovements, users } from '../db/schema'
import { requireAuth, requireRole } from '../session'
import { writeAuditLog } from './audit.service'

function requireInventoryAccess() {
  const user = requireAuth()
  return requireRole(user, ['admin', 'stock'])
}

function requireInventoryAdjustmentAccess() {
  const user = requireAuth()
  return requireRole(user, ['admin'])
}

function normalizeEntryItems(items: CreateStockEntryInput['items']) {
  const quantities = new Map<number, number>()

  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error('invalid_stock_quantity')
    }

    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity)
  }

  return Array.from(quantities.entries()).map(([productId, quantity]) => ({ productId, quantity }))
}

export const inventoryService = {
  async listRecentMovements(limit = 30): Promise<InventoryMovement[]> {
    requireInventoryAccess()
    const db = getDb()

    return db
      .select({
        id: stockMovements.id,
        productId: stockMovements.productId,
        productName: products.name,
        categoryName: categories.name,
        delta: stockMovements.delta,
        reason: stockMovements.reason,
        note: stockMovements.note,
        referenceId: stockMovements.referenceId,
        userName: users.name,
        createdAt: stockMovements.createdAt,
      })
      .from(stockMovements)
      .innerJoin(products, eq(products.id, stockMovements.productId))
      .innerJoin(categories, eq(categories.id, products.categoryId))
      .innerJoin(users, eq(users.id, stockMovements.userId))
      .orderBy(desc(stockMovements.id), desc(stockMovements.createdAt), asc(products.name))
      .limit(limit)
  },

  async createEntry(input: CreateStockEntryInput) {
    const user = requireInventoryAccess()
    const db = getDb()
    const items = normalizeEntryItems(input.items)

    if (items.length === 0) {
      throw new Error('empty_stock_entry')
    }

    const note = input.note?.trim() || null

    // Cargar productos
    const loadedProducts = await db.query.products.findMany({
      where: inArray(products.id, items.map((item) => item.productId)),
    })

    if (loadedProducts.length !== items.length) {
      throw new Error('product_not_found')
    }

    const productsById = new Map(loadedProducts.map((product) => [product.id, product]))

    // Insertar movimientos y actualizar stock
    for (const item of items) {
      const product = productsById.get(item.productId)

      if (!product) {
        throw new Error('product_not_found')
      }

      await db.insert(stockMovements).values({
        productId: product.id,
        userId: user.id,
        delta: item.quantity,
        reason: 'entry',
        note,
      })

      await db
        .update(products)
        .set({ stock: product.stock + item.quantity })
        .where(eq(products.id, product.id))
    }

    await writeAuditLog({
      action: 'create',
      entity: 'inventory_entry',
      payload: {
        note,
        items: loadedProducts.map((product) => {
          const entry = items.find((item) => item.productId === product.id)
          return {
            productId: product.id,
            productName: product.name,
            quantity: entry?.quantity ?? 0,
          }
        }),
      },
      userId: user.id,
    })

    return { processedCount: items.length }
  },

  async createAdjustment(input: CreateStockAdjustmentInput) {
    const user = requireInventoryAdjustmentAccess()
    const db = getDb()
    const note = input.note.trim()

    if (!Number.isInteger(input.delta) || input.delta === 0) {
      throw new Error('invalid_adjustment_delta')
    }

    if (note.length === 0) {
      throw new Error('invalid_adjustment_note')
    }

    const product = await db.query.products.findFirst({
      where: eq(products.id, input.productId),
    })

    if (!product) {
      throw new Error('product_not_found')
    }

    const nextStock = product.stock + input.delta
    if (nextStock < 0) {
      throw new Error('negative_stock')
    }

    await db.insert(stockMovements).values({
      productId: product.id,
      userId: user.id,
      delta: input.delta,
      reason: 'adjustment',
      note,
    })

    await db.update(products).set({ stock: nextStock }).where(eq(products.id, product.id))

    await writeAuditLog({
      action: 'adjust',
      entity: 'inventory',
      entityId: product.id,
      payload: {
        productId: product.id,
        productName: product.name,
        delta: input.delta,
        nextStock,
        note,
      },
      userId: user.id,
    })

    return { productId: product.id, stock: nextStock }
  },
}
