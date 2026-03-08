import { prisma } from './_lib/prisma.js'
import { requireAuth } from './_lib/auth.js'
import { getEntrepriseByUserAuthId } from './_lib/entreprise.js'

const SOLD_STATUSES = ['ACCEPTED', 'PREPARING', 'READY', 'PICKED_UP']

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }

  const auth = await requireAuth(req, res, { roles: ['ENTREPRISE'] })
  if (!auth) return

  try {
    const entreprise = await getEntrepriseByUserAuthId(auth.userAuthId)
    if (!entreprise) {
      return res.status(404).json({ error: 'Entreprise introuvable' })
    }

    const soldItems = await prisma.orderItem.findMany({
      where: {
        order: {
          sellerEntrepriseId: entreprise.id,
          status: { in: SOLD_STATUSES },
        },
      },
      select: {
        itemType: true,
        itemName: true,
        quantity: true,
        totalPrice: true,
      },
    })

    let totalRevenue = 0
    let totalUnits = 0
    let productUnits = 0
    let menuUnits = 0

    const byItemMap = new Map()

    for (const item of soldItems) {
      const revenue = Number(item.totalPrice)
      totalRevenue += revenue
      totalUnits += item.quantity

      if (item.itemType === 'PRODUCT') productUnits += item.quantity
      if (item.itemType === 'MENU') menuUnits += item.quantity

      const key = `${item.itemType}:${item.itemName}`
      if (!byItemMap.has(key)) {
        byItemMap.set(key, {
          key,
          itemType: item.itemType,
          itemName: item.itemName,
          quantity: 0,
          revenue: 0,
        })
      }

      const current = byItemMap.get(key)
      current.quantity += item.quantity
      current.revenue += revenue
    }

    const byItem = [...byItemMap.values()].sort((a, b) => b.revenue - a.revenue)

    return res.status(200).json({
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalUnits,
      productUnits,
      menuUnits,
      byItem,
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
