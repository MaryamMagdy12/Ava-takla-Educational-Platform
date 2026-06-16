import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { classifyMediaUrl, extractYoutubeId, gaLectureHasInlinePlayer } from './gacMediaEmbed.js'
import { getGaLectureMediaKind } from './gacLectureKind.js'
import '../../assets/css/GacCourseFamilyCard.css'

function LectureMedia({ fileUrl, externalUrl }) {
  const primary = fileUrl || externalUrl || ''
  if (!primary) return null

  const kind = classifyMediaUrl(primary)
  const ytId = kind === 'youtube' ? extractYoutubeId(primary) : null

  if (kind === 'youtube') {
    if (ytId) {
      return (
        <div className="gac-course-family-card__media">
          <div className="gac-course-family-card__iframe-wrap">
            <iframe
              title="محاضرة فيديو"
              src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(ytId)}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      )
    }
    return (
      <div className="gac-course-family-card__media gac-course-family-card__media--fallback">
        <a className="gac-course-family-card__link-inline" href={primary} target="_blank" rel="noopener noreferrer">
          فتح رابط يوتيوب
        </a>
      </div>
    )
  }

  if (kind === 'native-video') {
    return (
      <div className="gac-course-family-card__media">
        <video className="gac-course-family-card__video" controls playsInline preload="metadata" src={primary}>
          متصفحك لا يدعم تشغيل الفيديو هنا.
          <a href={primary} target="_blank" rel="noopener noreferrer">
            فتح الرابط
          </a>
        </video>
      </div>
    )
  }

  if (kind === 'native-audio') {
    return (
      <div className="gac-course-family-card__media gac-course-family-card__media--audio">
        <audio className="gac-course-family-card__audio" controls preload="metadata" src={primary}>
          <a href={primary} target="_blank" rel="noopener noreferrer">
            فتح الصوت
          </a>
        </audio>
      </div>
    )
  }

  if (kind === 'unknown') {
    return (
      <div className="gac-course-family-card__media gac-course-family-card__media--fallback">
        <a className="gac-course-family-card__link-inline" href={primary} target="_blank" rel="noopener noreferrer">
          فتح المحاضرة (رابط خارجي)
        </a>
      </div>
    )
  }

  return null
}

function CourseHeroIcon() {
  return (
    <div className="gac-course-family-card__hero-icon gac-course-family-card__hero-icon--course" aria-hidden>
      <svg viewBox="0 0 48 48" width="26" height="26" fill="none">
        <path
          d="M14 10 h20 a2 2 0 0 1 2 2 v26 a2 2 0 0 1 -2 2 h-20 a2 2 0 0 1 -2 -2 V12 a2 2 0 0 1 2 -2 z"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="none"
        />
        <path d="M18 16 h12 M18 22 h12 M18 28 h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  )
}

export default function GacCourseFamilyCard({ course, index }) {
  const playerRef = useRef(null)
  const [playerRevealed, setPlayerRevealed] = useState(false)

  const isGaLecture = Boolean(course.videoFileUrl || course.videoExternalUrl)
  const mediaKind = isGaLecture ? getGaLectureMediaKind(course) : null
  const showInlineNewTab = isGaLecture && course.actionUrl && gaLectureHasInlinePlayer(course)

  useEffect(() => {
    if (!playerRevealed || !showInlineNewTab) return undefined
    const id = window.requestAnimationFrame(() => {
      playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
    return () => window.cancelAnimationFrame(id)
  }, [playerRevealed, showInlineNewTab])

  const primaryLabel =
    isGaLecture && mediaKind === 'audio' ? 'تشغيل الصوت' : isGaLecture ? 'تشغيل المحاضرة' : null

  const revealPlayer = () => setPlayerRevealed(true)

  return (
    <motion.article
      className={`gac-course-family-card ${isGaLecture ? 'gac-course-family-card--lecture' : 'gac-course-family-card--course-only'}`}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-24px' }}
      transition={{ duration: 0.42, delay: index * 0.06 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      {isGaLecture ? (
        <>
          <div
            className={`gac-course-family-card__hero gac-course-family-card__hero--bare gac-course-family-card__hero--${mediaKind === 'audio' ? 'audio' : 'video'}`}
            aria-hidden
          >
            <span className="gac-course-family-card__duration-badge" title="المدة">
              <span className="gac-course-family-card__duration-icon" aria-hidden>
                🕐
              </span>
              {course.durationLabel || '—'}
            </span>
          </div>

          <div className="gac-course-family-card__panel">
            <div className="gac-course-family-card__panel-head">
              <h2 className="gac-course-family-card__title">{course.title}</h2>
              <div className="gac-course-family-card__tags">
                <span className="gac-course-family-card__tag gac-course-family-card__tag--gold">{course.level || 'محاضرة'}</span>
                <span
                  className={`gac-course-family-card__tag ${mediaKind === 'audio' ? 'gac-course-family-card__tag--sky' : 'gac-course-family-card__tag--coral'}`}
                >
                  {mediaKind === 'audio' ? 'صوت' : 'فيديو'}
                </span>
              </div>
            </div>

            {course.summary ? <p className="gac-course-family-card__summary gac-course-family-card__summary--clamp">{course.summary}</p> : null}

            {course.actionUrl && showInlineNewTab && !playerRevealed ? (
              <button type="button" className="gac-course-family-card__cta-full" onClick={revealPlayer}>
                {primaryLabel}
              </button>
            ) : null}

            {course.actionUrl && !showInlineNewTab ? (
              <a className="gac-course-family-card__cta-full" href={course.actionUrl} target="_blank" rel="noopener noreferrer">
                {primaryLabel}
              </a>
            ) : null}

            {showInlineNewTab && playerRevealed ? (
              <div ref={playerRef} className="gac-course-family-card__player-block">
                <p className="gac-course-family-card__player-label">المشغّل</p>
                <LectureMedia fileUrl={course.videoFileUrl} externalUrl={course.videoExternalUrl} />
              </div>
            ) : null}

            {showInlineNewTab && playerRevealed ? (
              <a className="gac-course-family-card__cta-ghost" href={course.actionUrl} target="_blank" rel="noopener noreferrer">
                فتح في تبويب جديد
              </a>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <div className="gac-course-family-card__hero gac-course-family-card__hero--course">
            <div className="gac-course-family-card__hero-inner gac-course-family-card__hero-inner--compact">
              <CourseHeroIcon />
            </div>
            <span className="gac-course-family-card__duration-badge" title="المحتوى">
              <span className="gac-course-family-card__duration-icon" aria-hidden>
                🕐
              </span>
              {course.durationLabel || '—'}
            </span>
          </div>
          <div className="gac-course-family-card__panel">
            <div className="gac-course-family-card__panel-head">
              <h2 className="gac-course-family-card__title">{course.title}</h2>
              <div className="gac-course-family-card__tags">
                <span className="gac-course-family-card__tag gac-course-family-card__tag--gold">{course.level || 'للعائلات'}</span>
                <span className="gac-course-family-card__tag gac-course-family-card__tag--muted">مقرر</span>
              </div>
            </div>
            {course.summary ? <p className="gac-course-family-card__summary">{course.summary}</p> : null}
          </div>
        </>
      )}
    </motion.article>
  )
}
