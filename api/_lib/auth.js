import { clearSessionCookie } from './cookies.js'
import { getAuthFromRequest } from './session.js'

export const requireAuth = async (req, res, options = {}) => {
  const { roles } = options
  const auth = await getAuthFromRequest(req)

  if (!auth) {
    clearSessionCookie(res)
    res.status(401).json({ error: 'Non authentifie' })
    return null
  }

  if (Array.isArray(roles) && roles.length > 0 && !roles.includes(auth.role)) {
    res.status(403).json({ error: 'Acces interdit pour ce role' })
    return null
  }

  return auth
}
