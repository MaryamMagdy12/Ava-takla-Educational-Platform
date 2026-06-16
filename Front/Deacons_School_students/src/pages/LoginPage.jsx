import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import '../assets/css/LoginPage.css'

const MotionForm = motion.form
const LOGO_SRC = '/school-logo.png'

export default function LoginPage() {
  const { login, loading, isAuthenticated, mustChangePassword, sessionVerifying } = useAuth()
  const [studentId, setStudentId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const rawRedirect = location.state?.from?.pathname || '/'
  const redirectPath = rawRedirect === '/login' ? '/' : rawRedirect

  if (isAuthenticated && !sessionVerifying) {
    const target = mustChangePassword ? '/change-password' : redirectPath
    return <Navigate to={target} replace />
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    const sid = studentId.trim()
    if (sid.length !== 8) {
      setError('يجب أن يتكون رقم الطالب من 8 أحرف بالضبط كما هو مطلوب في واجهة البرمجة.')
      return
    }
    try {
      const session = await login(sid, password)
      navigate(session.mustChangePassword ? '/change-password' : redirectPath, { replace: true })
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div id="pg-login-root">
      <div className="pg-login__brand-block">
        <img className="pg-login__brand-logo" src={LOGO_SRC} alt="" width="104" height="104" />
        <h1 className="pg-login__brand-title">مدرسة الأنبا تكلا هيمانوت للشمامسة</h1>
        <p className="pg-login__brand-tagline">تسجيل الدخول</p>
        <p className="pg-login__brand-description">
          تسجيل الدخول للوصول إلى الامتحانات والكتب والمحاضرات.
        </p>
      </div>
      <MotionForm
        onSubmit={onSubmit}
        className="pg-login__card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="pg-login__title">تسجيل الدخول</h1>
        <p className="pg-login__hint">استخدم رقم الطالب وكلمة المرور التي تم إنشاؤها من الإدارة.</p>
        {error ? <div className="pg-login__error">{error}</div> : null}
        <label className="pg-login__label">
          رقم الطالب
          <input
            className="pg-login__input"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            required
            minLength={8}
            maxLength={8}
            autoComplete="username"
          />
        </label>
        <label className="pg-login__label">
          كلمة المرور
          <input
            className="pg-login__input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button disabled={loading} className="pg-login__submit" type="submit">
          {loading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
        </button>
      </MotionForm>
    </div>
  )
}
