/** Laravel API base URL (no trailing slash). */

const useRemoteApiInDev = import.meta.env.VITE_API_USE_REMOTE === 'true'
const laravelPort = String(import.meta.env.VITE_LARAVEL_PORT || '8000').trim()

/** Avoid `localhost` in API URL: on Windows it often resolves to IPv6 (::1) while `php -S` listens on IPv4 only → ERR_NETWORK. */
function apiHostFromBrowserHostname(hostname) {
  if (!hostname || hostname === 'null') return '127.0.0.1'
  const h = hostname.toLowerCase()
  if (h === 'localhost' || h === '[::1]' || h === '::1') return '127.0.0.1'
  return hostname
}

/** Normalize `VITE_API_URL` the same way (e.g. http://localhost:8000/api → http://127.0.0.1:8000/api). */
function withIpv4LocalhostUrl(url) {
  const trimmed = url?.replace(/\/$/, '').trim() ?? ''
  if (!trimmed) return ''
  try {
    const u = new URL(trimmed)
    const h = apiHostFromBrowserHostname(u.hostname)
    if (h !== u.hostname) {
      u.hostname = h
      return u.toString().replace(/\/$/, '').trim()
    }
  } catch {
    return trimmed
  }
  return trimmed
}

const envApiUrl = withIpv4LocalhostUrl(import.meta.env.VITE_API_URL)

function getDefaultApiBase() {
  if (typeof window === 'undefined') return `http://127.0.0.1:${laravelPort}/api`
  const { protocol, hostname } = window.location
  return `${protocol}//${apiHostFromBrowserHostname(hostname)}:${laravelPort}/api`
}

/**
 * Dev: call Laravel directly at `http(s)://<same-host>:{port}/api` (default port 8000).
 * Same-origin `/api` + Vite proxy breaks large multipart uploads (Node in the middle).
 * LAN: open http://192.168.x.x:5177 → API is http://192.168.x.x:8000/api — run
 * `php artisan serve --host=0.0.0.0 --port=8000` so that address is reachable.
 * Override: `VITE_API_USE_REMOTE=true` + `VITE_API_URL=…` (staging) or `VITE_LARAVEL_PORT=…`.
 */
function getDevApiBase() {
  if (typeof window === 'undefined') return `http://127.0.0.1:${laravelPort}/api`
  if (useRemoteApiInDev && envApiUrl) {
    return envApiUrl
  }
  const origin = window.location.origin
  if (origin && origin !== 'null' && !origin.startsWith('file:')) {
    try {
      const u = new URL(origin)
      const host = apiHostFromBrowserHostname(u.hostname)
      return `${u.protocol}//${host}:${laravelPort}/api`
    } catch {
      return `${origin}/api`
    }
  }
  return `http://127.0.0.1:${laravelPort}/api`
}

export const API_BASE = (() => {
  if (import.meta.env.DEV) {
    return getDevApiBase()
  }
  return envApiUrl || getDefaultApiBase()
})()

/** Origin without `/api`, for `/storage/...` learner photos (matches Laravel public disk). */
export const API_ORIGIN = API_BASE.replace(/\/api\/?$/i, "")

export const ADMIN_TOKEN_KEY = "admin_token"
export const ADMIN_SESSION_KEY = "admin_session"

function isInvalidAdminToken(token) {
  return !token || token === "preview-mode-token" || token === "demo-secure-token"
}

function readAdminString(key) {
  if (typeof window === "undefined") return null
  try {
    let value = sessionStorage.getItem(key)
    if (value != null && value !== "") return value
    const legacy = localStorage.getItem(key)
    if (legacy == null || legacy === "") return null
    sessionStorage.setItem(key, legacy)
    localStorage.removeItem(key)
    return legacy
  } catch {
    return null
  }
}

export function adminReadToken() {
  const token = readAdminString(ADMIN_TOKEN_KEY)
  if (isInvalidAdminToken(token)) {
    adminClearAuthStorage()
    return null
  }
  return token
}

export function adminReadSession() {
  if (typeof window === "undefined") return null
  try {
    const raw = readAdminString(ADMIN_SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function adminWriteToken(token) {
  if (typeof window === "undefined") return
  try {
    if (token == null || token === "") {
      sessionStorage.removeItem(ADMIN_TOKEN_KEY)
    } else {
      sessionStorage.setItem(ADMIN_TOKEN_KEY, token)
    }
    localStorage.removeItem(ADMIN_TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

export function adminWriteSession(session) {
  if (typeof window === "undefined") return
  try {
    if (!session) {
      sessionStorage.removeItem(ADMIN_SESSION_KEY)
    } else {
      sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session))
    }
    localStorage.removeItem(ADMIN_SESSION_KEY)
  } catch {
    /* ignore */
  }
}

export function adminClearAuthStorage() {
  if (typeof window === "undefined") return
  try {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY)
    sessionStorage.removeItem(ADMIN_SESSION_KEY)
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    localStorage.removeItem(ADMIN_SESSION_KEY)
  } catch {
    /* ignore */
  }
}
