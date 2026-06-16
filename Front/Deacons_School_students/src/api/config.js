/** Laravel API base must end with `/api` (axios paths are like `/auth/student/login`). */
function ensureApiBase(url) {
  const raw = String(url ?? '')
    .trim()
    .replace(/\/+$/, '')
  if (!raw) return raw
  if (/\/api$/i.test(raw)) return raw
  return `${raw}/api`
}

function getDefaultApiBase() {
  if (typeof window === 'undefined') return 'http://127.0.0.1:8000/api'
  if (import.meta.env.DEV) {
    return `${window.location.origin}/api`
  }
  const { protocol, hostname } = window.location
  return `${protocol}//${hostname}:8000/api`
}

export const API_BASE = ensureApiBase(
  import.meta.env.VITE_API_URL?.replace(/\/$/, '').trim() || getDefaultApiBase(),
)

/** Origin without `/api`, for `/storage/...` links. */
export const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '')
