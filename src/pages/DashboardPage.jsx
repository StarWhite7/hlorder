import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const DashboardPage = ({ auth, onLoggedOut }) => {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setError('')
    setLoading(true)

    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      })

      if (typeof onLoggedOut === 'function') {
        await onLoggedOut()
      }

      navigate('/login', { replace: true })
    } catch {
      setError('Erreur lors de la deconnexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Session connectee</h1>
        <p>Role: {auth?.role ?? '-'}</p>
        <p>Utilisateur: {auth?.displayName ?? '-'}</p>
        <p>ID Auth: {auth?.userAuthId ?? '-'}</p>
        {auth?.clientId && <p>ID Client: {auth.clientId}</p>}
        {auth?.entrepriseId && <p>ID Entreprise: {auth.entrepriseId}</p>}
        {error && <p className="error">{error}</p>}
        <button type="button" onClick={handleLogout} disabled={loading}>
          {loading ? 'Deconnexion...' : 'Se deconnecter'}
        </button>
      </section>
    </main>
  )
}

export default DashboardPage
