import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchAllFamilyExams,
  fetchFamilyExamAttempt,
  mapFamilyExamRow,
  startFamilyExam,
} from '../api/familyApi'
import GacExamHubCard from '../components/gac-exams/GacExamHubCard.jsx'
import '../assets/css/GacExamsHub.css'

export default function GacFamilyExamsPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [startingId, setStartingId] = useState(null)
  const [search, setSearch] = useState('')
  const [courseFilter, setCourseFilter] = useState('كل المواد')
  const [stateFilter, setStateFilter] = useState('كل الحالات')

  useEffect(() => {
    fetchAllFamilyExams()
      .then((x) => setRows(Array.isArray(x) ? x.map(mapFamilyExamRow) : []))
      .catch((e) => setErr(e.message || 'تعذّر تحميل الامتحانات'))
      .finally(() => setLoading(false))
  }, [])

  const courseOptions = useMemo(() => [...new Set(rows.map((item) => item.course).filter(Boolean))], [rows])

  const filtered = useMemo(
    () =>
      rows.filter((item) => {
        const searchOk = String(item.title).toLowerCase().includes(search.trim().toLowerCase())
        const courseOk = courseFilter === 'كل المواد' || item.course === courseFilter
        let stateOk = true
        if (stateFilter === 'كل الحالات') stateOk = true
        else if (stateFilter === 'متاح الآن') {
          stateOk = item.state === 'Available' || item.state === 'In Progress'
        } else if (stateFilter === 'قريبًا') {
          stateOk = item.state === 'Upcoming'
        } else if (stateFilter === 'منتهي') {
          stateOk = item.state === 'Submitted' || item.state === 'Expired'
        }
        return searchOk && courseOk && stateOk
      }),
    [courseFilter, rows, search, stateFilter],
  )

  const counts = useMemo(
    () => ({
      available: rows.filter((item) => item.state === 'Available' || item.state === 'In Progress').length,
      upcoming: rows.filter((item) => item.state === 'Upcoming').length,
      done: rows.filter((item) => item.state === 'Submitted' || item.state === 'Expired').length,
    }),
    [rows],
  )

  async function handleStart(examId) {
    setErr('')
    setStartingId(examId)
    try {
      let payload = await fetchFamilyExamAttempt(examId)
      if (!payload) {
        payload = await startFamilyExam(examId)
      }
      navigate(`/exams/session/${payload.attempt.id}`)
    } catch (e) {
      setErr(e.message || 'تعذّر بدء الامتحان')
    } finally {
      setStartingId(null)
    }
  }

  return (
    <section id="gac-exams-hub-root">
      <div className="gac-exams-hub__top">
        <header className="gac-exams-hub__hero">
          <h1 className="gac-exams-hub__title">الامتحانات</h1>
          <p className="gac-exams-hub__subtitle">استعد جيداً واختبر معلوماتك</p>
        </header>
        <section className="gac-exams-hub__summary" aria-label="ملخص الامتحانات">
          <article className="gac-exams-hub__summary-box">
            <span>المتاحة</span>
            <strong>{counts.available}</strong>
          </article>
          <article className="gac-exams-hub__summary-box">
            <span>القادمة</span>
            <strong>{counts.upcoming}</strong>
          </article>
          <article className="gac-exams-hub__summary-box">
            <span>المنتهية</span>
            <strong>{counts.done}</strong>
          </article>
        </section>
      </div>

      <section className="gac-exams-hub__toolbar">
        <div className="gac-exams-hub__search-wrap">
          <span className="gac-exams-hub__search-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path
                fill="currentColor"
                d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
              />
            </svg>
          </span>
          <input
            className="gac-exams-hub__search"
            placeholder="ابحث عن امتحان..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            type="search"
            aria-label="بحث في الامتحانات"
          />
        </div>
        {/* <select className="gac-exams-hub__select" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
          <option>كل المواد</option>
          {courseOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select> */}
        <select className="gac-exams-hub__select" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
          <option>كل الحالات</option>
          <option>متاح الآن</option>
          <option>قريبًا</option>
          <option>منتهي</option>
        </select>
      </section>

      {err ? <div className="gac-exams-hub__error">{err}</div> : null}
      {loading ? <p className="gac-exams-hub__loading">جاري التحميل…</p> : null}

      {!loading && !err && rows.length === 0 ? <p className="gac-exams-hub__empty">لا توجد امتحانات منشورة.</p> : null}

      {!loading && rows.length > 0 && filtered.length === 0 ? (
        <p className="gac-exams-hub__empty">لا توجد نتائج تطابق عوامل التصفية.</p>
      ) : null}

      <div className="gac-exams-hub__grid">
        {filtered.map((exam) => {
          const isFinished = exam.state === 'Submitted' || exam.state === 'Expired'
          const detailsTo = isFinished && exam.attempt?.id ? `/exams/result/${exam.attempt.id}` : null

          const primaryTo =
            exam.state === 'In Progress' && exam.attempt?.id ? `/exams/session/${exam.attempt.id}` : null

          const useStart = exam.state === 'Available'
          const busy = startingId === exam.id

          return (
            <GacExamHubCard
              key={exam.id}
              exam={exam}
              primaryTo={useStart ? null : primaryTo}
              onPrimary={useStart ? () => handleStart(exam.id) : null}
              primaryBusy={busy}
              detailsTo={detailsTo}
            />
          )
        })}
      </div>
    </section>
  )
}
