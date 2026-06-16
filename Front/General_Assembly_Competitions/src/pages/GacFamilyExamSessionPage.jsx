import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { resumeFamilyExamAttempt, submitFamilyExamAttempt } from '../api/familyApi'
import GacExamQuestionCard from '../components/exams/GacExamQuestionCard.jsx'
import '../assets/css/GacExamAttemptPage.css'

const QUESTIONS_PER_PAGE = 3
const ANSWERS_STORAGE_PREFIX = 'gac-family-exam-attempt-v1'

function familyExamDraftKey(attemptId) {
  return `${ANSWERS_STORAGE_PREFIX}:${String(attemptId)}`
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

function chapterCaption(q) {
  if (!q) return null
  const t =
    q.testament_type === 'old' ? 'عهد قديم' : q.testament_type === 'new' ? 'عهد جديد' : q.testament_type || ''
  if (q.chapter_number != null && q.chapter_number !== '') return `${t} / أصحاح ${q.chapter_number}`
  return t || null
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

export default function GacFamilyExamSessionPage() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const draftKey = useMemo(() => familyExamDraftKey(attemptId), [attemptId])
  const [payload, setPayload] = useState(null)
  const [answers, setAnswers] = useState({})
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [remaining, setRemaining] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [pageIndex, setPageIndex] = useState(0)
  const [submitHint, setSubmitHint] = useState('')
  const [highlightUnanswered, setHighlightUnanswered] = useState([])
  const [warnedTwoMinutes, setWarnedTwoMinutes] = useState(false)
  const [timeWarningOpen, setTimeWarningOpen] = useState(false)
  const [timeWarningMeta, setTimeWarningMeta] = useState(null)

  const questions = useMemo(() => payload?.questions || [], [payload])
  const flatQuestions = useMemo(() => questions.map((r) => r.question).filter(Boolean), [questions])

  const allQuestionsAnswered = useMemo(
    () =>
      flatQuestions.length > 0 &&
      flatQuestions.every((q) => answers[q.id] != null && answers[q.id] !== undefined),
    [answers, flatQuestions],
  )

  useEffect(() => {
    let cancelled = false
    setLoadError('')
    resumeFamilyExamAttempt(attemptId)
      .then((x) => {
        if (cancelled) return
        setPayload(x)
        setRemaining(x.remaining_seconds ?? 0)
        const initial = {}
        const list = []
        for (const row of x.questions ?? []) {
          const q = row.question
          if (q?.id) {
            initial[q.id] = null
            list.push(q)
          }
        }

        let pageIdx = 0
        let warned = false
        const serverAttemptId = x.attempt?.id
        try {
          const raw = sessionStorage.getItem(draftKey)
          if (raw && serverAttemptId != null) {
            const parsed = JSON.parse(raw)
            if (
              parsed &&
              Number(parsed.attemptId) === Number(serverAttemptId) &&
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
        setError('')
        setWarnedTwoMinutes(warned)
        setTimeWarningOpen(false)
        setTimeWarningMeta(null)
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e.message || 'تعذّر تحميل المحاولة')
      })
    return () => {
      cancelled = true
    }
  }, [attemptId, draftKey])

  const onSubmit = useCallback(
    async (autoSubmit = false) => {
      if (!flatQuestions.length) return
      const prepared = flatQuestions.map((q) => ({
        question_id: q.id,
        selected_option_id: answers[q.id] ?? null,
      }))
      if (!autoSubmit) {
        const missing = prepared.some((x) => !x.selected_option_id)
        if (missing) {
          setSubmitHint('يرجى الإجابة على جميع الأسئلة قبل التسليم.')
          return
        }
      }
      setSubmitting(true)
      setError('')
      setSubmitHint('')
      try {
        await submitFamilyExamAttempt(attemptId, prepared)
        try {
          sessionStorage.removeItem(draftKey)
        } catch {
          // ignore
        }
        navigate(`/exams/result/${attemptId}`, { replace: true })
      } catch (e) {
        setError(
          autoSubmit ? 'انتهى الوقت. تعذر التسليم التلقائي، يرجى تحديث الصفحة.' : e.message || 'تعذّر تسليم الامتحان',
        )
      } finally {
        setSubmitting(false)
      }
    },
    [answers, attemptId, draftKey, flatQuestions, navigate],
  )

  useEffect(() => {
    if (!payload?.attempt?.id) return
    try {
      sessionStorage.setItem(
        draftKey,
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
  }, [answers, draftKey, pageIndex, payload?.attempt?.id, warnedTwoMinutes])

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

  const goToQuestion = useCallback((qIndex) => {
    if (!flatQuestions.length) return
    const len = flatQuestions.length
    const clamped = Math.max(0, Math.min(qIndex, len - 1))
    setSubmitHint('')
    setPageIndex(Math.floor(clamped / QUESTIONS_PER_PAGE))
  }, [flatQuestions.length])

  const onSelectOption = useCallback((questionId, optionId) => {
    setSubmitHint('')
    setError('')
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

  if (loadError) {
    return (
      <section id="gac-exam-attempt-root" dir="rtl" lang="ar">
        <div className="gac-exam-attempt__error">{loadError}</div>
        <button type="button" className="gac-exam-attempt__back" onClick={() => navigate('/exams')}>
          العودة إلى الامتحانات
        </button>
      </section>
    )
  }

  if (!payload) {
    return (
      <section id="gac-exam-attempt-root" dir="rtl" lang="ar">
        <p className="gac-exam-attempt__loading">جارٍ تحميل الامتحان...</p>
      </section>
    )
  }

  if (!flatQuestions.length) {
    return (
      <section id="gac-exam-attempt-root" dir="rtl" lang="ar">
        <div className="gac-exam-attempt__error">لا توجد أسئلة في هذا الامتحان.</div>
        <button type="button" className="gac-exam-attempt__back" onClick={() => navigate('/exams')}>
          العودة إلى الامتحانات
        </button>
      </section>
    )
  }

  const title = payload.exam?.title ?? 'امتحان العائلات'
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
          <p className="gac-exam-attempt__toolbar-label">الامتحان</p>
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
            <h3 className="gac-exam-attempt__qmap-title">أسئلة الامتحان</h3>
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
                  title={q.question_text ?? q.body ?? ''}
                  caption={chapterCaption(q)}
                  activeIndex={absoluteIndex}
                  totalQuestions={totalQuestions}
                  options={q.options || []}
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
                  {submitting ? 'جاري الإرسال…' : 'تسليم الامتحان'}
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
            aria-labelledby="gac-exam-time-warning-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="gac-exam-attempt__modal-icon" aria-hidden="true">
              ⏱
            </div>
            <h2 id="gac-exam-time-warning-title" className="gac-exam-attempt__modal-title">
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
