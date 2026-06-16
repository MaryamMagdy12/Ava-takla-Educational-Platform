import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGacAuth } from '../../context/GacAuthContext.jsx'
import GacMainNav from './GacMainNav.jsx'
import '../../assets/css/GacAppShell.css'

const MotionMain = motion.main

export default function GacAuthenticatedLayout() {
  const { isAuthenticated, isRestoringSession, mustChangePassword } = useGacAuth()
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
    <div className="gac-app-shell">
      <div className="gac-app-shell__nav-wrap">
        <GacMainNav />
      </div>
      <MotionMain
        className="gac-app-shell__main"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <Outlet />
      </MotionMain>
    </div>
  )
}
