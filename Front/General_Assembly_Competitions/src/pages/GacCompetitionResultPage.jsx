import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchAttemptResult } from '../api/familyApi.js'
import { useGacAuth } from '../context/GacAuthContext.jsx'
import GacExamResultView from '../components/exams/GacExamResultView.jsx'
import {
  GAC_EXAM_RESULT_VIEW_CLASSES,
  mapCompetitionAttemptResult,
} from '../utils/mapGacExamResultPayload.js'
import '../assets/css/GacExamAttemptPage.css'

export default function GacCompetitionResultPage() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const { token } = useGacAuth()
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true })
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetchAttemptResult(attemptId)
        if (!cancelled) setData(res)
      } catch (e) {
        if (!cancelled) setError(e.message || 'تعذّر تحميل النتيجة.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [attemptId, token, navigate])

  if (!token) return null

  if (error) {
    return (
      <div id="gac-exam-attempt-root" className="gac-exam-attempt-root--result" dir="rtl" lang="ar">
        <section className="gac-exam-attempt__result-section">
          <div className="gac-exam-attempt__result-shell">
            <p className="gac-exam-attempt__error">{error}</p>
            <button type="button" className="gac-exam-attempt__back" onClick={() => navigate('/competitions')}>
              العودة للمسابقات
            </button>
          </div>
        </section>
      </div>
    )
  }

  if (!data) {
    return (
      <div id="gac-exam-attempt-root" className="gac-exam-attempt-root--result" dir="rtl" lang="ar">
        <section className="gac-exam-attempt__result-section">
          <div className="gac-exam-attempt__result-shell">
            <p className="gac-exam-attempt__loading">جاري التحميل…</p>
          </div>
        </section>
      </div>
    )
  }

  const result = mapCompetitionAttemptResult(data)

  return (
    <div id="gac-exam-attempt-root" className="gac-exam-attempt-root--result" dir="rtl" lang="ar">
      <GacExamResultView title={result.examTitle} result={result} classes={GAC_EXAM_RESULT_VIEW_CLASSES} />
      <button type="button" className="gac-exam-attempt__back" onClick={() => navigate('/competitions')}>
        العودة لقائمة المسابقات
      </button>
    </div>
  )
}
