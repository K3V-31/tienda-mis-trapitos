import { desc, eq } from 'drizzle-orm'
import type { PaymentMethod, SalesReport, SalesReportFilters, SalesReportRow } from '../../shared/types'
import { getDb } from '../db/client'
import { customers, saleItems, sales, users } from '../db/schema'
import { requireAuth, requireRole } from '../session'

function requireReportsAccess() {
  const user = requireAuth()
  return requireRole(user, ['admin'])
}

function toTimestamp(value: string) {
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`
  const timestamp = Date.parse(normalized)

  if (Number.isNaN(timestamp)) {
    throw new Error('invalid_report_date')
  }

  return timestamp
}

function getRange(filters: SalesReportFilters) {
  const now = new Date()

  if (filters.period === 'today') {
    return {
      startAt: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      endAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
      label: 'Ventas del día',
    }
  }

  if (filters.period === 'month') {
    return {
      startAt: new Date(now.getFullYear(), now.getMonth(), 1),
      endAt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      label: 'Ventas del mes',
    }
  }

  if (!filters.startDate || !filters.endDate) {
    throw new Error('invalid_report_range')
  }

  const startAt = new Date(`${filters.startDate}T00:00:00`)
  const endAt = new Date(`${filters.endDate}T00:00:00`)

  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    throw new Error('invalid_report_date')
  }

  if (endAt < startAt) {
    throw new Error('invalid_report_range')
  }

  return {
    startAt,
    endAt: new Date(endAt.getFullYear(), endAt.getMonth(), endAt.getDate() + 1),
    label: 'Rango personalizado',
  }
}

function getDayKey(value: string) {
  const date = new Date(toTimestamp(value))
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const reportsService = {
  async getSalesReport(filters: SalesReportFilters): Promise<SalesReport> {
    requireReportsAccess()
    const db = getDb()
    const range = getRange(filters)

    const rows = await db
      .select({
        saleId: sales.id,
        createdAt: sales.createdAt,
        totalInCents: sales.total,
        paymentMethod: sales.paymentMethod,
        sellerName: users.name,
        customerName: customers.name,
      })
      .from(sales)
      .innerJoin(users, eq(users.id, sales.userId))
      .leftJoin(customers, eq(customers.id, sales.customerId))
      .orderBy(desc(sales.createdAt), desc(sales.id))

    const quantityBySaleId = new Map<number, number>()
    const quantities = await db
      .select({
        saleId: saleItems.saleId,
        quantity: saleItems.quantity,
      })
      .from(saleItems)

    for (const item of quantities) {
      quantityBySaleId.set(item.saleId, (quantityBySaleId.get(item.saleId) ?? 0) + item.quantity)
    }

    const startTimestamp = range.startAt.getTime()
    const endTimestamp = range.endAt.getTime()

    const salesRows: SalesReportRow[] = rows
      .filter((row) => {
        const timestamp = toTimestamp(row.createdAt)
        return timestamp >= startTimestamp && timestamp < endTimestamp
      })
      .map((row) => ({
        saleId: row.saleId,
        createdAt: row.createdAt,
        totalInCents: row.totalInCents,
        paymentMethod: row.paymentMethod,
        sellerName: row.sellerName,
        customerName: row.customerName,
        itemCount: quantityBySaleId.get(row.saleId) ?? 0,
      }))

    const totalsByPaymentMethod: Record<PaymentMethod, number> = {
      cash: 0,
      card: 0,
      transfer: 0,
    }

    const grouped = new Map<string, SalesReportRow[]>()
    let totalInCents = 0

    for (const row of salesRows) {
      totalInCents += row.totalInCents
      totalsByPaymentMethod[row.paymentMethod] += row.totalInCents

      const dayKey = getDayKey(row.createdAt)
      const current = grouped.get(dayKey) ?? []
      current.push(row)
      grouped.set(dayKey, current)
    }

    const groupedByDay = Array.from(grouped.entries())
      .sort(([left], [right]) => right.localeCompare(left))
      .map(([day, entries]) => ({
        day,
        totalInCents: entries.reduce((accumulator, entry) => accumulator + entry.totalInCents, 0),
        sales: entries,
      }))

    return {
      label: range.label,
      period: filters.period,
      startAt: range.startAt.toISOString(),
      endAt: range.endAt.toISOString(),
      totalSalesCount: salesRows.length,
      totalInCents,
      totalsByPaymentMethod,
      groupedByDay,
      sales: salesRows,
    }
  },
}
