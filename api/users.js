import { prisma } from './_lib/prisma.js'
import { requireAuth } from './_lib/auth.js'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const auth = await requireAuth(req, res, { roles: ['ENTREPRISE'] })
      if (!auth) return

      const [clients, entreprises] = await Promise.all([
        prisma.client.findMany({
          select: { id: true, pseudo: true, nomInGame: true, prenomInGame: true },
          orderBy: { id: 'asc' },
        }),
        prisma.entreprise.findMany({
          select: { id: true, nomEntreprise: true },
          orderBy: { id: 'asc' },
        }),
      ])

      return res.status(200).json({ clients, entreprises, requestedBy: auth })
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  res.setHeader('Allow', 'GET')
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
}
