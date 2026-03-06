import { prisma } from '../_lib/prisma.js'
import { requireAuth } from '../_lib/auth.js'
import { getEntrepriseByUserAuthId } from '../_lib/entreprise.js'

const DELIVERY_MODES = {
  WITH_DELIVERY: 'WITH_DELIVERY',
  WITHOUT_DELIVERY: 'WITHOUT_DELIVERY',
}

const ITEM_TYPES = {
  PRODUCT: 'PRODUCT',
  MENU: 'MENU',
}

const toMoney = (value) => Number(Number(value).toFixed(2))

const getPriceByDeliveryMode = (entity, deliveryMode) =>
  deliveryMode === DELIVERY_MODES.WITH_DELIVERY
    ? Number(entity.priceWithDelivery)
    : Number(entity.priceWithoutDelivery)

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const auth = await requireAuth(req, res)
    if (!auth) return

    const scope = String(req.query?.scope || 'all').toLowerCase()

    try {
      const placedPromise = prisma.order.findMany({
        where: { buyerUserAuthId: auth.userAuthId },
        include: {
          sellerEntreprise: {
            select: { id: true, nomEntreprise: true },
          },
          items: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      let receivedPromise = Promise.resolve([])
      if (auth.role === 'ENTREPRISE' && (scope === 'all' || scope === 'received')) {
        receivedPromise = (async () => {
          const entreprise = await getEntrepriseByUserAuthId(auth.userAuthId)
          if (!entreprise) return []

          return prisma.order.findMany({
            where: { sellerEntrepriseId: entreprise.id },
            include: {
              buyerUserAuth: {
                include: {
                  client: {
                    select: { id: true, pseudo: true },
                  },
                  entreprise: {
                    select: { id: true, nomEntreprise: true },
                  },
                },
              },
              items: true,
            },
            orderBy: { createdAt: 'desc' },
          })
        })()
      }

      if (scope === 'placed') {
        const placed = await placedPromise
        return res.status(200).json({ placed, received: [] })
      }

      if (scope === 'received') {
        const received = await receivedPromise
        return res.status(200).json({ placed: [], received })
      }

      const [placed, received] = await Promise.all([placedPromise, receivedPromise])
      return res.status(200).json({ placed, received })
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  if (req.method === 'POST') {
    const auth = await requireAuth(req, res)
    if (!auth) return

    const { sellerEntrepriseId, deliveryMode, receptionDate, buyerNote, items } =
      req.body ?? {}

    if (
      !Number.isInteger(Number(sellerEntrepriseId)) ||
      !Object.values(DELIVERY_MODES).includes(deliveryMode) ||
      !receptionDate ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        error:
          'sellerEntrepriseId, deliveryMode, receptionDate et items sont obligatoires',
      })
    }

    const parsedSellerEntrepriseId = Number(sellerEntrepriseId)
    const parsedReceptionDate = new Date(receptionDate)
    if (Number.isNaN(parsedReceptionDate.getTime())) {
      return res.status(400).json({ error: 'receptionDate invalide' })
    }

    try {
      if (auth.role === 'ENTREPRISE') {
        const buyerEntreprise = await getEntrepriseByUserAuthId(auth.userAuthId)
        if (buyerEntreprise && buyerEntreprise.id === parsedSellerEntrepriseId) {
          return res.status(400).json({
            error: 'Une entreprise ne peut pas commander a elle-meme',
          })
        }
      }

      const seller = await prisma.entreprise.findUnique({
        where: { id: parsedSellerEntrepriseId },
        select: { id: true },
      })
      if (!seller) {
        return res.status(404).json({ error: 'Entreprise vendeuse introuvable' })
      }

      const normalizedItems = items
        .map((item) => ({
          itemType: String(item.itemType || '').toUpperCase(),
          itemId: Number(item.itemId),
          quantity: Math.max(1, Number(item.quantity) || 1),
        }))
        .filter(
          (item) =>
            Object.values(ITEM_TYPES).includes(item.itemType) &&
            Number.isInteger(item.itemId) &&
            item.itemId > 0,
        )

      if (normalizedItems.length === 0) {
        return res.status(400).json({ error: 'Aucun item valide dans la commande' })
      }

      const productIds = [
        ...new Set(
          normalizedItems
            .filter((item) => item.itemType === ITEM_TYPES.PRODUCT)
            .map((item) => item.itemId),
        ),
      ]
      const menuIds = [
        ...new Set(
          normalizedItems
            .filter((item) => item.itemType === ITEM_TYPES.MENU)
            .map((item) => item.itemId),
        ),
      ]

      const [products, menus] = await Promise.all([
        productIds.length
          ? prisma.product.findMany({
              where: {
                id: { in: productIds },
                entrepriseId: parsedSellerEntrepriseId,
                isActive: true,
              },
              select: {
                id: true,
                name: true,
                priceWithDelivery: true,
                priceWithoutDelivery: true,
              },
            })
          : Promise.resolve([]),
        menuIds.length
          ? prisma.menu.findMany({
              where: {
                id: { in: menuIds },
                entrepriseId: parsedSellerEntrepriseId,
                isActive: true,
              },
              select: {
                id: true,
                name: true,
                priceWithDelivery: true,
                priceWithoutDelivery: true,
              },
            })
          : Promise.resolve([]),
      ])

      const productMap = new Map(products.map((item) => [item.id, item]))
      const menuMap = new Map(menus.map((item) => [item.id, item]))

      const orderItems = []

      for (const item of normalizedItems) {
        if (item.itemType === ITEM_TYPES.PRODUCT) {
          const product = productMap.get(item.itemId)
          if (!product) {
            return res.status(400).json({ error: `Produit invalide: ${item.itemId}` })
          }

          const unitPrice = toMoney(getPriceByDeliveryMode(product, deliveryMode))
          orderItems.push({
            itemType: ITEM_TYPES.PRODUCT,
            productId: product.id,
            menuId: null,
            itemName: product.name,
            quantity: item.quantity,
            unitPrice,
            totalPrice: toMoney(unitPrice * item.quantity),
          })
          continue
        }

        const menu = menuMap.get(item.itemId)
        if (!menu) {
          return res.status(400).json({ error: `Menu invalide: ${item.itemId}` })
        }

        const unitPrice = toMoney(getPriceByDeliveryMode(menu, deliveryMode))
        orderItems.push({
          itemType: ITEM_TYPES.MENU,
          productId: null,
          menuId: menu.id,
          itemName: menu.name,
          quantity: item.quantity,
          unitPrice,
          totalPrice: toMoney(unitPrice * item.quantity),
        })
      }

      const order = await prisma.order.create({
        data: {
          buyerUserAuthId: auth.userAuthId,
          sellerEntrepriseId: parsedSellerEntrepriseId,
          deliveryMode,
          receptionDate: parsedReceptionDate,
          buyerNote: buyerNote ? String(buyerNote).trim() : null,
          items: {
            create: orderItems,
          },
        },
        include: {
          sellerEntreprise: {
            select: { id: true, nomEntreprise: true },
          },
          items: true,
        },
      })

      return res.status(201).json({ order })
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
}
