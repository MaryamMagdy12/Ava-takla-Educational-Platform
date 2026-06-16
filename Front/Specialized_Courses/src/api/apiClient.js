import axios from 'axios'
import { API_BASE, scClearAuthStorage, scReadLearnerToken } from './config'

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

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
  headers: { Accept: 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const t = scReadLearnerToken()
  if (t) config.headers.Authorization = `Bearer ${t}`
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    const url = String(err.config?.url ?? '')
    if (status === 401 && !url.includes('/auth/special/login') && !url.includes('/special/verify')) {
      scClearAuthStorage()
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/verify')) {
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
