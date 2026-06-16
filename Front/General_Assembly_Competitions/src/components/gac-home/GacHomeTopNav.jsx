import { Link, useLocation } from 'react-router-dom'
import '../../assets/css/GacHomeTopNav.css'

export default function GacHomeTopNav() {
  const { pathname } = useLocation()
  const onCompetitions = pathname === '/competitions' || pathname.startsWith('/competitions/')
  return (
    <nav className="gac-home-top-nav" aria-label="تنقل رئيسي">
      <span className="gac-home-top-nav__label">الجمعية العامة</span>
      <Link className={`gac-home-top-nav__link ${pathname === '/' ? 'gac-home-top-nav__link--on' : ''}`} to="/">
        الرئيسية
      </Link>
      <Link className={`gac-home-top-nav__link ${pathname === '/courses' ? 'gac-home-top-nav__link--on' : ''}`} to="/courses">
        المقررات
      </Link>
      <Link className={`gac-home-top-nav__link ${onCompetitions ? 'gac-home-top-nav__link--on' : ''}`} to="/competitions">
        المسابقات
      </Link>
    </nav>
  )
}
