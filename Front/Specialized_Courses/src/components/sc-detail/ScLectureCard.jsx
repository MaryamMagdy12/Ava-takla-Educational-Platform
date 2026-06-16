import { useCallback, useId, useState } from 'react'
import ScLecturePlayer from './ScLecturePlayer.jsx'
import '../../assets/css/ScLectureCard.css'

function formatDurationLabel(minutes) {
  if (minutes == null || !Number.isFinite(Number(minutes))) return '— —'
  const m = Math.max(0, Math.round(Number(minutes)))
  return `${m} د`
}

export default function ScLectureCard({ lecture, showNewTag, showAnswersTag }) {
  const panelId = useId()
  const [playing, setPlaying] = useState(false)

  const onTogglePlay = useCallback(() => {
    setPlaying((p) => !p)
  }, [])

  const durationText = formatDurationLabel(lecture?.durationMinutes)

  return (
    <article className="sc-lecture-card" dir="rtl">
      <button type="button" className="sc-lecture-card__thumb" onClick={onTogglePlay} aria-expanded={playing} aria-controls={panelId}>
        <span className="sc-lecture-card__thumb-gradient" aria-hidden />
        <span className="sc-lecture-card__play-ring" aria-hidden>
          <svg className="sc-lecture-card__play-icon" viewBox="0 0 24 24" width="28" height="28" aria-hidden>
            <polygon fill="currentColor" points="10,8 18,12 10,16" />
          </svg>
        </span>
        <span className="sc-lecture-card__duration">
          <svg className="sc-lecture-card__clock" viewBox="0 0 24 24" width="14" height="14" aria-hidden>
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M12 7v6l4 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>{durationText}</span>
        </span>
      </button>

      <div className="sc-lecture-card__body">
        <div className="sc-lecture-card__tags">
          {showNewTag ? (
            <span className="sc-lecture-card__tag sc-lecture-card__tag--new">جديد</span>
          ) : null}
          {showAnswersTag ? (
            <span className="sc-lecture-card__tag sc-lecture-card__tag--answers">أجيبة</span>
          ) : null}
          {!showAnswersTag && lecture?.lectureType ? (
            <span className="sc-lecture-card__tag sc-lecture-card__tag--muted">
              {lecture.lectureType === 'video' ? 'فيديو' : lecture.lectureType === 'audio' ? 'صوت' : lecture.lectureType}
            </span>
          ) : null}
        </div>
        <h3 className="sc-lecture-card__title">{lecture?.title ?? '—'}</h3>
        {lecture?.lecturerName ? <p className="sc-lecture-card__lecturer">{lecture.lecturerName}</p> : null}

        <button type="button" className="sc-lecture-card__cta" onClick={onTogglePlay} aria-expanded={playing} aria-controls={panelId}>
          <span>تشغيل المحاضرة</span>
          <svg className="sc-lecture-card__cta-play" viewBox="0 0 24 24" width="18" height="18" aria-hidden>
            <polygon fill="currentColor" points="10,7 18,12 10,17" />
          </svg>
        </button>
      </div>

      <div id={panelId} className={playing ? 'sc-lecture-card__player sc-lecture-card__player--open' : 'sc-lecture-card__player'}>
        {playing ? <ScLecturePlayer lecture={lecture} /> : null}
      </div>
    </article>
  )
}
