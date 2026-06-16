import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import '../../assets/css/toast.css'

const ToastContext = createContext(null)
const TOAST_EVENT = 'app:toast'

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const lastToastRef = useRef({ message: '', time: 0 })

  const showToast = useCallback((toast) => {
    const message = String(toast?.message ?? '').trim()
    if (!message) return
    const now = Date.now()
    if (lastToastRef.current.message === message && now - lastToastRef.current.time < 1200) {
      return
    }
    lastToastRef.current = { message, time: now }
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, type: toast.type || 'info', message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, toast.durationMs || 6000)
  }, [])

  useEffect(() => {
    const onToast = (event) => {
      const payload = event?.detail ?? {}
      if (!payload?.message) return
      showToast({
        type: payload.type || 'error',
        message: payload.message,
        durationMs: payload.durationMs,
      })
    }
    window.addEventListener(TOAST_EVENT, onToast)
    return () => window.removeEventListener(TOAST_EVENT, onToast)
  }, [showToast])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="gac-toast-root">
        {toasts.map((t) => (
          <div key={t.id} className={`gac-toast-item gac-toast-item--${t.type}`}>
            <span className="gac-toast-item-message">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
