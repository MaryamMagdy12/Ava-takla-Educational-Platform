import { Link, useLocation } from 'react-router-dom'
import '../../assets/css/ScHomeNavBar.css'

export default function ScHomeNavBar() {
  const { pathname } = useLocation()
  return (
    <header className="sc-home-nav-bar">
      <Link className="sc-home-nav-bar__logo" to="/">
        دورات متخصصة
      </Link>
      <nav className="sc-home-nav-bar__links" aria-label="التنقل">
        <Link className={`sc-home-nav-bar__a ${pathname === '/' ? 'sc-home-nav-bar__a--here' : ''}`} to="/">
          المقدمة
        </Link>
        <Link
          className={`sc-home-nav-bar__a ${pathname.startsWith('/courses') ? 'sc-home-nav-bar__a--here' : ''}`}
          to="/courses"
        >
          الدورات والامتحانات
        </Link>
      </nav>
    </header>
  )
}
