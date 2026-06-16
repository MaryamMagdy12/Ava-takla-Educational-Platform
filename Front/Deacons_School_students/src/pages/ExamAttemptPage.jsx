import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { contentApi } from '../api'
import { useAuth } from '../context/AuthContext'
import ExamQuestionCard from '../components/exams/ExamQuestionCard'
import ExamResultView from '../components/exams/ExamResultView'
import '../assets/css/ExamAttemptPage.css'

const fmt = (seconds) => {
  const s = Math.max(0, seconds)
  const m = String(Math.floor(s / 60)).padStart(2, '0')
  const sec = String(s % 60).padStart(2, '0')
  return `${m}:${sec}`
}

const QUESTIONS_PER_PAGE = 3
const ANSWERS_STORAGE_PREFIX = 'exam-attempt-answers-v1'

const questionClasses = {
  root: 'pg-exam-attempt__question',
  unanswered: 'pg-exam-attempt__question--unanswered',
  caption: 'pg-exam-attempt__caption',
  title: 'pg-exam-attempt__q-title',
  options: 'pg-exam-attempt__options',
  option: 'pg-exam-attempt__option',
  optionSelected: 'pg-exam-attempt__option--selected',
  optionInner: 'pg-exam-attempt__option-inner',
  optionLetter: 'pg-exam-attempt__option-letter',
  optionText: 'pg-exam-attempt__option-text',
}

const resultClasses = {
  section: 'pg-exam-attempt__result-section',
  pageTitle: 'pg-exam-attempt__result-title',
  summary: 'pg-exam-attempt__summary',
  summaryLine: 'pg-exam-attempt__summary-line',
  list: 'pg-exam-attempt__qa-list',
  qa: 'pg-exam-attempt__qa',
  qaLine: 'pg-exam-attempt__qa-line',
  qaVerdict: 'pg-exam-attempt__qa-verdict',
  qaVerdictOk: 'pg-exam-attempt__qa-verdict--ok',
  qaVerdictBad: 'pg-exam-attempt__qa-verdict--bad',
  qaExplain: 'pg-exam-attempt__qa-explain',
}

export default function ExamAttemptPage() {
  const { id } = useParams()
  const { student } = useAuth()
  const navigate = useNavigate()
  const [exam, setExam] = useState(null)
  const [allowedEnd, setAllowedEnd] = useState(0)
  const [answers, setAnswers] = useState([])
  const [pageIndex, setPageIndex] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [submitHint, setSubmitHint] = useState('')
  const [nowMs, setNowMs] = useState(0)
  const [highlightUnanswered, setHighlightUnanswered] = useState([])
  const [warnedTwoMinutes, setWarnedTwoMinutes] = useState(false)
  const [timeWarningOpen, setTimeWarningOpen] = useState(false)
  const [timeWarningMeta, setTimeWarningMeta] = useState(null)
  /** After jumping from the question map, scroll this index into view once the page renders. */
  const [scrollToQuestionIndex, setScrollToQuestionIndex] = useState(null)

  const goToQuestion = useCallback(
    (qIndex) => {
      if (!exam?.questions?.length || result) return
      const len = exam.questions.length
      const clamped = Math.max(0, Math.min(qIndex, len - 1))
      setSubmitHint('')
      setPageIndex(Math.floor(clamped / QUESTIONS_PER_PAGE))
      setScrollToQuestionIndex(clamped)
    },
    [exam, result],
  )

  const storageKey = useMemo(() => {
    const examId = String(id ?? '')
    const studentId = String(student?.id ?? '')
    return `${ANSWERS_STORAGE_PREFIX}:${studentId}:${examId}`
  }, [id, student?.id])

  useEffect(() => {
    let cancelled = false
    const boot = async () => {
      try {
        const existing = await contentApi.getExamResult(student, id)
        if (cancelled) return
        if (existing) {
          setExam({ id: Number(id), title: existing.examTitle || 'الامتحان', questions: [] })
          setResult(existing)
          return
        }
        let payload = await contentApi.getExamAttempt(student, id)
        if (cancelled) return
        if (!payload) payload = await contentApi.startExam(student, id)
        if (cancelled) return
        setExam(payload.exam)
        setAllowedEnd(payload.allowedEndTime)
        setNowMs(Date.now())
        const defaultAnswers = new Array(payload.exam.questions.length).fill(null)
        try {
          const raw = sessionStorage.getItem(storageKey)
          if (raw) {
            const parsed = JSON.parse(raw)
            if (parsed && typeof parsed === 'object') {
              const restoredAnswers = Array.isArray(parsed.answers)
                && parsed.answers.length === payload.exam.questions.length
                ? parsed.answers.map((v) => (typeof v === 'number' ? v : null))
                : defaultAnswers
              setAnswers(restoredAnswers)
              const totalPages = Math.ceil(payload.exam.questions.length / QUESTIONS_PER_PAGE)
              const restoredPage = Number(parsed.pageIndex)
              if (Number.isFinite(restoredPage) && restoredPage >= 0) {
                setPageIndex(Math.min(Math.max(0, Math.floor(restoredPage)), Math.max(totalPages - 1, 0)))
              } else {
                setPageIndex(0)
              }
              setWarnedTwoMinutes(Boolean(parsed.warnedTwoMinutes))
            } else {
              setAnswers(defaultAnswers)
              setPageIndex(0)
              setWarnedTwoMinutes(false)
            }
          } else {
            setAnswers(defaultAnswers)
            setPageIndex(0)
            setWarnedTwoMinutes(false)
          }
        } catch {
          setAnswers(defaultAnswers)
          setPageIndex(0)
          setWarnedTwoMinutes(false)
        }
        setHighlightUnanswered(new Array(payload.exam.questions.length).fill(false))
      } catch (e) {
        if (!cancelled) setError(e.message)
      }
    }
    boot()
    return () => {
      cancelled = true
    }
  }, [id, student, storageKey])

  useEffect(() => {
    if (!exam || result) return
    if (!Array.isArray(answers) || answers.length !== exam.questions.length) return
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          answers,
          pageIndex,
          warnedTwoMinutes,
        }),
      )
    } catch {
      // ignore storage failures
    }
  }, [answers, exam, result, storageKey, pageIndex, warnedTwoMinutes])

  useEffect(() => {
    if (scrollToQuestionIndex === null || !exam || result) return undefined
    const domId = `pg-exam-q-${scrollToQuestionIndex}`
    let ticks = 0
    const iv = window.setInterval(() => {
      ticks += 1
      const el = document.getElementById(domId)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        setScrollToQuestionIndex(null)
        window.clearInterval(iv)
      } else if (ticks >= 35) {
        setScrollToQuestionIndex(null)
        window.clearInterval(iv)
      }
    }, 45)
    return () => window.clearInterval(iv)
  }, [scrollToQuestionIndex, pageIndex, exam, result])

  const remainingSeconds = useMemo(() => {
    if (!Number.isFinite(allowedEnd) || !Number.isFinite(nowMs)) return 0
    return Math.floor((allowedEnd - nowMs) / 1000)
  }, [allowedEnd, nowMs])

  const allQuestionsAnswered = useMemo(
    () =>
      Boolean(exam?.questions?.length) &&
      answers.length === exam.questions.length &&
      answers.every((a) => a !== null && a !== undefined),
    [answers, exam],
  )

  const onSubmit = useCallback(
    async (auto = false) => {
      if (!exam || result) return
      if (!auto && !allQuestionsAnswered) {
        setSubmitHint('يرجى الإجابة على جميع الأسئلة قبل التسليم.')
        return
      }
      setSubmitHint('')
      try {
        const final = await contentApi.submitExam(student, exam, answers)
        try {
          sessionStorage.removeItem(storageKey)
        } catch {
          // ignore storage failures
        }
        setResult(final)
      } catch (e) {
        setError(auto ? 'انتهى الوقت. تعذر التسليم التلقائي، يرجى تحديث الصفحة.' : e.message)
      }
    },
    [allQuestionsAnswered, answers, exam, result, student],
  )

  useEffect(() => {
    if (!Number.isFinite(allowedEnd) || allowedEnd <= 0 || result) return
    const timer = setInterval(() => {
      const timestamp = Date.now()
      const remaining = Math.floor((allowedEnd - timestamp) / 1000)
      if (remaining <= 0) {
        clearInterval(timer)
        onSubmit(true)
        return
      }
      setNowMs(timestamp)
    }, 1000)
    return () => clearInterval(timer)
  }, [allowedEnd, result, onSubmit])

  const onSelect = (option) => {
    setSubmitHint('')
    setAnswers((prev) => {
      const next = [...prev]
      next[option.questionIndex] = option.optionIndex
      return next
    })
    setHighlightUnanswered((prev) => {
      const next = [...prev]
      next[option.questionIndex] = false
      return next
    })
  }

  useEffect(() => {
    if (!exam || result || warnedTwoMinutes || timeWarningOpen) return
    if (!Number.isFinite(remainingSeconds)) return
    if (remainingSeconds > 120) return
    const unansweredNumbers = answers
      .map((a, idx) => (a === null || a === undefined ? idx + 1 : null))
      .filter((n) => n !== null)
    const unanswered = unansweredNumbers.length
    const mm = String(Math.floor(remainingSeconds / 60)).padStart(2, '0')
    const ss = String(Math.max(remainingSeconds % 60, 0)).padStart(2, '0')
    const unansweredList = unanswered ? unansweredNumbers.join(' ، ') : 'لا يوجد'
    setTimeWarningMeta({ mm, ss, unanswered, unansweredList })
    setTimeWarningOpen(true)
  }, [exam, result, warnedTwoMinutes, timeWarningOpen, remainingSeconds, answers])

  if (error) {
    return (
      <section id="pg-exam-attempt-root" dir="rtl" lang="ar">
        <div className="pg-exam-attempt__error">{error}</div>
        <button type="button" className="pg-exam-attempt__back" onClick={() => navigate('/exams')}>
          العودة إلى الامتحانات
        </button>
      </section>
    )
  }
  if (!exam) {
    return (
      <section id="pg-exam-attempt-root" dir="rtl" lang="ar">
        <p className="pg-exam-attempt__loading">جارٍ تحميل الامتحان...</p>
      </section>
    )
  }

  if (result) {
    return (
      <div id="pg-exam-attempt-root" className="pg-exam-attempt-root--result" dir="rtl" lang="ar">
        <ExamResultView title={result.examTitle ?? exam.title} result={result} classes={resultClasses} />
      </div>
    )
  }

  const totalQuestions = exam.questions.length
  const totalPages = Math.ceil(totalQuestions / QUESTIONS_PER_PAGE)
  const start = pageIndex * QUESTIONS_PER_PAGE
  const end = Math.min(start + QUESTIONS_PER_PAGE, totalQuestions)
  const visibleQuestions = exam.questions.slice(start, end)
  const visibleCount = visibleQuestions.length
  const answeredOnThisPage = visibleQuestions.filter((_, idx) => {
    const i = start + idx
    return answers[i] !== null && answers[i] !== undefined
  }).length
  const pageAnswerProgress = visibleCount ? (answeredOnThisPage / visibleCount) * 100 : 0
  const answeredCount = answers.filter((a) => a !== null && a !== undefined).length
  const overallProgress = totalQuestions ? (answeredCount / totalQuestions) * 100 : 0
  const currentPageAnswered = visibleQuestions.every((_, idx) => answers[start + idx] !== null && answers[start + idx] !== undefined)

  const flagCurrentPageUnanswered = () => {
    setHighlightUnanswered((prev) => {
      const next = prev.length ? [...prev] : new Array(totalQuestions).fill(false)
      for (let i = start; i < end; i += 1) {
        if (answers[i] === null || answers[i] === undefined) next[i] = true
      }
      return next
    })
  }

  const dismissTimeWarning = () => {
    setTimeWarningOpen(false)
    setTimeWarningMeta(null)
    setWarnedTwoMinutes(true)
  }

  const timerUrgent = remainingSeconds <= 120

  return (
    <section id="pg-exam-attempt-root" dir="rtl" lang="ar">
      <header className="pg-exam-attempt__toolbar">
        <div className="pg-exam-attempt__toolbar-main">
          <p className="pg-exam-attempt__toolbar-label">الامتحان</p>
          <h2 className="pg-exam-attempt__toolbar-title">{exam.title}</h2>
          <p className="pg-exam-attempt__toolbar-meta">
            الصفحة {pageIndex + 1} من {totalPages} — تمت الإجابة على {answeredCount} من {totalQuestions}
          </p>
        </div>
        <div className={`pg-exam-attempt__timer-wrap ${timerUrgent ? 'pg-exam-attempt__timer-wrap--urgent' : ''}`}>
          <span className="pg-exam-attempt__timer-icon" aria-hidden="true">
            ⏱
          </span>
          <div className="pg-exam-attempt__timer-body">
            <span className="pg-exam-attempt__timer-label">الوقت المتبقي</span>
            <span className="pg-exam-attempt__timer-value">{fmt(remainingSeconds)}</span>
          </div>
        </div>
      </header>

      <div className="pg-exam-attempt__body">
        <nav
          className="pg-exam-attempt__qmap pg-exam-attempt__qmap--sidebar"
          aria-label="خريطة الأسئلة والانتقال السريع"
        >
          <div className="pg-exam-attempt__qmap-head">
            <h3 className="pg-exam-attempt__qmap-title">أسئلة الامتحان</h3>
            <div className="pg-exam-attempt__qmap-legend">
              <span className="pg-exam-attempt__qmap-legend-item">
                <span className="pg-exam-attempt__qmap-dot pg-exam-attempt__qmap-dot--done" aria-hidden /> تمت الإجابة
              </span>
              <span className="pg-exam-attempt__qmap-legend-item">
                <span className="pg-exam-attempt__qmap-dot pg-exam-attempt__qmap-dot--todo" aria-hidden /> لم تُجب بعد
              </span>
            </div>
          </div>
          <div className="pg-exam-attempt__qmap-list">
            {exam.questions.map((_, qIndex) => {
              const answered = answers[qIndex] !== null && answers[qIndex] !== undefined
              const onThisPage = qIndex >= start && qIndex < end
              return (
                <button
                  key={qIndex}
                  type="button"
                  className={`pg-exam-attempt__qmap-btn ${answered ? 'pg-exam-attempt__qmap-btn--done' : 'pg-exam-attempt__qmap-btn--todo'} ${onThisPage ? 'pg-exam-attempt__qmap-btn--here' : ''}`}
                  onClick={() => goToQuestion(qIndex)}
                  title={answered ? `السؤال ${qIndex + 1} — تمت الإجابة` : `السؤال ${qIndex + 1} — انتقل للإجابة`}
                >
                  <span className="pg-exam-attempt__qmap-num">{qIndex + 1}</span>
                  <span className="pg-exam-attempt__qmap-label">
                    {answered ? 'تمت الإجابة' : 'لم تُجب'}
                  </span>
                </button>
              )
            })}
          </div>
        </nav>

        <div className="pg-exam-attempt__main">
          <div className="pg-exam-attempt__progress-block" aria-hidden="true">
            <div className="pg-exam-attempt__progress-head">
              <span className="pg-exam-attempt__progress-caption">إجمالي التقدم</span>
              <span className="pg-exam-attempt__progress-pct">{Math.round(overallProgress)}٪</span>
            </div>
            <div className="pg-exam-attempt__progress pg-exam-attempt__progress--overall">
              <span className="pg-exam-attempt__progress-bar" style={{ width: `${overallProgress}%` }} />
            </div>
        <div className="pg-exam-attempt__progress-head pg-exam-attempt__progress-head--sub">
          <span className="pg-exam-attempt__progress-caption">الإجابات في الصفحة الحالية</span>
          <span className="pg-exam-attempt__progress-pct">
            {answeredOnThisPage} من {visibleCount} ({Math.round(pageAnswerProgress)}٪)
          </span>
        </div>
        <div className="pg-exam-attempt__progress">
          <span
            className="pg-exam-attempt__progress-bar pg-exam-attempt__progress-bar--page"
            style={{ width: `${pageAnswerProgress}%` }}
          />
        </div>
          </div>

          <div className="pg-exam-attempt__questions-list">
            {visibleQuestions.map((question, idx) => {
              const absoluteIndex = start + idx
              return (
                <ExamQuestionCard
                  key={question.id ?? absoluteIndex}
                  domId={`pg-exam-q-${absoluteIndex}`}
                  question={question}
                  activeIndex={absoluteIndex}
                  totalQuestions={exam.questions.length}
                  selectedAnswer={answers[absoluteIndex]}
                  onSelect={(optionIndex) => onSelect({ questionIndex: absoluteIndex, optionIndex })}
                  isUnanswered={Boolean(highlightUnanswered[absoluteIndex])}
                  classes={questionClasses}
                />
              )
            })}
          </div>

          <footer className="pg-exam-attempt__nav">
            {submitHint ? <p className="pg-exam-attempt__hint">{submitHint}</p> : null}
            <div className="pg-exam-attempt__nav-buttons">
              <button
                type="button"
                className="pg-exam-attempt__btn-secondary"
                disabled={pageIndex === 0}
                onClick={() => setPageIndex((x) => x - 1)}
              >
                السابق
              </button>
              {pageIndex < totalPages - 1 ? (
                <button
                  type="button"
                  className="pg-exam-attempt__btn-primary"
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
                  className="pg-exam-attempt__btn-primary pg-exam-attempt__btn-primary--submit"
                  disabled={!allQuestionsAnswered}
                  onClick={() => {
                    if (!allQuestionsAnswered) {
                      setHighlightUnanswered(answers.map((a) => a === null || a === undefined))
                      setSubmitHint('يرجى الإجابة على جميع الأسئلة قبل التسليم.')
                      return
                    }
                    onSubmit(false)
                  }}
                >
                  تسليم الامتحان
                </button>
              )}
            </div>
          </footer>
        </div>
      </div>

      {timeWarningOpen && timeWarningMeta ? (
        <div className="pg-exam-attempt__modal-overlay" role="presentation" onClick={dismissTimeWarning}>
          <div
            className="pg-exam-attempt__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pg-exam-time-warning-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pg-exam-attempt__modal-icon" aria-hidden="true">
              ⏱
            </div>
            <h2 id="pg-exam-time-warning-title" className="pg-exam-attempt__modal-title">
              تنبيه: الوقت أوشك على الانتهاء
            </h2>
            <p className="pg-exam-attempt__modal-lead">
              الوقت المتبقي:{' '}
              <strong className="pg-exam-attempt__modal-time">
                {timeWarningMeta.mm}:{timeWarningMeta.ss}
              </strong>
            </p>
            <ul className="pg-exam-attempt__modal-list">
              <li>
                عدد الأسئلة غير المجابة: <strong>{timeWarningMeta.unanswered}</strong>
              </li>
              <li>
                أرقام الأسئلة غير المجابة: <strong>{timeWarningMeta.unansweredList}</strong>
              </li>
            </ul>
            <button type="button" className="pg-exam-attempt__modal-btn" onClick={dismissTimeWarning}>
              موافق
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
