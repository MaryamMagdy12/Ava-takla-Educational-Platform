import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useScAuth } from '../../context/ScAuthContext.jsx'
import ScMainNav from './ScMainNav.jsx'
import '../../assets/css/ScAppShell.css'

export default function ScAuthenticatedLayout() {
  const { isAuthenticated, isRestoringSession, mustChangePassword } = useScAuth()
  const location = useLocation()

  if (isRestoringSession) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }

  return (
    <div className="sc-app-shell">
      <div className="sc-app-shell__nav-wrap">
        <ScMainNav />
      </div>
      <main className="sc-app-shell__main">
        <Outlet />
      </main>
    </div>
  )
}
