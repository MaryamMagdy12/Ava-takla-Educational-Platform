import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  fetchAllFamilyCompetitions,
  resumeAttempt,
  startCompetition,
  submitAttempt,
} from '../api/familyApi.js'
import { useGacAuth } from '../context/GacAuthContext.jsx'
import GacExamQuestionCard from '../components/exams/GacExamQuestionCard.jsx'
import '../assets/css/GacExamAttemptPage.css'

const QUESTIONS_PER_PAGE = 3
const ANSWERS_STORAGE_PREFIX = 'gac-competition-attempt-v1'

function competitionDraftKey(familyId, competitionId) {
  const fid = familyId != null && String(familyId).trim() !== '' ? String(familyId) : 'anon'
  return `${ANSWERS_STORAGE_PREFIX}:${fid}:${String(competitionId)}`
}

function safeSelectedForQuestion(q, storedId) {
  if (storedId == null || storedId === '') return null
  const n = Number(storedId)
  if (!Number.isFinite(n)) return null
  const opts = q.options ?? []
  if (!opts.some((o) => Number(o.id) === n)) return null
  return n
}

function fmt(seconds) {
  const s = Math.max(0, seconds)
  const m = String(Math.floor(s / 60)).padStart(2, '0')
  const sec = String(s % 60).padStart(2, '0')
  return `${m}:${sec}`
}

const questionClasses = {
  root: 'gac-exam-attempt__question',
  unanswered: 'gac-exam-attempt__question--unanswered',
  caption: 'gac-exam-attempt__caption',
  title: 'gac-exam-attempt__q-title',
  options: 'gac-exam-attempt__options',
  option: 'gac-exam-attempt__option',
  optionSelected: 'gac-exam-attempt__option--selected',
  optionInner: 'gac-exam-attempt__option-inner',
  optionLetter: 'gac-exam-attempt__option-letter',
  optionText: 'gac-exam-attempt__option-text',
}

export default function GacCompetitionSessionPage() {
  const { competitionId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { token, user } = useGacAuth()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [payload, setPayload] = useState(null)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [remaining, setRemaining] = useState(0)
  const [pageIndex, setPageIndex] = useState(0)
  const [submitHint, setSubmitHint] = useState('')
  const [highlightUnanswered, setHighlightUnanswered] = useState([])
  const [warnedTwoMinutes, setWarnedTwoMinutes] = useState(false)
  const [timeWarningOpen, setTimeWarningOpen] = useState(false)
  const [timeWarningMeta, setTimeWarningMeta] = useState(null)

  const questions = useMemo(() => payload?.questions ?? [], [payload])
  const flatQuestions = useMemo(() => questions.map((r) => r.question).filter(Boolean), [questions])

  const allQuestionsAnswered = useMemo(
    () =>
      flatQuestions.length > 0 &&
      flatQuestions.every((q) => answers[q.id] != null && answers[q.id] !== undefined),
    [answers, flatQuestions],
  )

  useEffect(() => {
    let cancelled = false

    async function run() {
      if (!token) {
        navigate('/login', { replace: true, state: { from: location.pathname } })
        return
      }
      setError('')
      setLoading(true)
      try {
        let attempt = location.state?.attempt
        if (!attempt) {
          const list = await fetchAllFamilyCompetitions()
          if (cancelled) return
          const row = list.find((c) => String(c.id) === String(competitionId))
          attempt = row?.attempt ?? null
        }

        if (cancelled) return

        if (attempt?.status === 'submitted') {
          navigate(`/competitions/result/${attempt.id}`, { replace: true })
          return
        }

        let data
        if (attempt?.status === 'in_progress' && attempt.id) {
          data = await resumeAttempt(attempt.id)
        } else {
          data = await startCompetition(competitionId)
        }

        if (cancelled) return

        setPayload(data)
        setRemaining(data.remaining_seconds ?? 0)
        const attemptId = data.attempt?.id
        const initial = {}
        const list = []
        for (const row of data.questions ?? []) {
          const q = row.question
          if (q?.id) {
            initial[q.id] = null
            list.push(q)
          }
        }

        let pageIdx = 0
        let warned = false
        try {
          const raw = sessionStorage.getItem(competitionDraftKey(user?.id, competitionId))
          if (raw) {
            const parsed = JSON.parse(raw)
            if (
              parsed &&
              Number(parsed.attemptId) === Number(attemptId) &&
              parsed.answers &&
              typeof parsed.answers === 'object'
            ) {
              for (const q of list) {
                const sid = parsed.answers[String(q.id)] ?? parsed.answers[q.id]
                initial[q.id] = safeSelectedForQuestion(q, sid)
              }
              const totalPages = Math.max(1, Math.ceil(list.length / QUESTIONS_PER_PAGE))
              const rp = Number(parsed.pageIndex)
              if (Number.isFinite(rp) && rp >= 0) {
                pageIdx = Math.min(Math.max(0, Math.floor(rp)), Math.max(totalPages - 1, 0))
              }
              warned = Boolean(parsed.warnedTwoMinutes)
            }
          }
        } catch {
          // ignore bad storage
        }

        setAnswers(initial)
        setHighlightUnanswered(new Array(list.length).fill(false))
        setPageIndex(pageIdx)
        setSubmitHint('')
        setWarnedTwoMinutes(warned)
        setTimeWarningOpen(false)
        setTimeWarningMeta(null)
      } catch (e) {
        if (!cancelled) setError(e.message || 'تعذّر تحميل المسابقة.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [token, user?.id, competitionId, navigate, location.key])

  const onSubmit = useCallback(
    async (auto = false) => {
      const attemptId = payload?.attempt?.id
      if (!attemptId || !flatQuestions.length) return
      if (!auto && !allQuestionsAnswered) {
        setSubmitHint('يرجى الإجابة على جميع الأسئلة قبل التسليم.')
        return
      }
      setSubmitHint('')
      const built = flatQuestions.map((q) => ({
        question_id: q.id,
        selected_option_id: answers[q.id] ?? null,
      }))
      if (!auto) {
        const missing = built.some((a) => !a.selected_option_id)
        if (missing) {
          setSubmitHint('يرجى الإجابة على جميع الأسئلة قبل التسليم.')
          return
        }
      }
      setSubmitting(true)
      setError('')
      try {
        await submitAttempt(attemptId, built)
        try {
          sessionStorage.removeItem(competitionDraftKey(user?.id, competitionId))
        } catch {
          // ignore
        }
        navigate(`/competitions/result/${attemptId}`, { replace: true })
      } catch (err) {
        setError(auto ? 'انتهى الوقت. تعذر التسليم التلقائي، يرجى تحديث الصفحة.' : err.message || 'فشل الإرسال.')
      } finally {
        setSubmitting(false)
      }
    },
    [allQuestionsAnswered, answers, competitionId, flatQuestions, navigate, payload?.attempt?.id, user?.id],
  )

  useEffect(() => {
    if (!payload?.attempt?.id) return undefined
    const id = setInterval(() => {
      setRemaining((s) => {
        const next = Math.max(0, s - 1)
        if (next === 0 && s > 0) {
          void onSubmit(true)
        }
        return next
      })
    }, 1000)
    return () => clearInterval(id)
  }, [payload?.attempt?.id, onSubmit])

  useEffect(() => {
    if (!payload?.attempt?.id || !competitionId) return
    try {
      sessionStorage.setItem(
        competitionDraftKey(user?.id, competitionId),
        JSON.stringify({
          attemptId: payload.attempt.id,
          answers,
          pageIndex,
          warnedTwoMinutes,
        }),
      )
    } catch {
      // ignore quota / private mode
    }
  }, [answers, competitionId, pageIndex, payload?.attempt?.id, user?.id, warnedTwoMinutes])

  useEffect(() => {
    if (!flatQuestions.length || warnedTwoMinutes || timeWarningOpen) return
    if (remaining > 120 || remaining <= 0) return
    const unansweredNumbers = flatQuestions
      .map((q, idx) => (answers[q.id] == null ? idx + 1 : null))
      .filter((n) => n !== null)
    const unanswered = unansweredNumbers.length
    const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
    const ss = String(Math.max(remaining % 60, 0)).padStart(2, '0')
    const unansweredList = unanswered ? unansweredNumbers.join(' ، ') : 'لا يوجد'
    setTimeWarningMeta({ mm, ss, unanswered, unansweredList })
    setTimeWarningOpen(true)
  }, [remaining, warnedTwoMinutes, timeWarningOpen, flatQuestions, answers])

  const goToQuestion = useCallback(
    (qIndex) => {
      if (!flatQuestions.length) return
      const len = flatQuestions.length
      const clamped = Math.max(0, Math.min(qIndex, len - 1))
      setSubmitHint('')
      setPageIndex(Math.floor(clamped / QUESTIONS_PER_PAGE))
    },
    [flatQuestions.length],
  )

  const onSelectOption = useCallback((questionId, optionId) => {
    setSubmitHint('')
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }))
    const qIndex = flatQuestions.findIndex((q) => q.id === questionId)
    if (qIndex >= 0) {
      setHighlightUnanswered((prev) => {
        const next =
          prev.length === flatQuestions.length ? [...prev] : new Array(flatQuestions.length).fill(false)
        next[qIndex] = false
        return next
      })
    }
  }, [flatQuestions])

  if (!token) return null

  if (loading) {
    return (
      <section id="gac-exam-attempt-root" dir="rtl" lang="ar">
        <p className="gac-exam-attempt__loading">جارٍ تحميل المسابقة...</p>
      </section>
    )
  }

  if (error && !payload) {
    return (
      <section id="gac-exam-attempt-root" dir="rtl" lang="ar">
        <div className="gac-exam-attempt__error">{error}</div>
        <button type="button" className="gac-exam-attempt__back" onClick={() => navigate('/competitions')}>
          العودة إلى المسابقات
        </button>
      </section>
    )
  }

  if (!payload || !flatQuestions.length) {
    return (
      <section id="gac-exam-attempt-root" dir="rtl" lang="ar">
        <div className="gac-exam-attempt__error">{error || 'لا توجد أسئلة لهذه المسابقة.'}</div>
        <button type="button" className="gac-exam-attempt__back" onClick={() => navigate('/competitions')}>
          العودة إلى المسابقات
        </button>
      </section>
    )
  }

  const title = payload?.competition?.title ?? 'مسابقة'
  const totalQuestions = flatQuestions.length
  const totalPages = Math.ceil(totalQuestions / QUESTIONS_PER_PAGE)
  const start = pageIndex * QUESTIONS_PER_PAGE
  const end = Math.min(start + QUESTIONS_PER_PAGE, totalQuestions)
  const visibleQuestions = flatQuestions.slice(start, end)
  const visibleCount = visibleQuestions.length
  const answeredOnThisPage = visibleQuestions.filter(
    (q) => answers[q.id] != null && answers[q.id] !== undefined,
  ).length
  const pageAnswerProgress = visibleCount ? (answeredOnThisPage / visibleCount) * 100 : 0
  const answeredCount = flatQuestions.filter((q) => answers[q.id] != null && answers[q.id] !== undefined).length
  const overallProgress = totalQuestions ? (answeredCount / totalQuestions) * 100 : 0
  const currentPageAnswered = visibleQuestions.every((q) => answers[q.id] != null && answers[q.id] !== undefined)
  const timerUrgent = remaining <= 120

  const flagCurrentPageUnanswered = () => {
    setHighlightUnanswered(() => {
      const next = new Array(totalQuestions).fill(false)
      for (let i = start; i < end; i += 1) {
        const q = flatQuestions[i]
        if (q && answers[q.id] == null) next[i] = true
      }
      return next
    })
  }

  const dismissTimeWarning = () => {
    setTimeWarningOpen(false)
    setTimeWarningMeta(null)
    setWarnedTwoMinutes(true)
  }

  return (
    <section id="gac-exam-attempt-root" dir="rtl" lang="ar">
      <header className="gac-exam-attempt__toolbar">
        <div className="gac-exam-attempt__toolbar-main">
          <p className="gac-exam-attempt__toolbar-label">المسابقة</p>
          <h2 className="gac-exam-attempt__toolbar-title">{title}</h2>
          <p className="gac-exam-attempt__toolbar-meta">
            الصفحة {pageIndex + 1} من {totalPages} — تمت الإجابة على {answeredCount} من {totalQuestions}
          </p>
        </div>
        <div className={`gac-exam-attempt__timer-wrap ${timerUrgent ? 'gac-exam-attempt__timer-wrap--urgent' : ''}`}>
          <span className="gac-exam-attempt__timer-icon" aria-hidden="true">
            ⏱
          </span>
          <div className="gac-exam-attempt__timer-body">
            <span className="gac-exam-attempt__timer-label">الوقت المتبقي</span>
            <span className="gac-exam-attempt__timer-value">{fmt(remaining)}</span>
          </div>
        </div>
      </header>

      {error ? <div className="gac-exam-attempt__error" style={{ marginTop: '0.75rem' }}>{error}</div> : null}

      <div className="gac-exam-attempt__body">
        <nav className="gac-exam-attempt__qmap gac-exam-attempt__qmap--sidebar" aria-label="خريطة الأسئلة والانتقال السريع">
          <div className="gac-exam-attempt__qmap-head">
            <h3 className="gac-exam-attempt__qmap-title">أسئلة المسابقة</h3>
            <div className="gac-exam-attempt__qmap-legend">
              <span className="gac-exam-attempt__qmap-legend-item">
                <span className="gac-exam-attempt__qmap-dot gac-exam-attempt__qmap-dot--done" aria-hidden /> تمت الإجابة
              </span>
              <span className="gac-exam-attempt__qmap-legend-item">
                <span className="gac-exam-attempt__qmap-dot gac-exam-attempt__qmap-dot--todo" aria-hidden /> لم تُجب بعد
              </span>
            </div>
          </div>
          <div className="gac-exam-attempt__qmap-list">
            {flatQuestions.map((q, qIndex) => {
              const answered = answers[q.id] != null && answers[q.id] !== undefined
              const onThisPage = qIndex >= start && qIndex < end
              return (
                <button
                  key={q.id}
                  type="button"
                  className={`gac-exam-attempt__qmap-btn ${answered ? 'gac-exam-attempt__qmap-btn--done' : 'gac-exam-attempt__qmap-btn--todo'} ${onThisPage ? 'gac-exam-attempt__qmap-btn--here' : ''}`}
                  onClick={() => goToQuestion(qIndex)}
                  title={answered ? `السؤال ${qIndex + 1} — تمت الإجابة` : `السؤال ${qIndex + 1} — انتقل للإجابة`}
                >
                  <span className="gac-exam-attempt__qmap-num">{qIndex + 1}</span>
                  <span className="gac-exam-attempt__qmap-label">{answered ? 'تمت الإجابة' : 'لم تُجب'}</span>
                </button>
              )
            })}
          </div>
        </nav>

        <div className="gac-exam-attempt__main">
          <div className="gac-exam-attempt__progress-block" aria-hidden="true">
            <div className="gac-exam-attempt__progress-head">
              <span className="gac-exam-attempt__progress-caption">إجمالي التقدم</span>
              <span className="gac-exam-attempt__progress-pct">{Math.round(overallProgress)}٪</span>
            </div>
            <div className="gac-exam-attempt__progress gac-exam-attempt__progress--overall">
              <span className="gac-exam-attempt__progress-bar" style={{ width: `${overallProgress}%` }} />
            </div>
            <div className="gac-exam-attempt__progress-head gac-exam-attempt__progress-head--sub">
              <span className="gac-exam-attempt__progress-caption">الإجابات في الصفحة الحالية</span>
              <span className="gac-exam-attempt__progress-pct">
                {answeredOnThisPage} من {visibleCount} ({Math.round(pageAnswerProgress)}٪)
              </span>
            </div>
            <div className="gac-exam-attempt__progress">
              <span
                className="gac-exam-attempt__progress-bar gac-exam-attempt__progress-bar--page"
                style={{ width: `${pageAnswerProgress}%` }}
              />
            </div>
          </div>

          <div className="gac-exam-attempt__questions-list">
            {visibleQuestions.map((q, idx) => {
              const absoluteIndex = start + idx
              return (
                <GacExamQuestionCard
                  key={q.id}
                  domId={`gac-exam-q-${absoluteIndex}`}
                  title={q.body}
                  caption={null}
                  activeIndex={absoluteIndex}
                  totalQuestions={totalQuestions}
                  options={q.options ?? []}
                  selectedOptionId={answers[q.id]}
                  onSelectOptionId={(oid) => onSelectOption(q.id, oid)}
                  isUnanswered={Boolean(highlightUnanswered[absoluteIndex])}
                  classes={questionClasses}
                />
              )
            })}
          </div>

          <footer className="gac-exam-attempt__nav">
            {submitHint ? <p className="gac-exam-attempt__hint">{submitHint}</p> : null}
            <div className="gac-exam-attempt__nav-buttons">
              <button
                type="button"
                className="gac-exam-attempt__btn-secondary"
                disabled={pageIndex === 0}
                onClick={() => setPageIndex((x) => x - 1)}
              >
                السابق
              </button>
              {pageIndex < totalPages - 1 ? (
                <button
                  type="button"
                  className="gac-exam-attempt__btn-primary"
                  onClick={() => {
                    if (!currentPageAnswered) {
                      flagCurrentPageUnanswered()
                      setSubmitHint('يرجى الإجابة على جميع أسئلة الصفحة الحالية قبل الانتقال.')
                      return
                    }
                    setSubmitHint('')
                    setPageIndex((x) => x + 1)
                  }}
                >
                  التالي
                </button>
              ) : (
                <button
                  type="button"
                  className="gac-exam-attempt__btn-primary gac-exam-attempt__btn-primary--submit"
                  disabled={submitting || !allQuestionsAnswered}
                  onClick={() => {
                    if (!allQuestionsAnswered) {
                      setHighlightUnanswered(flatQuestions.map((fq) => answers[fq.id] == null))
                      setSubmitHint('يرجى الإجابة على جميع الأسئلة قبل التسليم.')
                      return
                    }
                    void onSubmit(false)
                  }}
                >
                  {submitting ? 'جاري الإرسال…' : 'تسليم المسابقة'}
                </button>
              )}
            </div>
          </footer>
        </div>
      </div>

      {timeWarningOpen && timeWarningMeta ? (
        <div className="gac-exam-attempt__modal-overlay" role="presentation" onClick={dismissTimeWarning}>
          <div
            className="gac-exam-attempt__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gac-comp-time-warning-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="gac-exam-attempt__modal-icon" aria-hidden="true">
              ⏱
            </div>
            <h2 id="gac-comp-time-warning-title" className="gac-exam-attempt__modal-title">
              تنبيه: الوقت أوشك على الانتهاء
            </h2>
            <p className="gac-exam-attempt__modal-lead">
              الوقت المتبقي:{' '}
              <strong className="gac-exam-attempt__modal-time">
                {timeWarningMeta.mm}:{timeWarningMeta.ss}
              </strong>
            </p>
            <ul className="gac-exam-attempt__modal-list">
              <li>
                عدد الأسئلة غير المجابة: <strong>{timeWarningMeta.unanswered}</strong>
              </li>
              <li>
                أرقام الأسئلة غير المجابة: <strong>{timeWarningMeta.unansweredList}</strong>
              </li>
            </ul>
            <button type="button" className="gac-exam-attempt__modal-btn" onClick={dismissTimeWarning}>
              موافق
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
