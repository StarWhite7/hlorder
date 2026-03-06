import { destroySessionFromRequest } from './_lib/session.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }

  await destroySessionFromRequest(req, res)
  return res.status(200).json({ message: 'Deconnexion reussie' })
}
