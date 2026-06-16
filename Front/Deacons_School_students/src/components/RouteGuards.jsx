import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children }) {
  const { isAuthenticated, sessionVerifying } = useAuth()
  const location = useLocation()
  if (sessionVerifying) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }} role="status">
        جاري التحقق من الجلسة…
      </div>
    )
  }
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />
  return children
}

export function ForcePasswordRoute({ children }) {
  const { isAuthenticated, mustChangePassword, sessionVerifying } = useAuth()
  const location = useLocation()
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />
  if (sessionVerifying) return children
  if (mustChangePassword) return <Navigate to="/change-password" replace />
  return children
}
