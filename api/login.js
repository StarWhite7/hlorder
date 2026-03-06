import { prisma } from './_lib/prisma.js'

const ROLES = {
  CLIENT: 'CLIENT',
  ENTREPRISE: 'ENTREPRISE',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }

  const { role, identifier, password } = req.body ?? {}

  if (!role || !identifier || !password) {
    return res
      .status(400)
      .json({ error: 'role, identifiant et mot de passe obligatoires' })
  }

  try {
    if (role === ROLES.CLIENT) {
      const client = await prisma.client.findUnique({
        where: { pseudo: identifier },
        include: { userAuth: true },
      })

      if (!client || client.userAuth.password !== password) {
        return res.status(401).json({ error: 'Identifiants invalides' })
      }

      return res.status(200).json({
        role: ROLES.CLIENT,
        userAuthId: client.userAuth.id,
        clientId: client.id,
        displayName: client.pseudo,
      })
    }

    if (role === ROLES.ENTREPRISE) {
      const entreprise = await prisma.entreprise.findUnique({
        where: { nomEntreprise: identifier },
        include: { userAuth: true },
      })

      if (!entreprise || entreprise.userAuth.password !== password) {
        return res.status(401).json({ error: 'Identifiants invalides' })
      }

      return res.status(200).json({
        role: ROLES.ENTREPRISE,
        userAuthId: entreprise.userAuth.id,
        entrepriseId: entreprise.id,
        displayName: entreprise.nomEntreprise,
      })
    }

    return res.status(400).json({ error: 'role invalide' })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
