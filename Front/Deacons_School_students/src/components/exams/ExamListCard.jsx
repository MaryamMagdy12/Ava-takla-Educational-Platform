import { Link } from 'react-router-dom'

const stateBadgeClass = {
  Available: 'avail',
  'In Progress': 'avail',
  Upcoming: 'soon',
  Submitted: 'done',
  Expired: 'done',
}

const stateBadgeText = {
  Available: 'متاح الآن',
  'In Progress': 'متاح الآن',
  Upcoming: 'قريبًا',
  Submitted: 'منتهي',
  Expired: 'منتهي',
}

function IconClock({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"
      />
    </svg>
  )
}

function IconCalendar({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"
      />
    </svg>
  )
}

export default function ExamListCard({ exam, classes }) {
  const canEnter = exam.state === 'Available' || exam.state === 'In Progress'
  const isFinished = exam.state === 'Submitted' || exam.state === 'Expired'
  const badgeKey = stateBadgeClass[exam.state] ?? 'soon'
  const badgeText = stateBadgeText[exam.state] ?? exam.state
  const durationText = exam.durationText ?? (exam.durationMinutes != null ? `${exam.durationMinutes} دقيقة` : '—')
  const whenText = exam.whenText ?? exam.windowLabel ?? '—'
  const showScore =
    isFinished && exam.attemptScore != null && exam.attemptTotal != null

  return (
    <article className={`${classes.root} ${classes.root}--${badgeKey}`}>
      <div className={classes.head}>
        <span className={classes.chip}>{exam.course}</span>
        <span className={`${classes.state} ${classes.state}--${badgeKey}`}>{badgeText}</span>
      </div>
      <h3 className={classes.title}>{exam.title}</h3>

      <p className={classes.meta}>
        <IconClock className={classes.metaIcon} />
        <span>
          المدة: {durationText}
          {exam.endsAtLabel ? (
            <>
              {' '}
              <span className={classes.metaSep} aria-hidden="true">
                ·
              </span>{' '}
              ينتهي {exam.endsAtLabel}
            </>
          ) : null}
        </span>
      </p>
      <p className={classes.meta}>
        <IconCalendar className={classes.metaIcon} />
        <span>{whenText}</span>
      </p>

      {canEnter ? (
        <Link to={`/exams/${exam.id}`} className={classes.primaryLink}>
          {exam.state === 'In Progress' ? 'متابعة الامتحان' : 'دخول الامتحان'}
        </Link>
      ) : null}

      {exam.state === 'Upcoming' ? (
        <button type="button" className={classes.secondaryBtn} disabled>
          غير متاح بعد
        </button>
      ) : null}

      {isFinished ? (
        <div className={classes.finishedFooter}>
          {showScore ? (
            <p className={classes.score}>
              النتيجة: {exam.attemptScore}/{exam.attemptTotal}
            </p>
          ) : (
            <span className={classes.scoreMuted}>لا توجد نتيجة</span>
          )}
          <Link to={`/exams/${exam.id}`} className={classes.detailsLink}>
            عرض التفاصيل <span aria-hidden="true">›</span>
          </Link>
        </div>
      ) : null}
    </article>
  )
}
