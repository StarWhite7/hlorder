import { prisma } from './_lib/prisma.js'
import { requireAuth } from './_lib/auth.js'
import { getEntrepriseByUserAuthId } from './_lib/entreprise.js'

const toMoney = (value) => Number(Number(value).toFixed(2))

const CATALOG_TYPES = {
  CLIENT: 'CLIENT',
  ENTREPRISE: 'ENTREPRISE',
}

const normalizeCatalogType = (rawValue) => {
  const value = String(rawValue || '').trim().toUpperCase()
  return Object.values(CATALOG_TYPES).includes(value) ? value : null
}

const catalogTypeForRole = (role) =>
  role === CATALOG_TYPES.ENTREPRISE
    ? CATALOG_TYPES.ENTREPRISE
    : CATALOG_TYPES.CLIENT

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const auth = await requireAuth(req, res)
    if (!auth) return

    const mine = String(req.query?.mine || 'false') === 'true'
    const queryCatalogType = normalizeCatalogType(req.query?.catalogType)

    if (req.query?.catalogType && !queryCatalogType) {
      return res.status(400).json({ error: 'catalogType invalide' })
    }

    try {
      if (mine) {
        if (auth.role !== 'ENTREPRISE') {
          return res.status(403).json({ error: 'Acces reserve aux entreprises' })
        }

        const entreprise = await getEntrepriseByUserAuthId(auth.userAuthId)
        if (!entreprise) {
          return res.status(404).json({ error: 'Entreprise introuvable' })
        }

        const menus = await prisma.menu.findMany({
          where: {
            entrepriseId: entreprise.id,
            ...(queryCatalogType ? { catalogType: queryCatalogType } : {}),
          },
          include: {
            products: {
              include: {
                product: {
                  select: { id: true, name: true, imageUrl: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })

        return res.status(200).json({ menus })
      }

      const visibleCatalogType = catalogTypeForRole(auth.role)

      const menus = await prisma.menu.findMany({
        where: {
          isActive: true,
          catalogType: visibleCatalogType,
        },
        include: {
          entreprise: {
            select: { id: true, nomEntreprise: true },
          },
          products: {
            include: {
              product: {
                select: { id: true, name: true, imageUrl: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      return res.status(200).json({ menus })
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  if (req.method === 'POST') {
    const auth = await requireAuth(req, res, { roles: ['ENTREPRISE'] })
    if (!auth) return

    const {
      name,
      imageUrl,
      priceWithDelivery,
      priceWithoutDelivery,
      items,
      catalogType,
    } =
      req.body ?? {}

    if (
      !name ||
      priceWithDelivery == null ||
      priceWithoutDelivery == null ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        error:
          'name, priceWithDelivery, priceWithoutDelivery, items sont obligatoires',
      })
    }

    const withDelivery = Number(priceWithDelivery)
    const withoutDelivery = Number(priceWithoutDelivery)

    if (
      Number.isNaN(withDelivery) ||
      Number.isNaN(withoutDelivery) ||
      withDelivery < 0 ||
      withoutDelivery < 0
    ) {
      return res.status(400).json({ error: 'Prix invalides' })
    }

    const requestedCatalogType = normalizeCatalogType(catalogType)
    const normalizedCatalogType = requestedCatalogType || CATALOG_TYPES.CLIENT

    if (catalogType != null && !requestedCatalogType) {
      return res.status(400).json({ error: 'catalogType invalide' })
    }

    try {
      const entreprise = await getEntrepriseByUserAuthId(auth.userAuthId)
      if (!entreprise) {
        return res.status(404).json({ error: 'Entreprise introuvable' })
      }

      const normalizedItems = items
        .map((item) => ({
          productId: Number(item.productId),
          quantity: Math.max(1, Number(item.quantity) || 1),
        }))
        .filter((item) => Number.isInteger(item.productId) && item.productId > 0)

      const productIds = [...new Set(normalizedItems.map((item) => item.productId))]
      if (productIds.length === 0) {
        return res.status(400).json({ error: 'Aucun produit valide dans le menu' })
      }

      const ownedProducts = await prisma.product.findMany({
        where: {
          id: { in: productIds },
          entrepriseId: entreprise.id,
          isActive: true,
          catalogType: normalizedCatalogType,
        },
        select: { id: true },
      })

      if (ownedProducts.length !== productIds.length) {
        return res.status(400).json({
          error:
            "Le menu doit contenir uniquement des produits actifs de l'entreprise",
        })
      }

      const menu = await prisma.$transaction(async (tx) => {
        const createdMenu = await tx.menu.create({
          data: {
            entrepriseId: entreprise.id,
            catalogType: normalizedCatalogType,
            name: String(name).trim(),
            imageUrl: imageUrl ? String(imageUrl).trim() : null,
            priceWithDelivery: toMoney(withDelivery),
            priceWithoutDelivery: toMoney(withoutDelivery),
          },
        })

        await tx.menuProduct.createMany({
          data: normalizedItems.map((item) => ({
            menuId: createdMenu.id,
            productId: item.productId,
            quantity: item.quantity,
          })),
        })

        return createdMenu
      })

      return res.status(201).json({ menu })
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
}
