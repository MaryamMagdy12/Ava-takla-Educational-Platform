import { API_BASE, storagePublicUrl } from '../api/config.js'

/** Same host the SPA uses for `/api` — avoids `APP_URL` localhost vs `127.0.0.1` img failures. */
function rewriteLaravelStorageUrlToApiOrigin(url) {
  const s = String(url || '').trim()
  if (!s || !/^https?:\/\//i.test(s)) return s
  try {
    const u = new URL(s)
    if (!u.pathname.startsWith('/storage/')) return s
    const apiRoot = API_BASE.replace(/\/api\/?$/i, '')
    if (!apiRoot) return s
    const base = new URL(apiRoot.endsWith('/') ? apiRoot : `${apiRoot}/`)
    return `${base.protocol}//${base.host}${u.pathname}${u.search}`
  } catch {
    return s
  }
}

/**
 * Prefer DB `profile_picture` path + `storagePublicUrl` (matches working API base).
 * Fall back to `profile_picture_url` with `/storage/` rewritten to API origin.
 */
export function resolveSpecialLearnerPhotoUrl(user) {
  if (!user || typeof user !== 'object') return ''
  const raw = user.profile_picture
  const rawStr = raw != null ? String(raw).trim() : ''
  if (rawStr && /^https?:\/\//i.test(rawStr)) {
    return rawStr
  }
  if (rawStr) {
    return storagePublicUrl(rawStr)
  }
  const fromApi = user.profile_picture_url
  if (fromApi == null || String(fromApi).trim() === '') return ''
  return rewriteLaravelStorageUrlToApiOrigin(String(fromApi).trim())
}
