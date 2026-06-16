import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { postSpecialRegister } from '../api/specialAuthApi.js'
import '../assets/css/ScAuthPortal.css'

const MotionForm = motion.form
import LOGO_SRC from '../assets/images/انبا تكلا بجودة عالية جدا.png'

function quadNamePartsCount(fullName) {
  const t = String(fullName || "").trim()
  if (!t) return 0
  return t.split(/\s+/u).filter(Boolean).length
}

function formComplete(full_name, email, phone, address, age, birth_date, profile_picture) {
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const ageNum = Number(age)
  const ageOk = Number.isFinite(ageNum) && ageNum >= 3 && ageNum <= 120
  const birthOk = /^\d{4}-\d{2}-\d{2}$/.test(birth_date.trim())
  const photoOk = profile_picture instanceof File
  const quadOk = quadNamePartsCount(full_name) >= 4
  return (
    quadOk &&
    emailOk &&
    phone.trim().length > 3 &&
    address.trim().length > 3 &&
    ageOk &&
    birthOk &&
    photoOk
  )
}

export default function ScRegisterPage() {
  const navigate = useNavigate()
  const [full_name, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [age, setAge] = useState('')
  const [birth_date, setBirthDate] = useState('')
  const [profile_picture, setProfilePicture] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const canSubmit = formComplete(full_name, email, phone, address, age, birth_date, profile_picture)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    if (!canSubmit) {
      if (quadNamePartsCount(full_name) < 4) {
        setError('يجب إدخال الاسم الرباعي: أربعة أسماء على الأقل مفصولة بمسافات (الاسم الأول، الأب، الجد، العائلة).')
      } else {
        setError('تأكد من تعبئة جميع الحقول المطلوبة ورفع صورة شخصية للملف.')
      }
      return
    }
    setLoading(true)
    try {
      await postSpecialRegister({
        full_name: full_name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        age: Number(age),
        birth_date: birth_date.trim(),
        profile_picture,
      })
      navigate('/verify-email', { replace: true, state: { email: email.trim() } })
    } catch (err) {
      setError(err.message || 'تعذر التسجيل.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div id="pg-login-root">
      <div className="pg-login__brand-block">
        <img className="pg-login__brand-logo" src={LOGO_SRC} alt="" width="104" height="104" />
        <h1 className="pg-login__brand-title">المسارات المتخصصة</h1>
        <p className="pg-login__brand-tagline">تسجيل جديد</p>
        <p className="pg-login__brand-description">
          أكمل البيانات أدناه مع الاسم الرباعي (أربعة أجزاء على الأقل مفصولة بمسافات) وصورة شخصية إلزامية. لا تُختار
          كلمة مرور هنا — بعد التحقق من البريد يُفعّل المكتب حسابك في الكنيسة ويُصدر لك كلمات المرور (كما في حسابات
          الطلاب).
        </p>
      </div>
      <MotionForm
        onSubmit={onSubmit}
        className="pg-login__card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="pg-login__title">إنشاء حساب</h1>
        {error ? <div className="pg-login__error">{error}</div> : null}
        <label className="pg-login__label">
          الاسم الرباعي (الاسم الكامل)
          <input
            className="pg-login__input"
            value={full_name}
            onChange={(e) => setFullName(e.target.value)}
          
            autoComplete="name"
            required
          />
        </label>
        {/* <p className="pg-login__hint" style={{ marginTop: -6, marginBottom: 10 }}>
          أربعة أسماء على الأقل مفصولة بمسافات (الأول، الأب، الجد، العائلة).
        </p> */}
        <label className="pg-login__label">
          البريد الإلكتروني
          <input className="pg-login__input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="pg-login__label">
          الهاتف
          <input className="pg-login__input" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </label>
        <label className="pg-login__label">
          العنوان
          <input className="pg-login__input" value={address} onChange={(e) => setAddress(e.target.value)} required />
        </label>
        <label className="pg-login__label">
          العمر
          <input
            className="pg-login__input"
            type="number"
            inputMode="numeric"
            min={3}
            max={120}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            required
          />
        </label>
        <label className="pg-login__label">
          تاريخ الميلاد
          <input
            className="pg-login__input"
            type="date"
            value={birth_date}
            onChange={(e) => setBirthDate(e.target.value)}
            required
          />
        </label>
        <label className="pg-login__label">
          صورة الملف الشخصي (إلزامي)
          <input
            className="pg-login__input"
            type="file"
            accept="image/*"
            required
            onChange={(e) => setProfilePicture(e.target.files?.[0] ?? null)}
          />
        </label>
        <button type="submit" className="pg-login__submit" disabled={loading}>
          {loading ? 'جاري الإرسال…' : 'إنشاء الحساب وإرسال رمز التحقق'}
        </button>

        <p className="pg-login__link-row">
          <Link className="pg-login__link" to="/login">
            لديك حساب؟ تسجيل الدخول
          </Link>
        </p>
      </MotionForm>
    </div>
  )
}
