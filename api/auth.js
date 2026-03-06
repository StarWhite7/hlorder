import { prisma } from './_lib/prisma.js'
import { requireAuth } from './_lib/auth.js'
import { hashPassword, isBcryptHash, verifyPassword } from './_lib/password.js'
import { createSessionForUser, destroySessionFromRequest } from './_lib/session.js'
import { clearRateLimit, consumeRateLimit } from './_lib/rateLimit.js'

const ROLES = {
  CLIENT: 'CLIENT',
  ENTREPRISE: 'ENTREPRISE',
}

const LOGIN_RATE_LIMIT = {
  action: 'login',
  maxAttempts: 7,
  windowMs: 15 * 60 * 1000,
  blockMs: 15 * 60 * 1000,
}

const REGISTER_RATE_LIMIT = {
  action: 'register',
  maxAttempts: 5,
  windowMs: 30 * 60 * 1000,
  blockMs: 30 * 60 * 1000,
}

const isEnabled = (entity) => entity?.isActive !== false && !entity?.deletedAt

const getAction = (req) =>
  String(req.query?.action || req.body?.action || '').trim().toLowerCase()

const meHandler = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }

  const auth = await requireAuth(req, res)
  if (!auth) return

  return res.status(200).json(auth)
}

const logoutHandler = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }

  await destroySessionFromRequest(req, res)
  return res.status(200).json({ message: 'Deconnexion reussie' })
}

const loginHandler = async (req, res) => {
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

  const rateLimitResult = await consumeRateLimit(req, {
    ...LOGIN_RATE_LIMIT,
    role,
    identifier,
  })

  if (!rateLimitResult.allowed) {
    res.setHeader('Retry-After', String(rateLimitResult.retryAfterSeconds))
    return res.status(429).json({
      error: 'Trop de tentatives. Reessaie plus tard.',
    })
  }

  if (role === ROLES.CLIENT) {
    const client = await prisma.client.findUnique({
      where: { pseudo: identifier },
      include: { userAuth: true },
    })

    if (!client || !isEnabled(client) || !isEnabled(client.userAuth)) {
      return res.status(401).json({ error: 'Identifiants invalides' })
    }

    const isValid = await verifyPassword(password, client.userAuth.password)
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

    await createSessionForUser(res, client.userAuth.id)
    await clearRateLimit(req, {
      action: LOGIN_RATE_LIMIT.action,
      role,
      identifier,
    })

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

    if (!entreprise || !isEnabled(entreprise) || !isEnabled(entreprise.userAuth)) {
      return res.status(401).json({ error: 'Identifiants invalides' })
    }

    const isValid = await verifyPassword(password, entreprise.userAuth.password)
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

    await createSessionForUser(res, entreprise.userAuth.id)
    await clearRateLimit(req, {
      action: LOGIN_RATE_LIMIT.action,
      role,
      identifier,
    })

    return res.status(200).json({
      role: ROLES.ENTREPRISE,
      userAuthId: entreprise.userAuth.id,
      entrepriseId: entreprise.id,
      displayName: entreprise.nomEntreprise,
    })
  }

  return res.status(400).json({ error: 'role invalide' })
}

const registerHandler = async (req, res) => {
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
}

export default async function handler(req, res) {
  const action = getAction(req)

  try {
    switch (action) {
      case 'me':
        return meHandler(req, res)
      case 'login':
        return loginHandler(req, res)
      case 'register':
        return registerHandler(req, res)
      case 'logout':
        return logoutHandler(req, res)
      default:
        return res.status(400).json({
          error: "Action invalide. Utilise action=me|login|register|logout",
        })
    }
  } catch (error) {
    if (error?.code === 'P2002') {
      return res
        .status(409)
        .json({ error: 'Valeur deja utilisee (pseudo ou nom entreprise).' })
    }

    return res.status(500).json({ error: error.message })
  }
}
