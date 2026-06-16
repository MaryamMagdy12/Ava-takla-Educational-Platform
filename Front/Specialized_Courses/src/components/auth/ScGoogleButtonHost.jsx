import { useEffect, useRef } from 'react'
import { GOOGLE_CLIENT_ID } from '../../api/config.js'

/* Keep callback stable for GSI initialize — parent may pass inline handlers. */
function useLatestCallback(fn) {
  const ref = useRef(fn)
  ref.current = fn
  return ref
}

const GSI_SRC = 'https://accounts.google.com/gsi/client'

function loadGsiScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve()
      return
    }
    const existing = document.querySelector(`script[src="${GSI_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Failed to load Google script')))
      return
    }
    const s = document.createElement('script')
    s.src = GSI_SRC
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Failed to load Google script'))
    document.body.appendChild(s)
  })
}

/**
 * @param {{ disabled?: boolean, text?: 'signin_with' | 'signup_with' | 'continue_with', onCredential: (jwt: string) => void }} props
 */
export default function ScGoogleButtonHost({ disabled = false, text = 'continue_with', onCredential }) {
  const ref = useRef(null)
  const clientId = GOOGLE_CLIENT_ID
  const onCredRef = useLatestCallback(onCredential)

  useEffect(() => {
    if (!clientId || disabled) return undefined

    let cancelled = false
    ;(async () => {
      try {
        await loadGsiScript()
        if (cancelled || !ref.current) return
        ref.current.innerHTML = ''
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (res) => {
            if (res?.credential) onCredRef.current(res.credential)
          },
        })
        window.google.accounts.id.renderButton(ref.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text,
          locale: 'ar',
          width: Math.max(220, Math.min(320, (ref.current.clientWidth || 320) - 8)),
        })
      } catch {
        if (ref.current) ref.current.textContent = 'تعذر تحميل تسجيل الدخول عبر Google.'
      }
    })()

    return () => {
      cancelled = true
    }
  }, [clientId, disabled, text, onCredRef])

  if (!clientId) {
    return (
      <p className="pg-login__hint pg-login__hint--google-missing">
        لم يُضبط تسجيل الدخول عبر Google. أضف <code dir="ltr">GOOGLE_CLIENT_ID</code> أو{' '}
        <code dir="ltr">VITE_GOOGLE_CLIENT_ID</code> في إعدادات البيئة، ثم أعد تشغيل الخادم. راجع أيضًا أصول
        JavaScript المصرّح بها في Google Cloud Console لعنوان التطبيق (مثل <code dir="ltr">http://localhost:5175</code>
        ).
      </p>
    )
  }

  if (disabled) {
    return (
      <p className="pg-login__hint" style={{ opacity: 0.75 }}>
        أكمل جميع الحقول أعلاه لتفعيل «متابعة مع Google» (للمستخدمين الجدد).
      </p>
    )
  }

  return <div ref={ref} style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: 8, overflow: 'hidden' }} />
}
