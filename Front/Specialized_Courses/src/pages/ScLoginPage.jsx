import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useScAuth } from '../context/ScAuthContext.jsx'
import { scClearAuthStorage } from '../api/config.js'
import ScGoogleButtonHost from '../components/auth/ScGoogleButtonHost.jsx'
import '../assets/css/ScAuthPortal.css'

const MotionForm = motion.form
import LOGO_SRC from '../assets/images/انبا تكلا بجودة عالية جدا.png'

export default function ScLoginPage() {
  const { login, loginWithGoogle, isAuthenticated, mustChangePassword } = useScAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const from = location.state?.from && location.state.from !== '/login' ? location.state.from : '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) {
    const target = mustChangePassword ? '/change-password' : from
    return <Navigate to={target} replace />
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    scClearAuthStorage()
    setLoading(true)
    try {
      const result = await login(email.trim(), password, from)
      if (result?.requiresOtp) {
        navigate('/verify-login', { replace: true, state: { email: result.email || email.trim(), from } })
        return
      }
    } catch (err) {
      setError(err.message || 'فشل تسجيل الدخول.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div id="pg-login-root">
      <div className="pg-login__brand-block">
        <img className="pg-login__brand-logo" src={LOGO_SRC} alt="" width="104" height="104" />
        <h1 className="pg-login__brand-title">الدورات المتخصصة</h1>
        <p className="pg-login__brand-tagline">تسجيل الدخول</p>
        <p className="pg-login__brand-description">
          بالبريد وكلمة المرور (المؤقتة أو الدائمة كما في بريد الترحيب): بعد التحقق من كلمة المرور يُرسل رمز إلى بريدك
          لإتمام الدخول. تسجيل الدخول بـ Google يستخدم نفس خطوة رمز البريد بعد التحقق من هوية Google.
        </p>
      </div>
      <MotionForm
        onSubmit={onSubmit}
        className="pg-login__card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="pg-login__title">تسجيل الدخول</h1>
        {error ? <div className="pg-login__error">{error}</div> : null}
        <label className="pg-login__label">
          البريد الإلكتروني
          <input
            className="pg-login__input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="pg-login__label">
          كلمة المرور
          <input
            className="pg-login__input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button type="submit" className="pg-login__submit" disabled={loading}>
          {loading ? 'جاري التحقق…' : 'دخول'}
        </button>

        <p className="pg-login__hint" style={{ marginTop: 12 }}>
          أو تابع مع Google (يُرسل رمز تحقق إلى بريدك لإتمام الدخول، مثل تسجيل الدخول بالبريد وكلمة المرور):
        </p>
        <ScGoogleButtonHost
          text="signin_with"
          onCredential={async (credential) => {
            setError('')
            setLoading(true)
            try {
              const r = await loginWithGoogle(credential, from)
              if (r?.requiresOtp) {
                navigate('/verify-login', { replace: true, state: { email: r.email || email.trim(), from } })
              }
            } catch (err) {
              setError(err.message || 'فشل Google.')
            } finally {
              setLoading(false)
            }
          }}
        />

        <p className="pg-login__link-row">
          <Link className="pg-login__link" to="/register">
            ليس لديك حساب؟ سجّل من هنا
          </Link>
        </p>
      </MotionForm>
    </div>
  )
}
