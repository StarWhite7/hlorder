import { useCallback, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import './App.css'

const ProtectedRoute = ({ auth, loading, children }) => {
  if (loading) return <main className="auth-page">Chargement session...</main>
  if (!auth) return <Navigate to="/login" replace />
  return children
}

const PublicOnlyRoute = ({ auth, loading, children }) => {
  if (loading) return <main className="auth-page">Chargement session...</main>
  if (auth) return <Navigate to="/" replace />
  return children
}

function App() {
  const [auth, setAuth] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshAuth = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/auth?action=me', {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        setAuth(null)
        return
      }

      const payload = await response.json()
      setAuth(payload)
    } catch {
      setAuth(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshAuth()
  }, [refreshAuth])

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnlyRoute auth={auth} loading={loading}>
              <LoginPage onLoggedIn={refreshAuth} />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute auth={auth} loading={loading}>
              <RegisterPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute auth={auth} loading={loading}>
              <DashboardPage auth={auth} onLoggedOut={refreshAuth} />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
