import { useEffect, useMemo, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import {
  fetchAllSpecialQuestionnaires,
  resumeSpecialQuestionnaireResponse,
  saveSpecialQuestionnaireAnswers,
  startSpecialQuestionnaire,
  submitSpecialQuestionnaire,
} from '../api/specialApi.js'
import '../assets/css/ScQuestionnairesPage.css'

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return String(value)
  }
}

export default function ScQuestionnairesPage() {
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [active, setActive] = useState(null)
  const [answers, setAnswers] = useState({})
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')

  const load = async () => {
    try {
      const list = await fetchAllSpecialQuestionnaires()
      setRows(Array.isArray(list) ? list : [])
      setError('')
    } catch (e) {
      setError(e.message || 'تعذر تحميل الاستبيانات')
    }
  }

  useEffect(() => {
    load()
  }, [])

  const canSubmit = useMemo(() => {
    if (!active?.questions?.length) return false
    return active.questions.every((q) => {
      const a = answers[q.question.id]
      if (q.question.type === 'text') return Boolean((a?.text_answer || '').trim())
      return Boolean(a?.selected_option_id)
    })
  }, [active, answers])

  const openQuestionnaire = async (row) => {
    setBusy(true)
    try {
      const payload = row.response?.id
        ? await resumeSpecialQuestionnaireResponse(row.response.id)
        : await startSpecialQuestionnaire(row.id)
      setActive(payload)
      const initial = {}
      for (const item of payload?.questions || []) {
        initial[item.question.id] = {
          selected_option_id: item.saved?.selected_option_id ?? null,
          text_answer: item.saved?.text_answer ?? '',
        }
      }
      setAnswers(initial)
    } catch (e) {
      setToast(e.message || 'تعذر فتح الاستبيان')
    } finally {
      setBusy(false)
    }
  }

  const saveAnswers = async () => {
    if (!active?.response?.id) return
    setBusy(true)
    try {
      const payload = Object.entries(answers).map(([qid, value]) => ({
        question_id: Number(qid),
        selected_option_id: value?.selected_option_id ?? null,
        text_answer: value?.text_answer ?? '',
      }))
      await saveSpecialQuestionnaireAnswers(active.response.id, payload)
      setToast('تم حفظ الإجابات')
    } catch (e) {
      setToast(e.message || 'تعذر حفظ الإجابات')
    } finally {
      setBusy(false)
    }
  }

  const submit = async () => {
    if (!active?.response?.id) return
    setBusy(true)
    try {
      await saveAnswers()
      await submitSpecialQuestionnaire(active.response.id)
      setToast('تم إرسال الاستبيان بنجاح')
      setActive(null)
      setAnswers({})
      await load()
    } catch (e) {
      setToast(e.message || 'تعذر إرسال الاستبيان')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3200)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <section id="pg-questionnaires-root">
      {toast ? (
        <div
          style={{
            position: 'fixed',
            bottom: '1rem',
            insetInline: '1rem',
            zIndex: 60,
            padding: '0.65rem 1rem',
            borderRadius: 12,
            background: '#1f3d2b',
            color: '#f5f2e7',
            fontWeight: 700,
            textAlign: 'center',
            maxWidth: 420,
            marginInline: 'auto',
          }}
          role="status"
        >
          {toast}
        </div>
      ) : null}

      <div className="pg-questionnaires__shell">
        <div className="pg-questionnaires__hero-wrap">
          <div className="pg-questionnaires__hero">
            <h1 className="pg-questionnaires__title">الاستبيانات</h1>
            <p className="pg-questionnaires__subtitle">
              أجب عن الاستبيانات المتاحة لك واحفظ إجاباتك ثم أرسلها.
            </p>
          </div>
          <div className="pg-questionnaires__hero-icon" aria-hidden="true">
            <ClipboardList className="pg-questionnaires__hero-svg" size={30} strokeWidth={1.75} />
          </div>
        </div>

        {error ? <div className="pg-questionnaires__error">{error}</div> : null}

        <div className="pg-questionnaires__grid">
          {rows.length === 0 && !error ? (
            <p className="pg-questionnaires__empty" role="status">
              لا توجد استبيانات متاحة حاليًا.
            </p>
          ) : null}
          {rows.map((row) => {
            const status = row.response?.status || 'available'
            const done = status === 'submitted'
            const inProgress = status === 'in_progress'
            const isNew = !row.response
            return (
              <article key={row.id} className="pg-questionnaires__card">
                <div className="pg-questionnaires__card-head">
                  <h3 className="pg-questionnaires__card-title">{row.title}</h3>
                  <div className="pg-questionnaires__badges">
                    {isNew ? (
                      <span className="pg-questionnaires__new" title="استبيان جديد">
                        جديد
                      </span>
                    ) : null}
                    <span
                      className={`pg-questionnaires__chip${done ? ' pg-questionnaires__chip--done' : ''}${inProgress ? ' pg-questionnaires__chip--progress' : ''}`}
                    >
                      {done ? 'تم الإرسال' : inProgress ? 'قيد الإجابة' : 'متاح'}
                    </span>
                  </div>
                </div>
                {row.description ? <p className="pg-questionnaires__card-text">{row.description}</p> : null}
                <div className="pg-questionnaires__card-dates">
                  <p className="pg-questionnaires__card-meta">
                    <span className="pg-questionnaires__meta-label">من</span>
                    {formatDate(row.available_from)}
                  </p>
                  <p className="pg-questionnaires__card-meta">
                    <span className="pg-questionnaires__meta-label">إلى</span>
                    {formatDate(row.available_to)}
                  </p>
                </div>
                <div className="pg-questionnaires__card-actions">
                  {done ? (
                    <>
                      <button type="button" className="pg-questionnaires__btn pg-questionnaires__btn--locked" disabled>
                        مرسل
                      </button>
                      <button
                        type="button"
                        className="pg-questionnaires__btn pg-questionnaires__btn--outline-muted"
                        disabled
                      >
                        تم الإرسال
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="pg-questionnaires__btn pg-questionnaires__btn--primary"
                      disabled={busy}
                      onClick={() => openQuestionnaire(row)}
                    >
                      {inProgress ? 'متابعة' : 'بدء'}
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </div>

      {active ? (
        <div className="pg-questionnaires__modal-overlay" onClick={() => setActive(null)}>
          <section className="pg-questionnaires__modal" onClick={(e) => e.stopPropagation()}>
            <div className="pg-questionnaires__modal-head">
              <h2 className="pg-questionnaires__modal-title">{active.questionnaire?.title || 'الاستبيان'}</h2>
              <button type="button" className="pg-questionnaires__btn pg-questionnaires__btn--ghost" onClick={() => setActive(null)}>
                إغلاق
              </button>
            </div>
            <div className="pg-questionnaires__questions">
              {(active.questions || []).map((item) => (
                <article key={item.question.id} className="pg-questionnaires__question-card">
                  <h4 className="pg-questionnaires__question-title">{item.question.body}</h4>
                  {item.question.type === 'text' ? (
                    <textarea
                      className="pg-questionnaires__textarea"
                      value={answers[item.question.id]?.text_answer || ''}
                      onChange={(e) =>
                        setAnswers((prev) => ({
                          ...prev,
                          [item.question.id]: {
                            ...(prev[item.question.id] || {}),
                            text_answer: e.target.value,
                          },
                        }))
                      }
                    />
                  ) : (
                    <div className="pg-questionnaires__options">
                      {(item.question.options || []).map((opt) => (
                        <label key={opt.id} className="pg-questionnaires__option">
                          <input
                            type="radio"
                            name={`q-${item.question.id}`}
                            checked={Number(answers[item.question.id]?.selected_option_id) === Number(opt.id)}
                            onChange={() =>
                              setAnswers((prev) => ({
                                ...prev,
                                [item.question.id]: {
                                  ...(prev[item.question.id] || {}),
                                  selected_option_id: opt.id,
                                },
                              }))
                            }
                          />
                          <span>{opt.option_text}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
            <div className="pg-questionnaires__actions">
              <button type="button" className="pg-questionnaires__btn pg-questionnaires__btn--secondary" disabled={busy} onClick={saveAnswers}>
                حفظ
              </button>
              <button type="button" className="pg-questionnaires__btn pg-questionnaires__btn--primary" disabled={busy || !canSubmit} onClick={submit}>
                إرسال
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}
