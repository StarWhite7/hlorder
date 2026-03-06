import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth.js'

const AppLayout = () => {
  const { currentUser, isCompany, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="brand-block">
          <p className="brand-eyebrow">Plateforme B2B / B2C</p>
          <h1>HLOrder</h1>
        </div>

        <nav className="main-nav">
          <NavLink
            to="/marketplace"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            Commander
          </NavLink>
          <NavLink
            to="/orders"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            Historique
          </NavLink>
          {isCompany && (
            <>
              <NavLink
                to="/seller"
                className={({ isActive }) =>
                  isActive ? 'nav-link active' : 'nav-link'
                }
              >
                Vendre
              </NavLink>
              <NavLink
                to="/stats"
                className={({ isActive }) =>
                  isActive ? 'nav-link active' : 'nav-link'
                }
              >
                Statistiques
              </NavLink>
            </>
          )}
        </nav>

        <div className="user-block">
          <p className="user-name">{currentUser?.name}</p>
          <p className="user-role">
            {isCompany ? 'Entreprise' : 'Client'}
          </p>
          <button type="button" className="ghost-button" onClick={handleLogout}>
            Deconnexion
          </button>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}

export default AppLayout
