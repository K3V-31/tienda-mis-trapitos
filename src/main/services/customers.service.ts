import { and, asc, count, desc, eq, like, or, sql } from 'drizzle-orm'
import type {
  CreateCustomerInput,
  Customer,
  CustomerFilters,
  CustomerSaleSummary,
  UpdateCustomerInput,
} from '../../shared/types'
import { getDb } from '../db/client'
import { customers, saleItems, sales } from '../db/schema'
import { requireAuth, requireRole } from '../session'
import { writeAuditLog } from './audit.service'

function requireCustomerAccess() {
  const user = requireAuth()
  return requireRole(user, ['admin', 'vendor'])
}

function normalizeText(value?: string | null) {
  const normalized = value?.trim() ?? ''
  return normalized.length > 0 ? normalized : null
}

async function getCustomerById(customerId: number) {
  const db = getDb()
  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, customerId),
  })

  if (!customer) {
    throw new Error('customer_not_found')
  }

  return customer
}

export const customersService = {
  async list(filters: CustomerFilters = {}): Promise<Customer[]> {
    requireCustomerAccess()
    const db = getDb()
    const conditions = []
    const search = filters.search?.trim()

    if (search) {
      const term = `%${search}%`
      conditions.push(or(like(customers.name, term), like(customers.phone, term)))
    }

    const rows = await db
      .select({
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        email: customers.email,
        address: customers.address,
        purchasesCount: count(sales.id),
        lastPurchaseAt: sql<string | null>`max(${sales.createdAt})`,
        createdAt: customers.createdAt,
        updatedAt: customers.updatedAt,
      })
      .from(customers)
      .leftJoin(sales, eq(sales.customerId, customers.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(customers.id)
      .orderBy(asc(customers.name), asc(customers.id))

    return rows.map((row) => ({
      ...row,
      purchasesCount: Number(row.purchasesCount),
    }))
  },

  async create(input: CreateCustomerInput) {
    requireCustomerAccess()
    const db = getDb()

    const result = await db
      .insert(customers)
      .values({
        name: input.name.trim(),
        phone: normalizeText(input.phone),
        email: normalizeText(input.email),
        address: normalizeText(input.address),
      })
      .returning()

    const customer = result[0]

    await writeAuditLog({
      action: 'create',
      entity: 'customer',
      entityId: customer.id,
      payload: {
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
      },
    })

    return {
      ...customer,
      purchasesCount: 0,
      lastPurchaseAt: null,
    }
  },

  async update(input: UpdateCustomerInput) {
    requireCustomerAccess()
    const db = getDb()
    const currentCustomer = await getCustomerById(input.id)

    const result = await db
      .update(customers)
      .set({
        name: input.name.trim(),
        phone: normalizeText(input.phone),
        email: normalizeText(input.email),
        address: normalizeText(input.address),
      })
      .where(eq(customers.id, input.id))
      .returning()

    const customer = result[0]

    await writeAuditLog({
      action: 'update',
      entity: 'customer',
      entityId: customer.id,
      payload: {
        previous: {
          name: currentCustomer.name,
          phone: currentCustomer.phone,
          email: currentCustomer.email,
          address: currentCustomer.address,
        },
        next: {
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
        },
      },
    })

    const history = await this.history(customer.id)

    return {
      ...customer,
      purchasesCount: history.length,
      lastPurchaseAt: history[0]?.createdAt ?? null,
    }
  },

  async history(customerId: number): Promise<CustomerSaleSummary[]> {
    requireCustomerAccess()
    const db = getDb()
    await getCustomerById(customerId)

    const rows = await db
      .select({
        saleId: sales.id,
        totalInCents: sales.total,
        paymentMethod: sales.paymentMethod,
        createdAt: sales.createdAt,
        itemCount: sql<number>`coalesce(sum(${saleItems.quantity}), 0)`,
      })
      .from(sales)
      .leftJoin(saleItems, eq(saleItems.saleId, sales.id))
      .where(eq(sales.customerId, customerId))
      .groupBy(sales.id)
      .orderBy(desc(sales.createdAt), desc(sales.id))

    return rows.map((row) => ({
      ...row,
      itemCount: Number(row.itemCount),
    }))
  },
}
