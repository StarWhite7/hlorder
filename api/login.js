import { prisma } from './_lib/prisma.js'
import { hashPassword, isBcryptHash, verifyPassword } from './_lib/password.js'

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

      const isValid =
        client &&
        (await verifyPassword(password, client.userAuth.password))

      if (!isValid) {
        return res.status(401).json({ error: 'Identifiants invalides' })
      }

      if (!isBcryptHash(client.userAuth.password)) {
        const migratedHash = await hashPassword(password)
        await prisma.userAuth.update({
          where: { id: client.userAuth.id },
          data: { password: migratedHash },
        })
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

      const isValid =
        entreprise &&
        (await verifyPassword(password, entreprise.userAuth.password))

      if (!isValid) {
        return res.status(401).json({ error: 'Identifiants invalides' })
      }

      if (!isBcryptHash(entreprise.userAuth.password)) {
        const migratedHash = await hashPassword(password)
        await prisma.userAuth.update({
          where: { id: entreprise.userAuth.id },
          data: { password: migratedHash },
        })
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
