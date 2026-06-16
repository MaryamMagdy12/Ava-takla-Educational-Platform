import { classifyMediaUrl } from './gacMediaEmbed.js'

/** @param {{ videoFileUrl?: string | null, videoExternalUrl?: string | null }} course */
export function getGaLectureMediaKind(course) {
  const p = course.videoFileUrl || course.videoExternalUrl || ''
  if (!p) return 'video'
  const k = classifyMediaUrl(p)
  if (k === 'native-audio') return 'audio'
  return 'video'
}
