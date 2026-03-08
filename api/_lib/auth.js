import { clearSessionCookie } from './cookies.js'
import { getAuthFromRequest } from './session.js'

export const requireAuth = async (req, res, options = {}) => {
  const { roles } = options
  let auth = null

  try {
    auth = await getAuthFromRequest(req)
  } catch (error) {
    // P2022 = schema mismatch (missing column), typically when migrations
    // were not applied on the currently used database.
    if (error?.code === 'P2022') {
      res.status(503).json({
        error:
          'Schema de base de donnees non a jour. Lancez les migrations Prisma.',
      })
      return null
    }

    res.status(500).json({ error: 'Erreur interne d authentification' })
    return null
  }

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
