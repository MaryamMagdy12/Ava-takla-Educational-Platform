import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import {
  fetchAllFamilyQuestionnaires,
  resumeFamilyQuestionnaireResponse,
  saveFamilyQuestionnaireAnswers,
  startFamilyQuestionnaire,
  submitFamilyQuestionnaireResponse,
} from '../api/familyApi.js'
import '../assets/css/GacQuestionnairesPage.css'

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return String(value)
  }
}

export default function GacQuestionnairesPage() {
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(null)
  const [answers, setAnswers] = useState({})
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState(null)

  const showFlash = useCallback((type, message) => {
    setFlash({ type, message })
  }, [])

  useEffect(() => {
    if (!flash) return undefined
    const t = setTimeout(() => setFlash(null), 4200)
    return () => clearTimeout(t)
  }, [flash])

  const load = async () => {
    try {
      const list = await fetchAllFamilyQuestionnaires()
      setRows(Array.isArray(list) ? list : [])
      setError('')
    } catch (e) {
      setError(e.message || 'تعذر تحميل الاستبيانات')
    } finally {
      setLoading(false)
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

  const responseId = active?.response?.id

  const openQuestionnaire = async (row) => {
    setBusy(true)
    try {
      const payload = row.response?.id
        ? await resumeFamilyQuestionnaireResponse(row.response.id)
        : await startFamilyQuestionnaire(row.id)
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
      showFlash('error', e.message || 'تعذر فتح الاستبيان')
    } finally {
      setBusy(false)
    }
  }

  const saveAnswers = async () => {
    if (!responseId) return
    setBusy(true)
    try {
      const payload = Object.entries(answers).map(([qid, value]) => ({
        question_id: Number(qid),
        selected_option_id: value?.selected_option_id ?? null,
        text_answer: value?.text_answer ?? '',
      }))
      await saveFamilyQuestionnaireAnswers(responseId, payload)
      showFlash('success', 'تم حفظ الإجابات')
    } catch (e) {
      showFlash('error', e.message || 'تعذر حفظ الإجابات')
    } finally {
      setBusy(false)
    }
  }

  const submit = async () => {
    if (!responseId) return
    setBusy(true)
    try {
      await saveFamilyQuestionnaireAnswers(
        responseId,
        Object.entries(answers).map(([qid, value]) => ({
          question_id: Number(qid),
          selected_option_id: value?.selected_option_id ?? null,
          text_answer: value?.text_answer ?? '',
        })),
      )
      await submitFamilyQuestionnaireResponse(responseId)
      showFlash('success', 'تم إرسال الاستبيان بنجاح')
      setActive(null)
      setAnswers({})
      await load()
    } catch (e) {
      showFlash('error', e.message || 'تعذر إرسال الاستبيان')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section id="gac-questionnaires-root">
      <div className="gac-questionnaires__shell">
        <div className="gac-questionnaires__hero-wrap">
          <header className="gac-questionnaires__hero">
            <h1 className="gac-questionnaires__title">الاستبيانات</h1>
            <p className="gac-questionnaires__subtitle">أجب عن الاستبيانات المتاحة لك واحفظ إجاباتك ثم أرسلها.</p>
          </header>
          <div className="gac-questionnaires__hero-icon" aria-hidden="true">
            <ClipboardList className="gac-questionnaires__hero-svg" size={30} strokeWidth={1.75} />
          </div>
        </div>

        {flash ? (
          <div
            className={
              flash.type === 'success' ? 'gac-questionnaires__flash gac-questionnaires__flash--ok' : 'gac-questionnaires__flash gac-questionnaires__flash--err'
            }
            role="status"
          >
            {flash.message}
          </div>
        ) : null}

        {error ? <div className="gac-questionnaires__error">{error}</div> : null}
        {loading ? <p className="gac-questionnaires__empty">جاري التحميل…</p> : null}

        <div className="gac-questionnaires__grid">
          {!loading && rows.length === 0 && !error ? (
            <p className="gac-questionnaires__empty" role="status">
              لا توجد استبيانات متاحة حاليًا.
            </p>
          ) : null}
          {rows.map((row) => {
            const status = row.response?.status || 'available'
            const done = status === 'submitted'
            const inProgress = status === 'in_progress'
            const isNew = !row.response
            return (
              <article key={row.id} className="gac-questionnaires__card">
                <div className="gac-questionnaires__card-head">
                  <h3 className="gac-questionnaires__card-title">{row.title}</h3>
                  <div className="gac-questionnaires__badges">
                    {isNew ? (
                      <span className="gac-questionnaires__new" title="استبيان جديد">
                        جديد
                      </span>
                    ) : null}
                    <span
                      className={`gac-questionnaires__chip${done ? ' gac-questionnaires__chip--done' : ''}${inProgress ? ' gac-questionnaires__chip--progress' : ''}`}
                    >
                      {done ? 'تم الإرسال' : inProgress ? 'قيد الإجابة' : 'متاح'}
                    </span>
                  </div>
                </div>
                {row.description ? <p className="gac-questionnaires__card-text">{row.description}</p> : null}
                <div className="gac-questionnaires__card-dates">
                  <p className="gac-questionnaires__card-meta">
                    <span className="gac-questionnaires__meta-label">من</span>
                    {formatDate(row.available_from)}
                  </p>
                  <p className="gac-questionnaires__card-meta">
                    <span className="gac-questionnaires__meta-label">إلى</span>
                    {formatDate(row.available_to)}
                  </p>
                </div>
                <div className="gac-questionnaires__card-actions">
                  {done ? (
                    <>
                      <button type="button" className="gac-questionnaires__btn gac-questionnaires__btn--locked" disabled>
                        مرسل
                      </button>
                      <button type="button" className="gac-questionnaires__btn gac-questionnaires__btn--outline-muted" disabled>
                        تم الإرسال
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="gac-questionnaires__btn gac-questionnaires__btn--primary"
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
        <div className="gac-questionnaires__modal-overlay" onClick={() => setActive(null)}>
          <section className="gac-questionnaires__modal" onClick={(e) => e.stopPropagation()}>
            <div className="gac-questionnaires__modal-head">
              <h2 className="gac-questionnaires__modal-title">{active.questionnaire?.title || 'الاستبيان'}</h2>
              <button type="button" className="gac-questionnaires__btn gac-questionnaires__btn--ghost" onClick={() => setActive(null)}>
                إغلاق
              </button>
            </div>
            <div className="gac-questionnaires__questions">
              {(active.questions || []).map((item) => (
                <article key={item.question.id} className="gac-questionnaires__question-card">
                  <h4 className="gac-questionnaires__question-title">{item.question.body}</h4>
                  {item.question.type === 'text' ? (
                    <textarea
                      className="gac-questionnaires__textarea"
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
                    <div className="gac-questionnaires__options">
                      {(item.question.options || []).map((opt) => (
                        <label key={opt.id} className="gac-questionnaires__option">
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
            <div className="gac-questionnaires__actions">
              <button type="button" className="gac-questionnaires__btn gac-questionnaires__btn--secondary" disabled={busy} onClick={saveAnswers}>
                حفظ
              </button>
              <button type="button" className="gac-questionnaires__btn gac-questionnaires__btn--primary" disabled={busy || !canSubmit} onClick={submit}>
                إرسال
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}
