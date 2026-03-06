const isProduction = globalThis.process?.env?.NODE_ENV === 'production'

export const SESSION_COOKIE_NAME = 'hlorder_session'

export const parseCookies = (cookieHeader) => {
  if (!cookieHeader || typeof cookieHeader !== 'string') return {}

  return cookieHeader.split(';').reduce((accumulator, part) => {
    const [rawKey, ...rawValue] = part.trim().split('=')
    if (!rawKey) return accumulator
    accumulator[rawKey] = decodeURIComponent(rawValue.join('=') || '')
    return accumulator
  }, {})
}

const appendSetCookieHeader = (res, cookie) => {
  const current = res.getHeader('Set-Cookie')
  if (!current) {
    res.setHeader('Set-Cookie', cookie)
    return
  }

  if (Array.isArray(current)) {
    res.setHeader('Set-Cookie', [...current, cookie])
    return
  }

  res.setHeader('Set-Cookie', [current, cookie])
}

const baseCookieParts = () => ['Path=/', 'HttpOnly', 'SameSite=Lax']

export const setSessionCookie = (res, value, maxAgeSeconds) => {
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(value)}`,
    ...baseCookieParts(),
    `Max-Age=${maxAgeSeconds}`,
  ]

  if (isProduction) parts.push('Secure')
  appendSetCookieHeader(res, parts.join('; '))
}

export const clearSessionCookie = (res) => {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    ...baseCookieParts(),
    'Max-Age=0',
  ]

  if (isProduction) parts.push('Secure')
  appendSetCookieHeader(res, parts.join('; '))
}
