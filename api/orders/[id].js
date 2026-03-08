import { prisma } from '../_lib/prisma.js'
import { requireAuth } from '../_lib/auth.js'
import { getEntrepriseByUserAuthId } from '../_lib/entreprise.js'

const STATUS_TRANSITIONS = {
  PENDING: ['ACCEPTED', 'REFUSED'],
  ACCEPTED: ['PREPARING'],
  REFUSED: [],
  PREPARING: ['READY'],
  READY: ['PICKED_UP'],
  PICKED_UP: [],
}

const normalizeId = (rawId) => {
  const value = Array.isArray(rawId) ? rawId[0] : rawId
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

export default async function handler(req, res) {
  const orderId = normalizeId(req.query?.id)
  if (!orderId) {
    return res.status(400).json({ error: 'ID de commande invalide' })
  }

  if (req.method === 'GET') {
    const auth = await requireAuth(req, res)
    if (!auth) return

    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          sellerEntreprise: {
            select: { id: true, nomEntreprise: true },
          },
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
      })

      if (!order) {
        return res.status(404).json({ error: 'Commande introuvable' })
      }

      let isSeller = false
      if (auth.role === 'ENTREPRISE') {
        const entreprise = await getEntrepriseByUserAuthId(auth.userAuthId)
        isSeller = Boolean(entreprise && entreprise.id === order.sellerEntrepriseId)
      }
      const isBuyer = order.buyerUserAuthId === auth.userAuthId

      if (!isBuyer && !isSeller) {
        return res.status(403).json({ error: 'Acces interdit a cette commande' })
      }

      return res.status(200).json({ order })
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  if (req.method === 'PATCH') {
    const auth = await requireAuth(req, res, { roles: ['ENTREPRISE'] })
    if (!auth) return

    const { status, sellerNote } = req.body ?? {}
    if (status == null && sellerNote == null) {
      return res
        .status(400)
        .json({ error: 'Fournis au moins status ou sellerNote' })
    }

    try {
      const entreprise = await getEntrepriseByUserAuthId(auth.userAuthId)
      if (!entreprise) {
        return res.status(404).json({ error: 'Entreprise introuvable' })
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          status: true,
          sellerEntrepriseId: true,
        },
      })

      if (!order) {
        return res.status(404).json({ error: 'Commande introuvable' })
      }

      if (order.sellerEntrepriseId !== entreprise.id) {
        return res.status(403).json({ error: 'Acces interdit a cette commande' })
      }

      if (status != null) {
        const normalizedStatus = String(status).toUpperCase()
        const nextStatuses = STATUS_TRANSITIONS[order.status] ?? []
        if (!nextStatuses.includes(normalizedStatus)) {
          return res.status(400).json({
            error: `Transition de statut invalide (${order.status} -> ${normalizedStatus})`,
          })
        }
      }

      if (sellerNote != null && order.status !== 'PENDING') {
        return res.status(400).json({
          error:
            "La note entreprise ne peut plus être modifiée après acceptation ou refus",
        })
      }

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          ...(status != null ? { status: String(status).toUpperCase() } : {}),
          ...(sellerNote != null ? { sellerNote: String(sellerNote).trim() } : {}),
        },
        include: {
          sellerEntreprise: {
            select: { id: true, nomEntreprise: true },
          },
          items: true,
        },
      })

      return res.status(200).json({ order: updatedOrder })
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  res.setHeader('Allow', 'GET, PATCH')
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
}
