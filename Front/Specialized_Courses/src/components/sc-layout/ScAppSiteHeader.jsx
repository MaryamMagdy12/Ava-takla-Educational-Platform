import { motion } from 'framer-motion'
import { useScAuth } from '../../context/ScAuthContext.jsx'
import '../../assets/css/ScAppSiteHeader.css'

export default function ScAppSiteHeader() {
  const { logout } = useScAuth()

  return (
    <motion.header
      className="sc-app-site-header"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <div className="sc-app-site-header__inner">
        <img className="sc-app-site-header__logo" src="/school-logo.png" alt="" width="48" height="48" />
        <div className="sc-app-site-header__text">
          <span className="sc-app-site-header__title">الدورات المتخصصة — محتوى وامتحانات</span>
        </div>
        <nav className="sc-app-site-header__nav" aria-label="حساب الطالب">
          <button type="button" className="sc-app-site-header__btn" onClick={logout}>
            خروج
          </button>
        </nav>
      </div>
    </motion.header>
  )
}
