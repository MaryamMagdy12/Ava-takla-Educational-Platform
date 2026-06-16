import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PasswordForm from '../components/auth/PasswordForm'
import '../assets/css/ForcePasswordChangePage.css'

export default function ForcePasswordChangePage() {
  const { isAuthenticated, mustChangePassword, changePassword } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('Temp@123')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!mustChangePassword) return <Navigate to="/" replace />

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    if (newPassword.length < 8) return setError('يجب ألا تقل كلمة المرور عن 8 أحرف.')
    if (newPassword !== confirmPassword) return setError('كلمتا المرور غير متطابقتين.')
    setBusy(true)
    try {
      await changePassword(currentPassword, newPassword)
      navigate('/')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div id="pg-force-password-root">
      <section className="pg-force-password__card">
        <h1 className="pg-force-password__title">تغيير كلمة المرور</h1>
        <p className="pg-force-password__hint">يتطلب تسجيل الدخول الأول تعيين كلمة مرور آمنة.</p>
        {error ? <div className="pg-force-password__error">{error}</div> : null}
        <PasswordForm
          currentPassword={currentPassword}
          newPassword={newPassword}
          confirmPassword={confirmPassword}
          onCurrentPasswordChange={setCurrentPassword}
          onNewPasswordChange={setNewPassword}
          onConfirmPasswordChange={setConfirmPassword}
          onSubmit={onSubmit}
          submitLabel="حفظ كلمة المرور"
          busy={busy}
          formClassName="pg-force-password__form"
          labelClassName="pg-force-password__label"
          inputClassName="pg-force-password__input"
          buttonClassName="pg-force-password__submit"
        />
      </section>
    </div>
  )
}
