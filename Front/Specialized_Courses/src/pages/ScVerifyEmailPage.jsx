import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { postSpecialResendVerification } from '../api/specialAuthApi.js'
import { useScAuth } from '../context/ScAuthContext.jsx'
import '../assets/css/ScAuthPortal.css'

const MotionForm = motion.form

export default function ScVerifyEmailPage() {
  const location = useLocation()
  const email = location.state?.email?.trim() || ''
  const { verifyEmail, isAuthenticated } = useScAuth()
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendBusy, setResendBusy] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  if (!email) {
    return <Navigate to="/register" replace />
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setMsg('')
    if (otp.trim().length !== 6) {
      setError('أدخل الرمز المكوّن من ٦ أرقام.')
      return
    }
    setLoading(true)
    try {
      await verifyEmail(email, otp.trim())
    } catch (err) {
      setError(err.message || 'رمز غير صالح.')
    } finally {
      setLoading(false)
    }
  }

  async function resend() {
    setError('')
    setMsg('')
    setResendBusy(true)
    try {
      await postSpecialResendVerification(email)
      setMsg('إن وُجد حساب غير مُفعّل لهذا البريد، أُرسل رمز جديد.')
    } catch (err) {
      setError(err.message || 'تعذر الإرسال.')
    } finally {
      setResendBusy(false)
    }
  }

  return (
    <div id="pg-login-root">
      <MotionForm
        onSubmit={onSubmit}
        className="pg-login__card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="pg-login__title">تفعيل البريد</h1>
        <p className="pg-login__hint">
          أُرسل رمز مكوّن من ٦ أرقام إلى <strong dir="ltr">{email}</strong>
        </p>
        {error ? <div className="pg-login__error">{error}</div> : null}
        {msg ? <div className="pg-login__hint" style={{ color: '#2d6a2d' }}>{msg}</div> : null}
        <label className="pg-login__label">
          رمز التحقق
          <input
            className="pg-login__input"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
          />
        </label>
        <button type="submit" className="pg-login__submit" disabled={loading}>
          {loading ? 'جاري التحقق…' : 'تفعيل البريد'}
        </button>
        <button type="button" className="pg-login__submit" style={{ marginTop: 8, opacity: 0.9 }} disabled={resendBusy} onClick={resend}>
          {resendBusy ? '…' : 'إعادة إرسال الرمز'}
        </button>
        <p className="pg-login__link-row">
          <Link className="pg-login__link" to="/login">
            العودة لتسجيل الدخول
          </Link>
        </p>
      </MotionForm>
    </div>
  )
}
