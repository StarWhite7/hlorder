import { prisma } from '../_lib/prisma.js'
import { requireAuth } from '../_lib/auth.js'
import { getEntrepriseByUserAuthId } from '../_lib/entreprise.js'

const toMoney = (value) => Number(Number(value).toFixed(2))

const CATALOG_TYPES = {
  CLIENT: 'CLIENT',
  ENTREPRISE: 'ENTREPRISE',
}

const normalizeCatalogType = (rawValue) => {
  const value = String(rawValue || '').trim().toUpperCase()
  return Object.values(CATALOG_TYPES).includes(value) ? value : null
}

const normalizeId = (rawId) => {
  const value = Array.isArray(rawId) ? rawId[0] : rawId
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

export default async function handler(req, res) {
  const menuId = normalizeId(req.query?.id)
  if (!menuId) {
    return res.status(400).json({ error: 'ID menu invalide' })
  }

  const auth = await requireAuth(req, res, { roles: ['ENTREPRISE'] })
  if (!auth) return

  try {
    const entreprise = await getEntrepriseByUserAuthId(auth.userAuthId)
    if (!entreprise) {
      return res.status(404).json({ error: 'Entreprise introuvable' })
    }

    const menu = await prisma.menu.findFirst({
      where: {
        id: menuId,
        entrepriseId: entreprise.id,
      },
      include: {
        products: {
          include: {
            product: {
              select: { id: true, name: true, imageUrl: true, isActive: true },
            },
          },
        },
      },
    })

    if (!menu) {
      return res.status(404).json({ error: 'Menu introuvable' })
    }

    if (req.method === 'GET') {
      return res.status(200).json({ menu })
    }

    if (req.method === 'PATCH') {
      const {
        name,
        imageUrl,
        priceWithDelivery,
        priceWithoutDelivery,
        isActive,
        items,
        catalogType,
      } =
        req.body ?? {}

      const data = {}

      if (name != null) {
        const normalizedName = String(name).trim()
        if (!normalizedName) {
          return res.status(400).json({ error: 'Nom du menu invalide' })
        }
        data.name = normalizedName
      }

      if (imageUrl != null) {
        const normalizedImage = String(imageUrl).trim()
        data.imageUrl = normalizedImage || null
      }

      if (priceWithDelivery != null) {
        const parsed = Number(priceWithDelivery)
        if (Number.isNaN(parsed) || parsed < 0) {
          return res.status(400).json({ error: 'Prix avec livraison invalide' })
        }
        data.priceWithDelivery = toMoney(parsed)
      }

      if (priceWithoutDelivery != null) {
        const parsed = Number(priceWithoutDelivery)
        if (Number.isNaN(parsed) || parsed < 0) {
          return res.status(400).json({ error: 'Prix sans livraison invalide' })
        }
        data.priceWithoutDelivery = toMoney(parsed)
      }

      if (isActive != null) {
        data.isActive = Boolean(isActive)
      }

      if (catalogType != null) {
        const normalizedCatalogType = normalizeCatalogType(catalogType)
        if (!normalizedCatalogType) {
          return res.status(400).json({ error: 'catalogType invalide' })
        }
        data.catalogType = normalizedCatalogType
      }

      const shouldUpdateItems = Array.isArray(items)
      if (shouldUpdateItems && items.length === 0) {
        return res.status(400).json({
          error: 'Un menu doit contenir au moins un produit',
        })
      }

      const targetCatalogType = data.catalogType || menu.catalogType
      if (data.catalogType && !shouldUpdateItems) {
        return res.status(400).json({
          error:
            'Pour changer de carte, fournis aussi items avec des produits de la nouvelle carte',
        })
      }

      let normalizedItems = []
      if (shouldUpdateItems) {
        normalizedItems = items
          .map((item) => ({
            productId: Number(item.productId),
            quantity: Math.max(1, Number(item.quantity) || 1),
          }))
          .filter((item) => Number.isInteger(item.productId) && item.productId > 0)

        if (normalizedItems.length === 0) {
          return res.status(400).json({ error: 'Aucun produit valide dans le menu' })
        }

        const productIds = [...new Set(normalizedItems.map((item) => item.productId))]
        const ownedProducts = await prisma.product.findMany({
          where: {
            id: { in: productIds },
            entrepriseId: entreprise.id,
            catalogType: targetCatalogType,
          },
          select: { id: true },
        })

        if (ownedProducts.length !== productIds.length) {
          return res.status(400).json({
            error: "Le menu doit contenir uniquement des produits de l'entreprise",
          })
        }
      }

      if (!shouldUpdateItems && Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'Aucune modification fournie' })
      }

      const updatedMenu = await prisma.$transaction(async (tx) => {
        const updated = await tx.menu.update({
          where: { id: menu.id },
          data,
        })

        if (shouldUpdateItems) {
          await tx.menuProduct.deleteMany({
            where: { menuId: menu.id },
          })

          await tx.menuProduct.createMany({
            data: normalizedItems.map((item) => ({
              menuId: menu.id,
              productId: item.productId,
              quantity: item.quantity,
            })),
          })
        }

        return tx.menu.findUnique({
          where: { id: updated.id },
          include: {
            products: {
              include: {
                product: {
                  select: { id: true, name: true, imageUrl: true, isActive: true },
                },
              },
            },
          },
        })
      })

      return res.status(200).json({ menu: updatedMenu })
    }

    res.setHeader('Allow', 'GET, PATCH')
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
