import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchFamilyExamResult } from '../api/familyApi.js'
import GacExamResultView from '../components/exams/GacExamResultView.jsx'
import {
  GAC_EXAM_RESULT_VIEW_CLASSES,
  mapFamilyExamAttemptResult,
} from '../utils/mapGacExamResultPayload.js'
import '../assets/css/GacExamAttemptPage.css'

export default function GacFamilyExamResultPage() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const [payload, setPayload] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    fetchFamilyExamResult(attemptId)
      .then((x) => setPayload(x))
      .catch((e) => setErr(e.message || 'تعذّر تحميل النتيجة'))
  }, [attemptId])

  if (err) {
    return (
      <div id="gac-exam-attempt-root" className="gac-exam-attempt-root--result" dir="rtl" lang="ar">
        <section className="gac-exam-attempt__result-section">
          <div className="gac-exam-attempt__result-shell">
            <p className="gac-exam-attempt__error">{err}</p>
            <button type="button" className="gac-exam-attempt__back" onClick={() => navigate('/exams')}>
              العودة للامتحانات
            </button>
          </div>
        </section>
      </div>
    )
  }

  if (!payload) {
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

  const result = mapFamilyExamAttemptResult(payload)

  return (
    <div id="gac-exam-attempt-root" className="gac-exam-attempt-root--result" dir="rtl" lang="ar">
      <GacExamResultView title={result.examTitle} result={result} classes={GAC_EXAM_RESULT_VIEW_CLASSES} />
      <button type="button" className="gac-exam-attempt__back" onClick={() => navigate('/exams')}>
        العودة للامتحانات
      </button>
    </div>
  )
}
