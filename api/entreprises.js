import { prisma } from './_lib/prisma.js'
import { requireAuth } from './_lib/auth.js'
import { getEntrepriseByUserAuthId } from './_lib/entreprise.js'

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/
const ALLOWED_IMAGE_PREFIXES = ['data:image/jpeg;base64,', 'data:image/png;base64,']

const isAllowedImage = (value) =>
  ALLOWED_IMAGE_PREFIXES.some((prefix) => String(value).startsWith(prefix))

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const auth = await requireAuth(req, res)
    if (!auth) return

    const mine = String(req.query?.mine || '').toLowerCase() === 'true'

    try {
      if (mine) {
        if (auth.role !== 'ENTREPRISE') {
          return res.status(403).json({ error: 'Acces reserve aux entreprises' })
        }

        const entreprise = await prisma.entreprise.findFirst({
          where: {
            userAuthId: auth.userAuthId,
            isActive: true,
            deletedAt: null,
          },
          select: {
            id: true,
            nomEntreprise: true,
            logoUrl: true,
            themeColor: true,
            description: true,
          },
        })

        if (!entreprise) {
          return res.status(404).json({ error: 'Entreprise introuvable' })
        }

        return res.status(200).json({ entreprise })
      }

      const entreprises = await prisma.entreprise.findMany({
        where: {
          isActive: true,
          deletedAt: null,
        },
        select: {
          id: true,
          nomEntreprise: true,
          logoUrl: true,
          themeColor: true,
          description: true,
        },
        orderBy: { nomEntreprise: 'asc' },
      })

      return res.status(200).json({ entreprises })
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  if (req.method === 'PATCH') {
    const auth = await requireAuth(req, res, { roles: ['ENTREPRISE'] })
    if (!auth) return

    const { nomEntreprise, logoUrl, themeColor, description } = req.body ?? {}

    const data = {}

    if (nomEntreprise != null) {
      const value = String(nomEntreprise).trim()
      if (value.length < 2 || value.length > 80) {
        return res
          .status(400)
          .json({ error: "Le nom de l'entreprise doit contenir entre 2 et 80 caracteres" })
      }
      data.nomEntreprise = value
    }

    if (logoUrl != null) {
      const value = String(logoUrl).trim()
      if (value === '') {
        data.logoUrl = null
      } else if (!isAllowedImage(value)) {
        return res.status(400).json({ error: 'Logo invalide (JPEG/PNG uniquement)' })
      } else {
        data.logoUrl = value
      }
    }

    if (themeColor != null) {
      const value = String(themeColor).trim()
      if (!HEX_COLOR_PATTERN.test(value)) {
        return res.status(400).json({ error: 'Couleur invalide (format #RRGGBB)' })
      }
      data.themeColor = value.toLowerCase()
    }

    if (description != null) {
      const value = String(description).trim()
      if (value.length > 120) {
        return res.status(400).json({ error: 'Description trop longue (120 caracteres max)' })
      }
      data.description = value || null
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Aucune modification fournie' })
    }

    try {
      const entreprise = await getEntrepriseByUserAuthId(auth.userAuthId)
      if (!entreprise) {
        return res.status(404).json({ error: 'Entreprise introuvable' })
      }

      const updated = await prisma.entreprise.update({
        where: { id: entreprise.id },
        data,
        select: {
          id: true,
          nomEntreprise: true,
          logoUrl: true,
          themeColor: true,
          description: true,
        },
      })

      return res.status(200).json({ entreprise: updated })
    } catch (error) {
      if (error?.code === 'P2002') {
        return res.status(409).json({ error: "Nom d'entreprise deja utilise" })
      }
      return res.status(500).json({ error: error.message })
    }
  }

  res.setHeader('Allow', 'GET, PATCH')
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
}
