import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

const DashboardPage = () => {
  const navigate = useNavigate()

  const auth = useMemo(() => {
    try {
      const raw = window.localStorage.getItem('hlorder_auth')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }, [])

  const handleLogout = () => {
    window.localStorage.removeItem('hlorder_auth')
    navigate('/login', { replace: true })
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
        <button type="button" onClick={handleLogout}>
          Se deconnecter
        </button>
      </section>
    </main>
  )
}

export default DashboardPage
