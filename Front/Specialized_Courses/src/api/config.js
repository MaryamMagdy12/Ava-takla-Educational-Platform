/** Google Identity Services Web client ID (same value as Laravel `GOOGLE_CLIENT_ID`). Resolved in `vite.config.js` from Front `.env`, Backend `.env`, or `process.env`. */
export { GOOGLE_CLIENT_ID } from 'virtual:google-client-id'

const useRemoteApiInDev = import.meta.env.VITE_API_USE_REMOTE === 'true'
const laravelPort = String(import.meta.env.VITE_LARAVEL_PORT || '8000').trim()

/** Windows: `localhost` often resolves to IPv6 (::1) while PHP built-in server is IPv4 → ERR_NETWORK. */
function apiHostFromBrowserHostname(hostname) {
  if (!hostname || hostname === 'null') return '127.0.0.1'
  const h = hostname.toLowerCase()
  if (h === 'localhost' || h === '[::1]' || h === '::1') return '127.0.0.1'
  return hostname
}

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

/** Axios paths omit `/api` — base URL must end with `/api`. */
function ensureEndsWithApi(base) {
  const b = String(base ?? '')
    .trim()
    .replace(/\/+$/, '')
  if (!b) return b
  return /\/api$/i.test(b) ? b : `${b}/api`
}

/**
 * Dev: `http(s)://<same-host-as-the-browser>:8000/api` so phones on Wi‑Fi hit your PC
 * (`http://192.168.x.x:8000`), not `127.0.0.1` (which is the device itself → Network Error).
 * Run Laravel: `php artisan serve --host=0.0.0.0 --port=8000`.
 */
function getDevApiBase() {
  if (typeof window === 'undefined') {
    return `http://127.0.0.1:${laravelPort}/api`
  }
  if (useRemoteApiInDev && envApiUrl) {
    return envApiUrl
  }
  try {
    const u = new URL(window.location.origin)
    if (u.hostname && u.hostname !== 'null' && !window.location.origin.startsWith('file:')) {
      const host = apiHostFromBrowserHostname(u.hostname)
      return `${u.protocol}//${host}:${laravelPort}/api`
    }
  } catch {
    // fall through
  }
  return `http://127.0.0.1:${laravelPort}/api`
}

/** Laravel API base including `/api` (same convention as Admin_side). */
export const API_BASE = ensureEndsWithApi(
  (() => {
    if (import.meta.env.DEV) {
      return getDevApiBase()
    }
    if (envApiUrl) {
      return envApiUrl
    }
    if (typeof window !== 'undefined' && window.location?.hostname) {
      const host = apiHostFromBrowserHostname(window.location.hostname)
      return `${window.location.protocol}//${host}:${laravelPort}/api`
    }
    return `http://127.0.0.1:${laravelPort}/api`
  })(),
)

/**
 * Absolute URL to a `public` disk file (`storage/app/public/...` → `/storage/...`).
 * @param {string|null|undefined} filePath
 */
export function storagePublicUrl(filePath) {
  if (!filePath) return ''
  const s = String(filePath).trim()
  if (/^https?:\/\//i.test(s)) return s
  const rel = s.replace(/^\/+/, '')
  const origin = API_BASE.replace(/\/api\/?$/, '')
  return `${origin}/storage/${rel}`
}

/** @deprecated use SC_LEARNER_TOKEN_KEY — kept for one-time migration */
export const SC_STUDENT_TOKEN_KEY = 'sc_student_token'

export const SC_LEARNER_TOKEN_KEY = 'sc_learner_token'

export const SC_MUST_CHANGE_KEY = 'sc_learner_must_change_password'

/** Cached special learner profile (JSON) for navbar / profile between sessions. */
export const SC_USER_KEY = 'sc_learner_user'

/**
 * Special-learner auth in `sessionStorage` so a new tab or browser session starts on login
 * (no silent reuse of the last account). Refresh in the same tab keeps the session.
 * Legacy `localStorage` values are moved into this tab’s session once, then removed from local.
 */
function readScString(key) {
  if (typeof window === 'undefined') return null
  try {
    let v = sessionStorage.getItem(key)
    if (v != null && v !== '') return v
    const legacy = localStorage.getItem(key)
    if (legacy == null || legacy === '') return null
    sessionStorage.setItem(key, legacy)
    localStorage.removeItem(key)
    return legacy
  } catch {
    return null
  }
}

/** Bearer token: current key, then deprecated `sc_student_token`, migrated from localStorage. */
export function scReadLearnerToken() {
  let t = readScString(SC_LEARNER_TOKEN_KEY)
  if (t) return t
  t = readScString(SC_STUDENT_TOKEN_KEY)
  if (t) {
    try {
      sessionStorage.setItem(SC_LEARNER_TOKEN_KEY, t)
      sessionStorage.removeItem(SC_STUDENT_TOKEN_KEY)
      localStorage.removeItem(SC_LEARNER_TOKEN_KEY)
      localStorage.removeItem(SC_STUDENT_TOKEN_KEY)
    } catch {
      /* ignore */
    }
  }
  return t
}

export function scGetMustChangePasswordStored() {
  return readScString(SC_MUST_CHANGE_KEY) === '1'
}

export function scGetUserStored() {
  if (typeof window === 'undefined') return null
  try {
    let raw = sessionStorage.getItem(SC_USER_KEY)
    if (!raw) {
      raw = localStorage.getItem(SC_USER_KEY)
      if (raw) {
        sessionStorage.setItem(SC_USER_KEY, raw)
        localStorage.removeItem(SC_USER_KEY)
      }
    }
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function scSetLearnerToken(value) {
  if (typeof window === 'undefined') return
  try {
    if (value == null || value === '') {
      sessionStorage.removeItem(SC_LEARNER_TOKEN_KEY)
    } else {
      sessionStorage.setItem(SC_LEARNER_TOKEN_KEY, value)
    }
    localStorage.removeItem(SC_LEARNER_TOKEN_KEY)
    localStorage.removeItem(SC_STUDENT_TOKEN_KEY)
    sessionStorage.removeItem(SC_STUDENT_TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

export function scSetMustChangePasswordStored(mustChange) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(SC_MUST_CHANGE_KEY, mustChange ? '1' : '0')
    localStorage.removeItem(SC_MUST_CHANGE_KEY)
  } catch {
    /* ignore */
  }
}

export function scSetUserStored(user) {
  if (typeof window === 'undefined') return
  try {
    if (!user) {
      sessionStorage.removeItem(SC_USER_KEY)
    } else {
      sessionStorage.setItem(SC_USER_KEY, JSON.stringify(user))
    }
    localStorage.removeItem(SC_USER_KEY)
  } catch {
    /* ignore */
  }
}

export function scClearAuthStorage() {
  if (typeof window === 'undefined') return
  for (const k of [SC_LEARNER_TOKEN_KEY, SC_STUDENT_TOKEN_KEY, SC_MUST_CHANGE_KEY, SC_USER_KEY]) {
    try {
      sessionStorage.removeItem(k)
      localStorage.removeItem(k)
    } catch {
      /* ignore */
    }
  }
}
