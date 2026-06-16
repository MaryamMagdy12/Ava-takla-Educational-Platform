import { Link, useLocation } from 'react-router-dom'
import '../../assets/css/GacExamsTopNav.css'

export default function GacExamsTopNav() {
  const { pathname } = useLocation()
  const onCompetitions = pathname === '/competitions' || pathname.startsWith('/competitions/')
  return (
    <nav className="gac-exams-top-nav" aria-label="تنقل المسابقات">
      <Link className={`gac-exams-top-nav__item ${pathname === '/' ? 'gac-exams-top-nav__item--current' : ''}`} to="/">
        الرئيسية
      </Link>
      <Link
        className={`gac-exams-top-nav__item ${pathname === '/courses' ? 'gac-exams-top-nav__item--current' : ''}`}
        to="/courses"
      >
        المقررات
      </Link>
      <Link
        className={`gac-exams-top-nav__item ${onCompetitions ? 'gac-exams-top-nav__item--current' : ''}`}
        to="/competitions"
      >
        المسابقات
      </Link>
    </nav>
  )
}
