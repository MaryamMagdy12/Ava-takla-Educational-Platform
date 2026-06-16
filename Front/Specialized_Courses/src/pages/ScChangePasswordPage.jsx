import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useScAuth } from '../context/ScAuthContext.jsx'
import '../assets/css/ScAuthPortal.css'

const MotionForm = motion.form

export default function ScChangePasswordPage() {
  const { isAuthenticated, mustChangePassword, changePassword } = useScAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!mustChangePassword) return <Navigate to="/" replace />

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.')
      return
    }
    setBusy(true)
    try {
      await changePassword(currentPassword, newPassword, confirmPassword)
    } catch (err) {
      setError(err.message || 'تعذر التحديث.')
    } finally {
      setBusy(false)
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
        <h1 className="pg-login__title">تغيير كلمة المرور</h1>
        <p className="pg-login__hint">
          أدخل كلمة المرور الحالية (المؤقتة أو الدائمة كما في بريد الترحيب)، ثم أدخل كلمة المرور الدائمة الرسمية مرتين
          ككلمة جديدة — بنفس منطق حسابات الطلاب.
        </p>
        {error ? <div className="pg-login__error">{error}</div> : null}
        <label className="pg-login__label">
          كلمة المرور الحالية
          <input
            className="pg-login__input"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        <label className="pg-login__label">
          كلمة المرور الدائمة الرسمية
          <input
            className="pg-login__input"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </label>
        <label className="pg-login__label">
          تأكيد الدائمة
          <input
            className="pg-login__input"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </label>
        <button type="submit" className="pg-login__submit" disabled={busy}>
          {busy ? 'جاري الحفظ…' : 'حفظ ومتابعة'}
        </button>
      </MotionForm>
    </div>
  )
}
