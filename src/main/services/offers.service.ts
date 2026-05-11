import { and, desc, eq, inArray } from 'drizzle-orm'
import type { CreateOfferInput, DeleteOfferInput, Offer, OfferFilters, OfferStatus, UpdateOfferInput } from '../../shared/types'
import { getDb } from '../db/client'
import { categories, offers, products } from '../db/schema'
import { requireAuth, requireRole } from '../session'
import { writeAuditLog } from './audit.service'

type OfferCandidate = {
  id: number
  productId: number
  discountPercent: number
  startAt: string
  endAt: string
  createdAt: string
}

function requireOffersAccess() {
  const user = requireAuth()
  return requireRole(user, ['admin', 'stock'])
}

function toTimestamp(value: string) {
  const timestamp = Date.parse(value)

  if (Number.isNaN(timestamp)) {
    throw new Error('invalid_offer_window')
  }

  return timestamp
}

function getOfferStatus(offer: Pick<OfferCandidate, 'startAt' | 'endAt'>, now = Date.now()): OfferStatus {
  const start = toTimestamp(offer.startAt)
  const end = toTimestamp(offer.endAt)

  if (start <= now && now <= end) {
    return 'active'
  }

  if (now < start) {
    return 'scheduled'
  }

  return 'expired'
}

function overlaps(a: Pick<OfferCandidate, 'startAt' | 'endAt'>, b: Pick<OfferCandidate, 'startAt' | 'endAt'>) {
  return toTimestamp(a.startAt) <= toTimestamp(b.endAt) && toTimestamp(b.startAt) <= toTimestamp(a.endAt)
}

function ensureOfferWindow(startAt: string, endAt: string) {
  if (toTimestamp(endAt) <= toTimestamp(startAt)) {
    throw new Error('invalid_offer_window')
  }
}

async function getProductForOffer(productId: number) {
  const db = getDb()
  const product = await db.query.products.findFirst({
    where: eq(products.id, productId),
  })

  if (!product) {
    throw new Error('product_not_found')
  }

  if (!product.active) {
    throw new Error('product_inactive')
  }

  return product
}

async function getOfferById(offerId: number) {
  const db = getDb()
  const offer = await db.query.offers.findFirst({
    where: eq(offers.id, offerId),
  })

  if (!offer) {
    throw new Error('offer_not_found')
  }

  return offer
}

function buildOfferView(
  row: OfferCandidate & { productName: string; categoryName: string },
  siblingOffers: OfferCandidate[],
): Offer {
  return {
    id: row.id,
    productId: row.productId,
    productName: row.productName,
    categoryName: row.categoryName,
    discountPercent: row.discountPercent,
    startAt: row.startAt,
    endAt: row.endAt,
    status: getOfferStatus(row),
    hasOverlap: siblingOffers.some((candidate) => candidate.id !== row.id && overlaps(candidate, row)),
    createdAt: row.createdAt,
  }
}

export async function getActiveOfferMap(
  productIds: number[],
  database: Pick<ReturnType<typeof getDb>, 'query'> = getDb(),
) {
  if (productIds.length === 0) {
    return new Map<number, OfferCandidate>()
  }

  const rows = await database.query.offers.findMany({
    where: inArray(offers.productId, Array.from(new Set(productIds))),
  })

  const now = Date.now()
  const result = new Map<number, OfferCandidate>()

  for (const offer of rows) {
    if (getOfferStatus(offer, now) !== 'active') {
      continue
    }

    const current = result.get(offer.productId)
    if (!current || offer.id > current.id) {
      result.set(offer.productId, offer)
    }
  }

  return result
}

export const offersService = {
  async list(filters: OfferFilters = {}): Promise<Offer[]> {
    requireOffersAccess()
    const db = getDb()
    const conditions = []

    if (typeof filters.productId === 'number') {
      conditions.push(eq(offers.productId, filters.productId))
    }

    const rows = await db
      .select({
        id: offers.id,
        productId: offers.productId,
        productName: products.name,
        categoryName: categories.name,
        discountPercent: offers.discountPercent,
        startAt: offers.startAt,
        endAt: offers.endAt,
        createdAt: offers.createdAt,
      })
      .from(offers)
      .innerJoin(products, eq(products.id, offers.productId))
      .innerJoin(categories, eq(categories.id, products.categoryId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(offers.id))

    const offersByProduct = new Map<number, OfferCandidate[]>()
    for (const row of rows) {
      const group = offersByProduct.get(row.productId) ?? []
      group.push(row)
      offersByProduct.set(row.productId, group)
    }

    const mapped = rows.map((row) => buildOfferView(row, offersByProduct.get(row.productId) ?? []))
    if (!filters.status || filters.status === 'all') {
      return mapped
    }

    return mapped.filter((offer) => offer.status === filters.status)
  },

  async create(input: CreateOfferInput) {
    const user = requireOffersAccess()
    const db = getDb()

    ensureOfferWindow(input.startAt, input.endAt)
    const product = await getProductForOffer(input.productId)

    const inserted = await db
      .insert(offers)
      .values({
        productId: input.productId,
        discountPercent: input.discountPercent,
        startAt: input.startAt,
        endAt: input.endAt,
      })
      .returning()

    const created = inserted[0]

    await writeAuditLog({
      action: 'create',
      entity: 'offer',
      entityId: created.id,
      payload: {
        productId: product.id,
        productName: product.name,
        discountPercent: created.discountPercent,
        startAt: created.startAt,
        endAt: created.endAt,
        userId: user.id,
      },
    })

    return created
  },

  async update(input: UpdateOfferInput) {
    requireOffersAccess()
    const db = getDb()
    const current = await getOfferById(input.id)

    ensureOfferWindow(input.startAt, input.endAt)
    await getProductForOffer(input.productId)

    const updated = await db
      .update(offers)
      .set({
        productId: input.productId,
        discountPercent: input.discountPercent,
        startAt: input.startAt,
        endAt: input.endAt,
      })
      .where(eq(offers.id, input.id))
      .returning()

    await writeAuditLog({
      action: 'update',
      entity: 'offer',
      entityId: input.id,
      payload: {
        previous: current,
        next: updated[0],
      },
    })

    return updated[0]
  },

  async delete(input: DeleteOfferInput) {
    await requireOffersAccess()
    const db = getDb()
    const current = await getOfferById(input.id)

    await db.delete(offers).where(eq(offers.id, input.id))

    await writeAuditLog({
      action: 'delete',
      entity: 'offer',
      entityId: current.id,
      payload: current,
    })

    return { id: input.id }
  },
}
