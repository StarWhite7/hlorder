import { createHash, randomBytes } from 'node:crypto'
import { prisma } from './prisma.js'
import {
  clearSessionCookie,
  parseCookies,
  SESSION_COOKIE_NAME,
  setSessionCookie,
} from './cookies.js'

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7

const hashToken = (token) =>
  createHash('sha256').update(token).digest('hex')

const buildAuthPayload = (userAuth) => {
  if (!userAuth || !userAuth.isActive || userAuth.deletedAt) {
    return null
  }

  if (userAuth.role === 'CLIENT') {
    if (!userAuth.client || !userAuth.client.isActive || userAuth.client.deletedAt) {
      return null
    }

    return {
      role: userAuth.role,
      userAuthId: userAuth.id,
      clientId: userAuth.client.id,
      entrepriseId: null,
      displayName: userAuth.client.pseudo,
    }
  }

  if (
    !userAuth.entreprise ||
    !userAuth.entreprise.isActive ||
    userAuth.entreprise.deletedAt
  ) {
    return null
  }

  return {
    role: userAuth.role,
    userAuthId: userAuth.id,
    clientId: null,
    entrepriseId: userAuth.entreprise.id,
    displayName: userAuth.entreprise.nomEntreprise,
  }
}

export const createSessionForUser = async (res, userAuthId) => {
  const rawToken = randomBytes(32).toString('hex')
  const tokenHash = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000)

  await prisma.$transaction(async (tx) => {
    await tx.session.deleteMany({
      where: {
        userAuthId,
      },
    })

    await tx.session.create({
      data: {
        userAuthId,
        tokenHash,
        expiresAt,
      },
    })
  })

  setSessionCookie(res, rawToken, SESSION_TTL_SECONDS)
}

const getSessionTokenFromRequest = (req) => {
  const cookies = parseCookies(req.headers.cookie)
  const token = cookies[SESSION_COOKIE_NAME]
  return typeof token === 'string' && token.length > 0 ? token : null
}

export const getAuthFromRequest = async (req) => {
  const token = getSessionTokenFromRequest(req)
  if (!token) return null

  const tokenHash = hashToken(token)

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      userAuth: {
        include: {
          client: true,
          // Keep auth loading resilient if optional profile columns are missing
          // in a not-yet-migrated database.
          entreprise: {
            select: {
              id: true,
              nomEntreprise: true,
              isActive: true,
              deletedAt: true,
            },
          },
        },
      },
    },
  })

  if (!session) return null

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({
      where: { tokenHash },
    })
    return null
  }

  const authPayload = buildAuthPayload(session.userAuth)
  if (!authPayload) {
    await prisma.session.deleteMany({
      where: { tokenHash },
    })
    return null
  }

  return authPayload
}

export const destroySessionFromRequest = async (req, res) => {
  const token = getSessionTokenFromRequest(req)
  if (!token) {
    clearSessionCookie(res)
    return
  }

  const tokenHash = hashToken(token)

  await prisma.session.deleteMany({
    where: { tokenHash },
  })

  clearSessionCookie(res)
}
