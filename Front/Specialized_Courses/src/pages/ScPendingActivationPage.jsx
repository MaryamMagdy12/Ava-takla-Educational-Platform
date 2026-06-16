import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import '../assets/css/ScAuthPortal.css'

const MotionDiv = motion.div

export default function ScPendingActivationPage() {
  const location = useLocation()
  const email = location.state?.email?.trim() || ''

  return (
    <div id="pg-login-root">
      <MotionDiv
        className="pg-login__card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="pg-login__title">تفعيل الحساب عبر الكنيسة</h1>
        <p className="pg-login__hint">
          تم التحقق من بريدك{email ? (
            <>
              {' '}
              (<strong dir="ltr">{email}</strong>)
            </>
          ) : null}
          . حسابك غير مفعّل على المنصة بعد.
        </p>
        <p className="pg-login__hint">
          يرجى التواصل مع الكنيسة لتفعيل الحساب. كلمات المرور المؤقتة والدائمة تُعرض للمسؤول عند التفعيل (مثل
          الطلاب) ويُفضّل أن تسلّمك إياها الكنيسة — لا تُرسل في البريد قبل التفعيل.
        </p>
        <p className="pg-login__link-row" style={{ marginTop: 20 }}>
          <Link className="pg-login__link" to="/login">
            العودة لتسجيل الدخول
          </Link>
        </p>
      </MotionDiv>
    </div>
  )
}
