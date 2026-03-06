import { prisma } from './_lib/prisma.js'
import { requireAuth } from './_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }

  const auth = await requireAuth(req, res)
  if (!auth) return

  try {
    const entreprises = await prisma.entreprise.findMany({
      select: {
        id: true,
        nomEntreprise: true,
      },
      orderBy: { nomEntreprise: 'asc' },
    })

    return res.status(200).json({ entreprises })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
