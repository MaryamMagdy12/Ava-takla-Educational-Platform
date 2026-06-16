import highlightMatch from '../../utils/highlightMatch'
import { motion } from 'framer-motion'

function PlayCircleIcon() {
  return (
    <span className="pg-lectures__play-wrap" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="52" height="52">
        <circle cx="12" cy="12" r="10.5" fill="none" stroke="rgba(201,166,70,0.95)" strokeWidth="1.5" />
        <path d="M10 8v8l6-4-6-4z" fill="rgba(255,255,255,0.95)" />
      </svg>
    </span>
  )
}

function AudioCircleIcon() {
  return (
    <span className="pg-lectures__play-wrap" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="52" height="52">
        <circle cx="12" cy="12" r="10.5" fill="none" stroke="rgba(201,166,70,0.95)" strokeWidth="1.5" />
        <g fill="rgba(255,255,255,0.95)">
          <rect x="8" y="10" width="2" height="8" rx="0.5" />
          <rect x="11" y="7" width="2" height="14" rx="0.5" />
          <rect x="14" y="9" width="2" height="10" rx="0.5" />
        </g>
      </svg>
    </span>
  )
}

function DurationClockIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
      <path
        fill="currentColor"
        d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"
      />
    </svg>
  )
}

function PlaySmallIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="currentColor" d="M8 5v14l11-7z" />
    </svg>
  )
}

function ReplaySmallIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0020 13c0-4.42-3.58-8-8-8zm0 18v4l5-5-5-5v4c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 5.74A7.93 7.93 0 004 11c0 4.42 3.58 8 8 8z"
      />
    </svg>
  )
}

export default function LectureCard({ lecture, classes, searchQuery, onMediaOpen }) {
  const lecturer = lecture.lecturerName?.trim()
  const isAudio = lecture.type === 'audio'
  const label = lecture.completed
    ? isAudio
      ? 'إعادة الاستماع'
      : 'إعادة المشاهدة'
    : isAudio
      ? 'تشغيل الصوت'
      : 'تشغيل المحاضرة'

  return (
    <motion.article
      className={classes.root}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.22 }}
      transition={{ duration: 0.28 }}
      whileHover={{ y: -4 }}
    >
      <div className={`${classes.media}${isAudio ? ' pg-lectures__media--audio' : ''}`}>
        {isAudio ? <AudioCircleIcon /> : <PlayCircleIcon />}
        {lecture.completed ? (
          <span className={classes.doneBadge} aria-label="تمت المشاهدة">
            ✓
          </span>
        ) : null}
        <span className={classes.duration}>
          <DurationClockIcon className={classes.durationIc} />
          {lecture.duration}
        </span>
      </div>
      <div className={classes.cardBody}>
        <div className={classes.row}>
          <span className={classes.chip}>{lecture.course}</span>
          <span className={`${classes.chipType}${isAudio ? ' pg-lectures__chip-type--audio' : ' pg-lectures__chip-type--video'}`}>
            {isAudio ? 'صوت' : 'فيديو'}
          </span>
          {lecture.isNew ? <span className={classes.badgeNew}>جديد</span> : null}
        </div>
        <h3 className={classes.title}>{highlightMatch(lecture.title, searchQuery, classes.highlight)}</h3>
        {lecturer ? <p className={classes.lecturer}>المحاضر: {lecturer}</p> : null}
        {onMediaOpen ? (
          <button type="button" className={classes.action} onClick={() => onMediaOpen()}>
            {lecture.completed ? (
              <ReplaySmallIcon className={classes.actionIcon} />
            ) : (
              <PlaySmallIcon className={classes.actionIcon} />
            )}
            {label}
          </button>
        ) : (
          <a href={lecture.url} className={classes.action} target="_blank" rel="noreferrer">
            {lecture.completed ? (
              <ReplaySmallIcon className={classes.actionIcon} />
            ) : (
              <PlaySmallIcon className={classes.actionIcon} />
            )}
            {label}
          </a>
        )}
      </div>
    </motion.article>
  )
}
