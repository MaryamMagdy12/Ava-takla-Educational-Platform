import axios from 'axios'
import { API_BASE } from './config'
import { getApiErrorMessage } from './apiError'

function emitErrorToast(message) {
  if (!message) return
  window.dispatchEvent(
    new CustomEvent('app:toast', {
      detail: {
        type: 'error',
        message,
      },
    }),
  )
}

const SESSION_KEY = 'academy-session-v1'

export function sessionToken() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw)?.token ?? null
  } catch {
    return null
  }
}

export const studentClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    Accept: 'application/json',
  },
})

studentClient.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  } else if (config.data && typeof config.data === 'object') {
    config.headers['Content-Type'] = 'application/json'
  }
  if (config.skipAuth) return config
  const t = sessionToken()
  if (t) config.headers.Authorization = `Bearer ${t}`
  return config
})

studentClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    const url = String(err.config?.url ?? '')
    if (
      status === 401 &&
      !url.includes('/auth/student/login') &&
      !url.includes('/auth/student/password-reset')
    ) {
      try {
        sessionStorage.removeItem(SESSION_KEY)
      } catch {
        /* ignore */
      }
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login')
      }
    }
    const msg = getApiErrorMessage(err)
    emitErrorToast(msg)
    const e = new Error(msg)
    e.status = status
    e.payload = err.response?.data
    return Promise.reject(e)
  },
)
