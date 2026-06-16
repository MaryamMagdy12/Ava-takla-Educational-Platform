const useRemoteApiInDev = import.meta.env.VITE_API_USE_REMOTE === 'true'
const laravelPort = String(import.meta.env.VITE_LARAVEL_PORT || '8000').trim()

/** Windows: `localhost` → IPv6 (::1) while `php -S` is IPv4 → ERR_NETWORK; LAN: `127.0.0.1` is the wrong device. */
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

/** Axios uses paths like `/auth/family/login` — base must end with `/api`. */
function ensureEndsWithApi(base) {
  const b = String(base ?? '')
    .trim()
    .replace(/\/+$/, '')
  if (!b) return b
  return /\/api$/i.test(b) ? b : `${b}/api`
}

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

/** Laravel API base including `/api`. */
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

export const GAC_TOKEN_KEY = 'gac_family_token'

/** Local flag: family must set official permanent password (Ga#…) before using the app */
export const GAC_MUST_CHANGE_KEY = 'gac_family_must_change_password'

/** Cached family row from login (display_name, family_login_id, …). */
export const GAC_USER_KEY = 'gac_family_user'

/**
 * Auth lives in `sessionStorage` so opening a new tab or a fresh browser session lands on
 * login instead of silently reusing the last family. Refresh in the same tab keeps the session.
 * Legacy `localStorage` values are read once, moved into this tab’s session, then removed.
 */
function readGacString(key) {
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

export function gacGetToken() {
  return readGacString(GAC_TOKEN_KEY)
}

export function gacGetMustChangePasswordStored() {
  return readGacString(GAC_MUST_CHANGE_KEY) === '1'
}

export function gacGetUserStored() {
  if (typeof window === 'undefined') return null
  try {
    let raw = sessionStorage.getItem(GAC_USER_KEY)
    if (!raw) {
      raw = localStorage.getItem(GAC_USER_KEY)
      if (raw) {
        sessionStorage.setItem(GAC_USER_KEY, raw)
        localStorage.removeItem(GAC_USER_KEY)
      }
    }
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function gacSetToken(value) {
  if (typeof window === 'undefined') return
  try {
    if (value == null || value === '') {
      sessionStorage.removeItem(GAC_TOKEN_KEY)
    } else {
      sessionStorage.setItem(GAC_TOKEN_KEY, value)
    }
    localStorage.removeItem(GAC_TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

export function gacSetMustChangePasswordStored(mustChange) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(GAC_MUST_CHANGE_KEY, mustChange ? '1' : '0')
    localStorage.removeItem(GAC_MUST_CHANGE_KEY)
  } catch {
    /* ignore */
  }
}

export function gacSetUserStored(user) {
  if (typeof window === 'undefined') return
  try {
    if (!user) {
      sessionStorage.removeItem(GAC_USER_KEY)
    } else {
      sessionStorage.setItem(GAC_USER_KEY, JSON.stringify(user))
    }
    localStorage.removeItem(GAC_USER_KEY)
  } catch {
    /* ignore */
  }
}

export function gacClearAuthStorage() {
  if (typeof window === 'undefined') return
  for (const k of [GAC_TOKEN_KEY, GAC_MUST_CHANGE_KEY, GAC_USER_KEY]) {
    try {
      sessionStorage.removeItem(k)
      localStorage.removeItem(k)
    } catch {
      /* ignore */
    }
  }
}
