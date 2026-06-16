import axios from 'axios'
import { API_BASE, gacClearAuthStorage, gacGetToken } from './config'

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

const DEFAULT_TIMEOUT_MS = 60_000
const MULTIPART_TIMEOUT_MS = 0

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: DEFAULT_TIMEOUT_MS,
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
  headers: { Accept: 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
    config.timeout = MULTIPART_TIMEOUT_MS
  }
  const t = gacGetToken()
  if (t) {
    config.headers.Authorization = `Bearer ${t}`
  }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    const url = String(err.config?.url ?? '')
    if (status === 401 && !url.includes('/auth/family/login')) {
      gacClearAuthStorage()
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login')
      }
    }
    const fieldErrors =
      err.response?.data?.errors && typeof err.response.data.errors === 'object'
        ? Object.values(err.response.data.errors).flat().join(' ')
        : ''
    const msg =
      err.response?.data?.message || fieldErrors || err.message || 'Request failed'
    emitErrorToast(msg)
    const e = new Error(msg)
    e.status = status
    e.payload = err.response?.data
    return Promise.reject(e)
  },
)
