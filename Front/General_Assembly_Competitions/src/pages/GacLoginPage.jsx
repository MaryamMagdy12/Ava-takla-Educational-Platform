import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGacAuth } from '../context/GacAuthContext.jsx'
import { gacClearAuthStorage } from '../api/config.js'
import '../assets/css/GacLoginPage.css'

const MotionForm = motion.form
import LOGO_SRC from '../assets/images/انبا تكلا بجودة عالية جدا.png'

export default function GacLoginPage() {
  const { login, isAuthenticated, mustChangePassword } = useGacAuth()
  const location = useLocation()
  const from = location.state?.from && location.state.from !== '/login' ? location.state.from : '/'

  const [family_login_id, setFamilyLoginId] = useState('')
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
    const id = family_login_id.trim().replace(/\D/g, '').slice(0, 8)
    if (id.length !== 8) {
      setError('رقم العائلة يجب أن يكون ٨ أرقام.')
      return
    }
    gacClearAuthStorage()
    setLoading(true)
    try {
      await login(id, password, from)
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
        <h1 className="pg-login__brand-title">مسابقات الاجتماع العام</h1>
        <p className="pg-login__brand-tagline">تسجيل الدخول</p>
        <p className="pg-login__brand-description">
          بوابة العائلات: سجّل الدخول بالرقم الثماني وكلمة المرور المؤقتة من الإدارة، ثم عيّن كلمة المرور الدائمة الرسمية Ga#… عند أول دخول.
        </p>
      </div>
      <MotionForm
        onSubmit={onSubmit}
        className="pg-login__card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="pg-login__title">تسجيل الدخول</h1>
        <p className="pg-login__hint">استخدم كلمة المرور المؤقتة أولًا؛ الدائمة الصادرة من النظام تُدخل في خطوة «تغيير كلمة المرور» بعد الدخول.</p>
        {error ? <div className="pg-login__error">{error}</div> : null}
        <label className="pg-login__label">
          رقم العائلة (٨ أرقام)
          <input
            className="pg-login__input"
            name="family_login_id"
            inputMode="numeric"
            autoComplete="username"
            maxLength={8}
            value={family_login_id}
            onChange={(e) => setFamilyLoginId(e.target.value.replace(/\D/g, '').slice(0, 8))}
            required
          />
        </label>
        <label className="pg-login__label">
          كلمة المرور
          <input
            className="pg-login__input"
            name="password"
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
      </MotionForm>
    </div>
  )
}
