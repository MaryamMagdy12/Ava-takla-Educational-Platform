import { API_ORIGIN } from '../api/config'

export function initialsFromName(name) {
  if (!name || typeof name !== 'string') return 'ط'
  const t = name.trim()
  if (!t) return 'ط'
  if (t.length <= 2) return t
  if (/[\u0600-\u06FF]/.test(t)) return t.slice(0, 2)
  const parts = t.split(/\s+/)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return t.slice(0, 2).toUpperCase()
}

export function resolveLearnerPhotoUrl(raw) {
  if (raw == null || raw === '') return ''
  const s = String(raw).trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  const path = s.replace(/^\//, '')
  if (!path) return ''
  const origin = String(API_ORIGIN || '').replace(/\/$/, '')
  if (!origin) return `/${path}`
  return `${origin}/storage/${path}`
}

export function resolveLearnerPhotoFromUser(user) {
  if (!user || typeof user !== 'object') return ''
  return resolveLearnerPhotoUrl(
    user.profile_photo_url ??
      user.profile_photo_path ??
      user.avatar_url ??
      user.photo_url ??
      user.image_url ??
      '',
  )
}
