import { Link, useLocation } from 'react-router-dom'
import '../../assets/css/ScProgramsRailNav.css'

export default function ScProgramsRailNav() {
  const { pathname } = useLocation()
  return (
    <div className="sc-programs-rail-nav">
      <Link
        className={`sc-programs-rail-nav__pill ${pathname === '/' ? 'sc-programs-rail-nav__pill--active' : ''}`}
        to="/"
      >
        مقدمة
      </Link>
      <Link
        className={`sc-programs-rail-nav__pill ${pathname === '/courses' ? 'sc-programs-rail-nav__pill--active' : ''}`}
        to="/courses"
      >
        الدورات
      </Link>
    </div>
  )
}
