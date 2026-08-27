import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const ROLES = {
  CLIENT: 'CLIENT',
  ENTREPRISE: 'ENTREPRISE',
}

const getFallbackLoginError = () => {
  if (window.location.hostname === 'localhost') {
    return 'Connexion impossible en local. Verifie que `npx vercel dev` est lance.'
  }
  return 'Connexion impossible sur le serveur. Verifie le deployement Vercel et les variables d environnement.'
}

const LoginPage = ({ onLoggedIn }) => {
  const navigate = useNavigate()
  const [role, setRole] = useState(ROLES.CLIENT)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const identifierLabel = role === ROLES.CLIENT ? 'Pseudo' : "Nom de l'entreprise"

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          role,
          identifier,
          password,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        const apiError =
          payload && typeof payload.error === 'string' ? payload.error : getFallbackLoginError()
        throw new Error(`${apiError} (HTTP ${response.status})`)
      }

      if (typeof onLoggedIn === 'function') {
        await onLoggedIn()
      }

      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Connexion</h1>
        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Type de compte
            <select value={role} onChange={(event) => setRole(event.target.value)}>
              <option value={ROLES.CLIENT}>Client</option>
              <option value={ROLES.ENTREPRISE}>Entreprise</option>
            </select>
          </label>

          <label>
            {identifierLabel}
            <input
              type="text"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              required
            />
          </label>

          <label>
            Mot de passe
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="auth-link">
          Pas encore de compte ? <Link to="/register">S&apos;enregistrer</Link>
        </p>
      </section>
    </main>
  )
}

export default LoginPage
