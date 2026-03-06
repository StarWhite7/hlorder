import { Navigate, Outlet } from 'react-router-dom'
import useAuth from '../hooks/useAuth.js'

const ProtectedRoute = ({ requireCompany = false, children }) => {
  const { isAuthenticated, isCompany } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requireCompany && !isCompany) {
    return <Navigate to="/marketplace" replace />
  }

  if (children) return children
  return <Outlet />
}

export default ProtectedRoute
