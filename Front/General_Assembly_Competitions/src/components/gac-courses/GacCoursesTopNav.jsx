import { Link, useLocation } from 'react-router-dom'
import '../../assets/css/GacCoursesTopNav.css'

export default function GacCoursesTopNav() {
  const { pathname } = useLocation()
  const onCompetitions = pathname === '/competitions' || pathname.startsWith('/competitions/')
  return (
    <nav className="gac-courses-top-nav" aria-label="تنقل الجمعية العامة">
      <Link className={`gac-courses-top-nav__brand ${pathname === '/' ? 'gac-courses-top-nav__brand--active' : ''}`} to="/">
        الرئيسية
      </Link>
      <Link
        className={`gac-courses-top-nav__link ${pathname === '/courses' ? 'gac-courses-top-nav__link--active' : ''}`}
        to="/courses"
      >
        المقررات
      </Link>
      <Link
        className={`gac-courses-top-nav__link ${onCompetitions ? 'gac-courses-top-nav__link--active' : ''}`}
        to="/competitions"
      >
        المسابقات
      </Link>
    </nav>
  )
}
