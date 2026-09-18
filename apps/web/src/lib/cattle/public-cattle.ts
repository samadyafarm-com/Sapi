import { Prisma, Status } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'

// Enough weigh-ins for the catalog cards' ADG / progress numbers. The full
// history is only loaded (getPublicCattleDetail) for the cattle being viewed.
const CARD_WEIGHT_HISTORY = 20

interface PublicCattleListOptions {
  status?: Status[]
  excludeStatus?: Status[]
  limit?: number
}

/**
 * Cattle list for the public landing page and catalog: card fields plus
 * recent weigh-ins - no health/feed/gallery history, which is fetched per
 * cattle when it's selected. Never includes internal cost/margin fields.
 */
export async function getPublicCattleList({ status, excludeStatus, limit }: PublicCattleListOptions = {}) {
  const cattle = await prisma.cattle.findMany({
    where: status?.length
      ? { status: { in: status } }
      : excludeStatus?.length
        ? { status: { notIn: excludeStatus } }
        : undefined,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      weights: {
        orderBy: { measurementDate: 'desc' },
        take: CARD_WEIGHT_HISTORY,
      },
      // Only needed as the thumbnail fallback when no dedicated mainImage
      // was set (e.g. photos/videos added only via the Dokumentasi tab)
      media: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { fileUrl: true },
      },
    },
  })

  return cattle.map(({ weights, media, buyPrice, sellPrice, healthCost, feedCost, ...c }) => ({
    ...c,
    mainImage: c.mainImage || media[0]?.fileUrl || null,
    lastWeight: weights[0]?.weight || null,
    weights,
  }))
}

/**
 * One cattle's full public profile: complete weigh-in, health, feed and
 * gallery history. Never includes internal cost/margin fields.
 */
export async function getPublicCattleDetail(where: Prisma.CattleWhereUniqueInput) {
  const cattle = await prisma.cattle.findUnique({
    where,
    include: {
      weights: {
        orderBy: { measurementDate: 'asc' },
        include: {
          media: true,
        },
      },
      healthRecords: {
        orderBy: { recordDate: 'desc' },
        include: {
          media: true,
        },
      },
      feedRecords: {
        orderBy: { recordDate: 'desc' },
      },
      media: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })
  if (!cattle) return null

  const { buyPrice, sellPrice, healthCost, feedCost, ...publicCattle } = cattle
  return publicCattle
}
