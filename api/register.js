import { prisma } from './_lib/prisma.js'
import { hashPassword } from './_lib/password.js'
import { clearRateLimit, consumeRateLimit } from './_lib/rateLimit.js'

const ROLES = {
  CLIENT: 'CLIENT',
  ENTREPRISE: 'ENTREPRISE',
}

const REGISTER_RATE_LIMIT = {
  action: 'register',
  maxAttempts: 5,
  windowMs: 30 * 60 * 1000,
  blockMs: 30 * 60 * 1000,
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }

  const {
    role,
    pseudo,
    nomInGame,
    prenomInGame,
    nomEntreprise,
    password,
  } = req.body ?? {}

  if (!role || !password) {
    return res.status(400).json({ error: 'role et mot de passe obligatoires' })
  }

  if (password.length < 8) {
    return res
      .status(400)
      .json({ error: 'Le mot de passe doit contenir au moins 8 caracteres' })
  }

  const identifier = role === ROLES.CLIENT ? pseudo : nomEntreprise

  try {
    const rateLimitResult = await consumeRateLimit(req, {
      ...REGISTER_RATE_LIMIT,
      role,
      identifier,
    })

    if (!rateLimitResult.allowed) {
      res.setHeader('Retry-After', String(rateLimitResult.retryAfterSeconds))
      return res.status(429).json({
        error: 'Trop de tentatives. Reessaie plus tard.',
      })
    }

    const hashedPassword = await hashPassword(password)

    if (role === ROLES.CLIENT) {
      if (!pseudo || !nomInGame || !prenomInGame) {
        return res
          .status(400)
          .json({ error: 'pseudo, nom et prenom in-game obligatoires' })
      }

      const created = await prisma.$transaction(async (tx) => {
        const userAuth = await tx.userAuth.create({
          data: {
            role: ROLES.CLIENT,
            password: hashedPassword,
          },
        })

        const client = await tx.client.create({
          data: {
            pseudo,
            nomInGame,
            prenomInGame,
            userAuthId: userAuth.id,
          },
        })

        return { userAuthId: userAuth.id, clientId: client.id }
      })

      await clearRateLimit(req, {
        action: REGISTER_RATE_LIMIT.action,
        role,
        identifier,
      })

      return res.status(201).json({
        message: 'Inscription client reussie',
        role: ROLES.CLIENT,
        ...created,
      })
    }

    if (role === ROLES.ENTREPRISE) {
      if (!nomEntreprise) {
        return res.status(400).json({ error: "nom de l'entreprise obligatoire" })
      }

      const created = await prisma.$transaction(async (tx) => {
        const userAuth = await tx.userAuth.create({
          data: {
            role: ROLES.ENTREPRISE,
            password: hashedPassword,
          },
        })

        const entreprise = await tx.entreprise.create({
          data: {
            nomEntreprise,
            userAuthId: userAuth.id,
          },
        })

        return { userAuthId: userAuth.id, entrepriseId: entreprise.id }
      })

      await clearRateLimit(req, {
        action: REGISTER_RATE_LIMIT.action,
        role,
        identifier,
      })

      return res.status(201).json({
        message: 'Inscription entreprise reussie',
        role: ROLES.ENTREPRISE,
        ...created,
      })
    }

    return res.status(400).json({ error: 'role invalide' })
  } catch (error) {
    if (error?.code === 'P2002') {
      return res
        .status(409)
        .json({ error: 'Valeur deja utilisee (pseudo ou nom entreprise).' })
    }
    return res.status(500).json({ error: error.message })
  }
}
