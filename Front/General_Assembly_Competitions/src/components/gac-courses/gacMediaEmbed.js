/** @param {string} url */
export function extractYoutubeId(url) {
  const u = String(url || '').trim()
  if (!u) return null
  try {
    const parsed = new URL(u, u.startsWith('http') ? undefined : 'https://example.com')
    const host = parsed.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      const id = parsed.pathname.replace(/^\//, '').split('/')[0]
      return id || null
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      const v = parsed.searchParams.get('v')
      if (v) return v
      const m = parsed.pathname.match(/\/embed\/([^/?]+)/)
      if (m) return m[1]
      const m2 = parsed.pathname.match(/\/shorts\/([^/?]+)/)
      if (m2) return m2[1]
    }
  } catch {
    return null
  }
  return null
}

/**
 * @param {string} url
 * @returns {'youtube' | 'native-video' | 'native-audio' | 'unknown'}
 */
export function classifyMediaUrl(url) {
  const u = String(url || '').trim().toLowerCase()
  if (!u) return 'unknown'
  if (/youtube\.com|youtu\.be/.test(u)) return 'youtube'
  if (/\.(mp4|webm|mov|mkv|m4v|ogv)(\?|#|$)/i.test(u)) return 'native-video'
  if (/\.(mp3|wav|m4a|ogg|oga|aac|flac)(\?|#|$)/i.test(u)) return 'native-audio'
  if (u.includes('/storage/')) return 'native-video'
  return 'unknown'
}

/** GA lecture row: inline player vs external-only link. */
export function gaLectureHasInlinePlayer(course) {
  const p = course.videoFileUrl || course.videoExternalUrl
  if (!p) return false
  const k = classifyMediaUrl(p)
  if (k === 'youtube') return Boolean(extractYoutubeId(p))
  if (k === 'native-video' || k === 'native-audio') return true
  if (k === 'unknown' && p.toLowerCase().includes('/storage/')) return true
  return false
}
