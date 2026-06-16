import { motion } from 'framer-motion'
import { useGacAuth } from '../../context/GacAuthContext.jsx'
import '../../assets/css/GacAppSiteHeader.css'

export default function GacAppSiteHeader() {
  const { logout } = useGacAuth()

  return (
    <motion.header
      className="gac-app-site-header"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <div className="gac-app-site-header__inner">
        <img className="gac-app-site-header__logo" src="/school-logo.png" alt="" width="48" height="48" />
        <div className="gac-app-site-header__text">
          <span className="gac-app-site-header__title">الاجتماع العام — مسارات العائلات</span>
        </div>
        <nav className="gac-app-site-header__nav" aria-label="حساب العائلة">
          <button type="button" className="gac-app-site-header__btn" onClick={logout}>
            خروج
          </button>
        </nav>
      </div>
    </motion.header>
  )
}
