import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { contentApi } from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/ToastProvider'
import '../assets/css/DashboardPage.css'

function StatIconLectures() {
  return (
    <svg className="pg-dashboard__stat-icon-svg" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path fill="currentColor" d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
    </svg>
  )
}

function StatIconExams() {
  return (
    <svg className="pg-dashboard__stat-icon-svg" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path fill="currentColor" d="M12 3L2 8l10 5 8-4v9h2V8L12 3zm0 7.2L5.3 8 12 4.8 18.7 8 12 10.2z" />
    </svg>
  )
}

function StatIconBooks() {
  return (
    <svg className="pg-dashboard__stat-icon-svg" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path fill="currentColor" d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2z" />
    </svg>
  )
}

function StatIconHymns() {
  return (
    <svg className="pg-dashboard__stat-icon-svg" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <span className="pg-dashboard__lecture-play" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="44" height="44">
        <circle cx="12" cy="12" r="11" fill="none" stroke="rgba(201,166,70,0.95)" strokeWidth="1.5" />
        <path d="M10 8v8l6-4-6-4z" fill="#c9a646" />
      </svg>
    </span>
  )
}

export default function DashboardPage() {
  const { student } = useAuth()
  const { showToast } = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ upcomingExams: 0, booksCount: 0, lecturesCount: 0, questionnairesCount: 0 })
  const [lectures, setLectures] = useState([])
  const [exams, setExams] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [historyBusy, setHistoryBusy] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [examHistory, setExamHistory] = useState([])
  const [historyPage, setHistoryPage] = useState(1)
  const [historyLastPage, setHistoryLastPage] = useState(1)
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyResultByAttempt, setHistoryResultByAttempt] = useState({})
  const [historyResultLoadingId, setHistoryResultLoadingId] = useState(null)
  const [historyResultErrorByAttempt, setHistoryResultErrorByAttempt] = useState({})

  const firstName = student?.name?.split?.(' ')?.[0] ?? ''

  const loadHistory = async (page = 1) => {
    setHistoryBusy(true)
    setHistoryError('')
    try {
      const result = await contentApi.getExamHistory(student, page)
      setExamHistory(result.rows)
      setHistoryPage(result.page)
      setHistoryLastPage(result.lastPage)
      setHistoryTotal(result.total)
      setHistoryResultByAttempt({})
      setHistoryResultLoadingId(null)
      setHistoryResultErrorByAttempt({})
    } catch (e) {
      const message = e.message || 'تعذر تحميل سجل الامتحانات'
      setHistoryError(message)
      showToast({ type: 'error', message })
    } finally {
      setHistoryBusy(false)
    }
  }

  const toggleAttemptAnswers = async (attemptId) => {
    if (!attemptId || historyResultLoadingId === attemptId) return
    if (historyResultByAttempt[attemptId]) {
      setHistoryResultByAttempt((prev) => {
        const next = { ...prev }
        delete next[attemptId]
        return next
      })
      return
    }
    setHistoryResultLoadingId(attemptId)
    setHistoryResultErrorByAttempt((prev) => ({ ...prev, [attemptId]: '' }))
    try {
      const details = await contentApi.getExamResultByAttempt(student, attemptId)
      if (!details) {
        setHistoryResultErrorByAttempt((prev) => ({ ...prev, [attemptId]: 'الإجابات غير متاحة حالياً.' }))
      } else {
        setHistoryResultByAttempt((prev) => ({ ...prev, [attemptId]: details }))
      }
    } catch (e) {
      const message = e.message || 'تعذر تحميل الإجابات.'
      setHistoryResultErrorByAttempt((prev) => ({ ...prev, [attemptId]: message }))
    } finally {
      setHistoryResultLoadingId(null)
    }
  }

  useEffect(() => {
    Promise.all([
      contentApi.getDashboard(student),
      contentApi.getQuestionnaires(student).catch(() => []),
      contentApi.getLectures(student).catch(() => []),
      contentApi.getExams(student).catch(() => []),
    ]).then(([dashboard, questionnaires, fetchedLectures, fetchedExams]) => {
      setStats({
        ...dashboard,
        questionnairesCount: Array.isArray(questionnaires) ? questionnaires.length : 0,
      })
      setLectures(Array.isArray(fetchedLectures) ? fetchedLectures.slice(0, 4) : [])
      setExams(Array.isArray(fetchedExams) ? fetchedExams : [])
    })
  }, [student])

  useEffect(() => {
    if (location.state?.openExamHistory !== true) return
    setShowHistory(true)
    loadHistory(1).catch(() => {})
    navigate('.', { replace: true, state: {} })
  }, [location.state, navigate, student])

  /** Upcoming + currently open — strict "Upcoming" only hid real exams that are already available. */
  const upcomingExams = useMemo(() => {
    const relevant = exams.filter(
      (e) => e.state === 'Upcoming' || e.state === 'Available' || e.state === 'In Progress',
    )
    const rank = (s) => (s === 'Upcoming' ? 0 : 1)
    return [...relevant]
      .sort((a, b) => {
        const d = rank(a.state) - rank(b.state)
        if (d !== 0) return d
        const ta = a.availableFrom ? new Date(a.availableFrom).getTime() : 0
        const tb = b.availableFrom ? new Date(b.availableFrom).getTime() : 0
        return ta - tb
      })
      .slice(0, 2)
  }, [exams])

  const examStatusLabel = (state) => {
    if (state === 'Available' || state === 'In Progress') return 'متاح الآن'
    return 'قريبًا'
  }

  return (
    <div id="pg-dashboard-root">
      <header className="pg-dashboard__hero">
        <span className="pg-dashboard__hero-cross" aria-hidden="true" />
        <div className="pg-dashboard__hero-inner">
          <div className="pg-dashboard__hero-text">
            <h1 className="pg-dashboard__title">{`مرحبًا بعودتك يا ${firstName}`}</h1>
            <p className="pg-dashboard__subtitle">تابع رحلتك التعليمية في هدوء وانضباط</p>
          </div>
          <div className="pg-dashboard__hero-side">
            <div className="pg-dashboard__hero-actions">
              <Link className="pg-dashboard__hero-btn pg-dashboard__hero-btn--primary" to="/exams">
                دخول الامتحانات
              </Link>
              <Link className="pg-dashboard__hero-btn pg-dashboard__hero-btn--secondary" to="/books">
                فتح المكتبة
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="pg-dashboard__stats" aria-label="ملخص سريع">
        <article className="pg-dashboard__stat">
          <div className="pg-dashboard__stat-icon" aria-hidden="true">
            <StatIconLectures />
          </div>
          <div className="pg-dashboard__stat-body">
            <p className="pg-dashboard__stat-label">المحاضرات</p>
            <p className="pg-dashboard__stat-value">{stats.lecturesCount}</p>
          </div>
        </article>
        <article className="pg-dashboard__stat">
          <div className="pg-dashboard__stat-icon" aria-hidden="true">
            <StatIconExams />
          </div>
          <div className="pg-dashboard__stat-body">
            <p className="pg-dashboard__stat-label">الامتحانات</p>
            <p className="pg-dashboard__stat-value">{stats.upcomingExams}</p>
          </div>
        </article>
        <article className="pg-dashboard__stat">
          <div className="pg-dashboard__stat-icon" aria-hidden="true">
            <StatIconBooks />
          </div>
          <div className="pg-dashboard__stat-body">
            <p className="pg-dashboard__stat-label">الكتب</p>
            <p className="pg-dashboard__stat-value">{stats.booksCount}</p>
          </div>
        </article>
        <article className="pg-dashboard__stat">
          <div className="pg-dashboard__stat-icon" aria-hidden="true">
            <StatIconHymns />
          </div>
          <div className="pg-dashboard__stat-body">
            <p className="pg-dashboard__stat-label">الألحان</p>
            <p className="pg-dashboard__stat-value">{stats.questionnairesCount}</p>
          </div>
        </article>
      </section>

      <section className="pg-dashboard__activity-grid">
        <aside className="pg-dashboard__upcoming">
          <div className="pg-dashboard__section-head">
            <h3 className="pg-dashboard__section-title">الامتحانات القادمة</h3>
            <Link to="/exams" className="pg-dashboard__section-link">
              عرض الكل
            </Link>
          </div>
          <div className="pg-dashboard__upcoming-list">
            {upcomingExams.length === 0 ? (
              <p className="pg-dashboard__empty-hint">
                {exams.length === 0
                  ? 'لا توجد امتحانات مسجلة لك في النظام حالياً.'
                  : 'لا توجد امتحانات قادمة أو متاحة للدخول حالياً.'}
              </p>
            ) : (
              upcomingExams.map((exam) => (
                <article key={exam.id} className="pg-dashboard__upcoming-card">
                  <div className="pg-dashboard__upcoming-card-top">
                    <span className="pg-dashboard__upcoming-chip">{examStatusLabel(exam.state)}</span>
                    <span className="pg-dashboard__upcoming-score">
                      الدرجة <strong>{exam.questionCount ?? '—'}</strong>
                    </span>
                  </div>
                  <h4 className="pg-dashboard__upcoming-title">{exam.title}</h4>
                  <p className="pg-dashboard__upcoming-meta">
                    <span className="pg-dashboard__meta-ic" aria-hidden="true">⏱</span>
                    <span>
                      {exam.durationText ?? (exam.durationMinutes != null ? `${exam.durationMinutes} دقيقة` : '—')}
                      {exam.endsAtLabel ? (
                        <>
                          {' '}
                          <span className="pg-dashboard__meta-sep" aria-hidden="true">
                            ·
                          </span>{' '}
                          ينتهي {exam.endsAtLabel}
                        </>
                      ) : null}
                    </span>
                  </p>
                  <p className="pg-dashboard__upcoming-meta">
                    <span className="pg-dashboard__meta-ic" aria-hidden="true">📅</span>
                    {exam.whenText ?? exam.windowLabel ?? '—'}
                  </p>
                  <Link
                    to={exam.state === 'Upcoming' ? '/exams' : `/exams/${exam.id}`}
                    className="pg-dashboard__upcoming-action"
                  >
                    {exam.state === 'Upcoming' ? 'استعد للامتحان' : 'دخول الامتحان'}
                  </Link>
                </article>
              ))
            )}
          </div>
        </aside>

        <div className="pg-dashboard__latest">
          <div className="pg-dashboard__section-head">
            <h3 className="pg-dashboard__section-title">آخر المحاضرات</h3>
            <Link to="/lectures" className="pg-dashboard__section-link">
              عرض الكل
            </Link>
          </div>
          <div className="pg-dashboard__latest-grid">
            {lectures.length === 0 ? (
              <p className="pg-dashboard__latest-empty">لا توجد محاضرات لعرضها حالياً.</p>
            ) : (
              lectures.map((lecture) => (
                <article key={lecture.id} className="pg-dashboard__lecture-card">
                  <div className="pg-dashboard__lecture-media">
                    <PlayIcon />
                    {lecture.completed ? (
                      <span className="pg-dashboard__lecture-dot pg-dashboard__lecture-dot--done" aria-label="تمت المشاهدة" />
                    ) : null}
                    {!lecture.completed && lecture.isNew ? (
                      <span className="pg-dashboard__lecture-dot pg-dashboard__lecture-dot--new" aria-label="جديد" />
                    ) : null}
                    <span className="pg-dashboard__lecture-time">{lecture.duration}</span>
                  </div>
                  <div className="pg-dashboard__lecture-body">
                    <p className="pg-dashboard__lecture-course">{lecture.course}</p>
                    <h4 className="pg-dashboard__lecture-title">{lecture.title}</h4>
                    <Link to="/lectures" className="pg-dashboard__lecture-link">
                      شاهد الآن <span aria-hidden="true">›</span>
                    </Link>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      {showHistory ? (
        <div className="pg-dashboard__modal-overlay" onClick={() => setShowHistory(false)}>
          <section className="pg-dashboard__modal" onClick={(e) => e.stopPropagation()}>
            <div className="pg-dashboard__modal-head">
              <h2 className="pg-dashboard__modal-title">سجل الامتحانات والدرجات</h2>
              <button type="button" className="pg-dashboard__modal-close" onClick={() => setShowHistory(false)}>
                اغلاق
              </button>
            </div>

            {historyBusy ? <p className="pg-dashboard__modal-note">جارٍ تحميل السجل...</p> : null}
            {historyError ? <p className="pg-dashboard__modal-error">{historyError}</p> : null}
            {!historyBusy && !historyError && examHistory.length === 0 ? (
              <p className="pg-dashboard__modal-note">لم تقم بدخول أي امتحان حتى الآن.</p>
            ) : null}

            {!historyBusy && !historyError && examHistory.length > 0 ? (
              <>
                <div className="pg-dashboard__history-list">
                  {examHistory.map((item) => (
                    <article key={item.id} className="pg-dashboard__history-card">
                      <div className="pg-dashboard__history-top">
                        <h3 className="pg-dashboard__history-title">{item.title}</h3>
                        <span className="pg-dashboard__history-status">{item.status}</span>
                      </div>
                      <p className="pg-dashboard__history-line">المقرر: {item.course}</p>
                      <p className="pg-dashboard__history-line">
                        الدرجة: {item.score}/{item.totalQuestions}
                      </p>
                      <p className="pg-dashboard__history-line">النسبة: {item.percentage}%</p>
                      <p className="pg-dashboard__history-line">وقت التسليم: {item.submittedAt}</p>
                      {item.canViewAnswers ? (
                        <div className="pg-dashboard__history-actions-row">
                          <button
                            type="button"
                            className="pg-dashboard__history-view-btn"
                            disabled={historyResultLoadingId === item.id}
                            onClick={() => toggleAttemptAnswers(item.id)}
                          >
                            {historyResultByAttempt[item.id] ? 'إخفاء الإجابات' : 'عرض الإجابات'}
                          </button>
                        </div>
                      ) : null}
                      {historyResultLoadingId === item.id ? (
                        <p className="pg-dashboard__history-sub-note">جارٍ تحميل الإجابات...</p>
                      ) : null}
                      {historyResultErrorByAttempt[item.id] ? (
                        <p className="pg-dashboard__history-sub-error">{historyResultErrorByAttempt[item.id]}</p>
                      ) : null}
                      {historyResultByAttempt[item.id]?.details?.length ? (
                        <div className="pg-dashboard__history-answers">
                          {historyResultByAttempt[item.id].details.map((answer, index) => (
                            <div key={`${item.id}-${index}`} className="pg-dashboard__history-answer-item">
                              <p className="pg-dashboard__history-sub-line">
                                <strong>س{index + 1}:</strong> {answer.question}
                              </p>
                              <p className="pg-dashboard__history-sub-line">
                                <strong>إجابتك:</strong>{' '}
                                {answer.selected === null ? 'لم تتم الإجابة' : answer.options[answer.selected]}
                              </p>
                              {historyResultByAttempt[item.id].showCorrectAnswers ? (
                                <p className="pg-dashboard__history-sub-line">
                                  <strong>الإجابة الصحيحة:</strong>{' '}
                                  {answer.correct === null ? 'غير متاحة' : answer.options[answer.correct]}
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>

                {historyLastPage > 1 ? (
                  <div className="pg-dashboard__history-actions">
                    <button
                      type="button"
                      className="pg-dashboard__history-page-btn"
                      disabled={historyPage <= 1 || historyBusy}
                      onClick={() => loadHistory(historyPage - 1)}
                    >
                      السابق
                    </button>
                    <span className="pg-dashboard__history-page-text">
                      صفحة {historyPage} من {historyLastPage} - {historyTotal} نتيجة
                    </span>
                    <button
                      type="button"
                      className="pg-dashboard__history-page-btn"
                      disabled={historyPage >= historyLastPage || historyBusy}
                      onClick={() => loadHistory(historyPage + 1)}
                    >
                      التالي
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  )
}
