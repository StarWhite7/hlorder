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
  const productId = normalizeId(req.query?.id)
  if (!productId) {
    return res.status(400).json({ error: 'ID produit invalide' })
  }

  const auth = await requireAuth(req, res, { roles: ['ENTREPRISE'] })
  if (!auth) return

  try {
    const entreprise = await getEntrepriseByUserAuthId(auth.userAuthId)
    if (!entreprise) {
      return res.status(404).json({ error: 'Entreprise introuvable' })
    }

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        entrepriseId: entreprise.id,
      },
    })

    if (!product) {
      return res.status(404).json({ error: 'Produit introuvable' })
    }

    if (req.method === 'GET') {
      return res.status(200).json({ product })
    }

    if (req.method === 'PATCH') {
      const {
        name,
        imageUrl,
        priceWithDelivery,
        priceWithoutDelivery,
        isActive,
        catalogType,
      } =
        req.body ?? {}

      const data = {}

      if (name != null) {
        const normalizedName = String(name).trim()
        if (!normalizedName) {
          return res.status(400).json({ error: 'Nom du produit invalide' })
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

      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'Aucune modification fournie' })
      }

      if (data.catalogType && data.catalogType !== product.catalogType) {
        const linkedMenusOnOtherCatalog = await prisma.menuProduct.findFirst({
          where: {
            productId: product.id,
            menu: {
              entrepriseId: entreprise.id,
              catalogType: {
                not: data.catalogType,
              },
            },
          },
          select: { menuId: true },
        })

        if (linkedMenusOnOtherCatalog) {
          return res.status(400).json({
            error:
              "Ce produit est utilise par un menu d'une autre carte. Modifie d'abord le menu.",
          })
        }
      }

      const updated = await prisma.product.update({
        where: { id: product.id },
        data,
      })

      return res.status(200).json({ product: updated })
    }

    res.setHeader('Allow', 'GET, PATCH')
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
