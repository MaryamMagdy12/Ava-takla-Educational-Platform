import { Link } from 'react-router-dom'
import '../../assets/css/ScDetailStickyNav.css'

export default function ScDetailStickyNav({ title }) {
  return (
    <nav className="sc-detail-sticky-nav" aria-label="تنقل الدورة">
      <Link className="sc-detail-sticky-nav__back" to="/courses">
        ← كل المقررات
      </Link>
      {title ? <span className="sc-detail-sticky-nav__slug">{title}</span> : null}
    </nav>
  )
}
