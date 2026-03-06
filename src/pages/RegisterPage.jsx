import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const ROLES = {
  CLIENT: 'CLIENT',
  ENTREPRISE: 'ENTREPRISE',
}

const RegisterPage = () => {
  const navigate = useNavigate()
  const [role, setRole] = useState(ROLES.CLIENT)
  const [pseudo, setPseudo] = useState('')
  const [nomInGame, setNomInGame] = useState('')
  const [prenomInGame, setPrenomInGame] = useState('')
  const [nomEntreprise, setNomEntreprise] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    const body =
      role === ROLES.CLIENT
        ? { role, pseudo, nomInGame, prenomInGame, password }
        : { role, nomEntreprise, password }

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Inscription impossible')
      }

      if (role === ROLES.CLIENT) {
        setSuccess(
          `Inscription reussie. ID Client: ${payload.clientId} | ID Auth: ${payload.userAuthId}`,
        )
      } else {
        setSuccess(
          `Inscription reussie. ID Entreprise: ${payload.entrepriseId} | ID Auth: ${payload.userAuthId}`,
        )
      }

      setTimeout(() => navigate('/login'), 1200)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Inscription</h1>
        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Type de compte
            <select value={role} onChange={(event) => setRole(event.target.value)}>
              <option value={ROLES.CLIENT}>Client</option>
              <option value={ROLES.ENTREPRISE}>Entreprise</option>
            </select>
          </label>

          {role === ROLES.CLIENT && (
            <>
              <label>
                Pseudo
                <input
                  type="text"
                  value={pseudo}
                  onChange={(event) => setPseudo(event.target.value)}
                  required
                />
              </label>
              <label>
                Nom (in-game)
                <input
                  type="text"
                  value={nomInGame}
                  onChange={(event) => setNomInGame(event.target.value)}
                  required
                />
              </label>
              <label>
                Prenom (in-game)
                <input
                  type="text"
                  value={prenomInGame}
                  onChange={(event) => setPrenomInGame(event.target.value)}
                  required
                />
              </label>
            </>
          )}

          {role === ROLES.ENTREPRISE && (
            <label>
              Nom de l&apos;entreprise
              <input
                type="text"
                value={nomEntreprise}
                onChange={(event) => setNomEntreprise(event.target.value)}
                required
              />
            </label>
          )}

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
          {success && <p className="success">{success}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Inscription...' : "S'enregistrer"}
          </button>
        </form>

        <p className="auth-link">
          Deja inscrit ? <Link to="/login">Se connecter</Link>
        </p>
      </section>
    </main>
  )
}

export default RegisterPage
