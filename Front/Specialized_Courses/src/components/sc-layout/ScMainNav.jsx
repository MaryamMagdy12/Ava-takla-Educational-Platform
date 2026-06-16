import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, ClipboardList, GraduationCap, LayoutGrid, Layers } from 'lucide-react'
import { useScAuth } from '../../context/ScAuthContext.jsx'
import ScLearnerAvatar from '../sc-ui/ScLearnerAvatar.jsx'
import { resolveSpecialLearnerPhotoUrl } from '../../utils/specialLearnerPhoto.js'
import '../../assets/css/ScMainNav.css'

const links = [
  { to: '/', label: 'الرئيسية', end: true, Icon: LayoutGrid },
  { to: '/exams', label: 'الامتحانات', end: false, Icon: GraduationCap },
  { to: '/courses', label: 'المقررات', end: false, Icon: Layers },
  { to: '/questionnaires', label: 'الاستبيانات', end: false, Icon: ClipboardList },
]

export default function ScMainNav() {
  const { user, logout } = useScAuth()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const displayName = user?.full_name?.trim() || 'متعلّم'
  const subLine = user?.email ? String(user.email) : 'الدورات المتخصصة'
  const photoUrl = resolveSpecialLearnerPhotoUrl(user)

  const onLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header id="pg-navbar-root">
      <div id="pg-navbar-inner">
        <div id="pg-navbar-brand">
          <div className="pg-navbar-logo-ring" aria-hidden="true" />
          <div className="pg-navbar-brand-text">
            <span className="pg-navbar-brand-title">الدورات المتخصصة</span>
            <span className="pg-navbar-brand-sub">منصة التعلّم والامتحانات</span>
          </div>
        </div>

        <button
          type="button"
          id="pg-navbar-toggle"
          className={isMobileMenuOpen ? 'pg-navbar__toggle-btn pg-navbar__toggle-btn--open' : 'pg-navbar__toggle-btn'}
          aria-expanded={isMobileMenuOpen}
          aria-controls="pg-navbar-mobile-panel"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
        >
          <span className="pg-navbar__toggle-line" />
          <span className="pg-navbar__toggle-line" />
          <span className="pg-navbar__toggle-line" />
        </button>

        <div
          id="pg-navbar-mobile-panel"
          className={isMobileMenuOpen ? 'pg-navbar__panel pg-navbar__panel--open' : 'pg-navbar__panel'}
        >
          <nav id="pg-navbar-menu" aria-label="التنقل الرئيسي">
            {links.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `pg-navbar__link${isActive ? ' pg-navbar__link--active' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.Icon className="pg-navbar__link-icon" size={18} strokeWidth={2} aria-hidden />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div id="pg-navbar-actions">
            <button type="button" className="pg-navbar-bell" aria-label="الإشعارات">
              <Bell className="pg-navbar-bell-icon" size={20} strokeWidth={2} aria-hidden />
              <span className="pg-navbar-bell-dot" />
            </button>

            <div id="pg-navbar-profile">
              <button
                type="button"
                id="pg-navbar-profile-trigger"
                aria-expanded={isProfileOpen}
                onClick={() => setIsProfileOpen((prev) => !prev)}
              >
                <span className="pg-navbar-profile-text">
                  <span id="pg-navbar-student-name">{displayName}</span>
                  <span id="pg-navbar-student-level">{subLine}</span>
                </span>
                <ScLearnerAvatar
                  className="pg-navbar-profile-avatar"
                  photoUrl={photoUrl}
                  name={displayName}
                  title={displayName}
                />
                <ChevronDown className="pg-navbar-profile-chevron" size={16} strokeWidth={2} aria-hidden />
              </button>
              <div
                className={
                  isProfileOpen ? 'pg-navbar-profile-menu pg-navbar-profile-menu--open' : 'pg-navbar-profile-menu'
                }
              >
                <NavLink to="/profile" className="pg-navbar-profile-item" onClick={() => setIsProfileOpen(false)}>
                  الحساب الشخصي
                </NavLink>
                <button type="button" id="pg-navbar-logout" onClick={onLogout}>
                  تسجيل الخروج
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
