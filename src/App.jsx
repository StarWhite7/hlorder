import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import './App.css'

const readAuth = () => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem('hlorder_auth')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const ProtectedRoute = ({ children }) => {
  const auth = readAuth()
  if (!auth) return <Navigate to="/login" replace />
  return children
}

const PublicOnlyRoute = ({ children }) => {
  const auth = readAuth()
  if (auth) return <Navigate to="/" replace />
  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <RegisterPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
