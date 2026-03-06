import { prisma } from './prisma.js'

const getClientIp = (req) => {
  const forwardedFor = req.headers['x-forwarded-for']

  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return forwardedFor[0].split(',')[0].trim()
  }

  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim()
  }

  return req.socket?.remoteAddress || 'unknown'
}

const buildRateLimitKey = ({ action, role, identifier, ip }) => {
  const normalizedRole = String(role || 'NONE').toUpperCase()
  const normalizedIdentifier = String(identifier || 'NONE').trim().toLowerCase()
  const normalizedIp = String(ip || 'unknown').trim()

  return `${action}:${normalizedRole}:${normalizedIdentifier}:${normalizedIp}`
}

export const consumeRateLimit = async (req, options) => {
  const {
    action,
    role,
    identifier,
    maxAttempts,
    windowMs,
    blockMs,
  } = options

  const ip = getClientIp(req)
  const key = buildRateLimitKey({ action, role, identifier, ip })
  const now = new Date()

  const existing = await prisma.authThrottle.findUnique({
    where: { key },
  })

  if (!existing) {
    await prisma.authThrottle.create({
      data: {
        key,
        attempts: 1,
        windowStart: now,
      },
    })

    return { allowed: true }
  }

  if (existing.blockedUntil && existing.blockedUntil > now) {
    const retryAfterSeconds = Math.ceil(
      (existing.blockedUntil.getTime() - now.getTime()) / 1000,
    )
    return { allowed: false, retryAfterSeconds }
  }

  const isWindowExpired =
    now.getTime() - existing.windowStart.getTime() > windowMs

  if (isWindowExpired) {
    await prisma.authThrottle.update({
      where: { key },
      data: {
        attempts: 1,
        windowStart: now,
        blockedUntil: null,
      },
    })

    return { allowed: true }
  }

  const nextAttempts = existing.attempts + 1

  if (nextAttempts > maxAttempts) {
    const blockedUntil = new Date(now.getTime() + blockMs)
    await prisma.authThrottle.update({
      where: { key },
      data: {
        attempts: nextAttempts,
        blockedUntil,
      },
    })

    const retryAfterSeconds = Math.ceil(blockMs / 1000)
    return { allowed: false, retryAfterSeconds }
  }

  await prisma.authThrottle.update({
    where: { key },
    data: {
      attempts: nextAttempts,
    },
  })

  return { allowed: true }
}

export const clearRateLimit = async (req, options) => {
  const { action, role, identifier } = options
  const ip = getClientIp(req)
  const key = buildRateLimitKey({ action, role, identifier, ip })

  await prisma.authThrottle.deleteMany({
    where: { key },
  })
}
