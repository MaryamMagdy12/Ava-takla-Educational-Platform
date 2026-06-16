import { useEffect, useMemo, useState } from 'react'
import ScPageHeader from '../components/sc-ui/ScPageHeader.jsx'
import ExamListCard from '../components/sc-exams/ExamListCard.jsx'
import { specialExamApi } from '../api/specialExamApi.js'
import '../assets/css/ScExamsPage.css'

export default function ScExamsPage() {
  const [exams, setExams] = useState([])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [courseFilter, setCourseFilter] = useState('كل المواد')
  const [stateFilter, setStateFilter] = useState('كل الحالات')

  const examCardClasses = useMemo(
    () => ({
      root: 'pg-exams__card',
      head: 'pg-exams__head',
      chip: 'pg-exams__chip',
      state: 'pg-exams__state',
      title: 'pg-exams__card-title',
      meta: 'pg-exams__meta',
      metaIcon: 'pg-exams__meta-icon',
      metaSep: 'pg-exams__meta-sep',
      score: 'pg-exams__score',
      scoreMuted: 'pg-exams__score-muted',
      finishedFooter: 'pg-exams__finished-footer',
      detailsLink: 'pg-exams__details-link',
      primaryLink: 'pg-exams__primary',
      secondaryBtn: 'pg-exams__secondary',
    }),
    [],
  )

  useEffect(() => {
    specialExamApi
      .getExams()
      .then(setExams)
      .catch((e) => setError(e.message || 'تعذر تحميل الامتحانات'))
  }, [])

  const courseOptions = useMemo(() => [...new Set(exams.map((item) => item.course).filter(Boolean))], [exams])
  const filtered = useMemo(
    () =>
      exams.filter((item) => {
        const searchOk = item.title.toLowerCase().includes(search.trim().toLowerCase())
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
    [courseFilter, exams, search, stateFilter],
  )
  const counts = useMemo(
    () => ({
      available: exams.filter((item) => item.state === 'Available' || item.state === 'In Progress').length,
      upcoming: exams.filter((item) => item.state === 'Upcoming').length,
      done: exams.filter((item) => item.state === 'Submitted' || item.state === 'Expired').length,
    }),
    [exams],
  )

  return (
    <section id="pg-exams-root">
      <div className="pg-exams__top">
        <ScPageHeader
          title="الامتحانات"
          subtitle="استعد جيداً واختبر معلوماتك"
          headerClassName="pg-exams__hero"
          titleClassName="pg-exams__title"
          subtitleClassName="pg-exams__subtitle"
        />
        <section className="pg-exams__summary" aria-label="ملخص الامتحانات">
          <article className="pg-exams__summary-box">
            <span>المتاحة</span>
            <strong>{counts.available}</strong>
          </article>
          <article className="pg-exams__summary-box">
            <span>القادمة</span>
            <strong>{counts.upcoming}</strong>
          </article>
          <article className="pg-exams__summary-box">
            <span>المنتهية</span>
            <strong>{counts.done}</strong>
          </article>
        </section>
      </div>
      <section className="pg-exams__toolbar">
        <div className="pg-exams__search-wrap">
          <span className="pg-exams__search-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path
                fill="currentColor"
                d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
              />
            </svg>
          </span>
          <input
            className="pg-exams__search"
            placeholder="ابحث عن امتحان..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            type="search"
            aria-label="بحث في الامتحانات"
          />
        </div>
        <select className="pg-exams__select" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
          <option>كل المواد</option>
          {courseOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <select className="pg-exams__select" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
          <option>كل الحالات</option>
          <option>متاح الآن</option>
          <option>قريبًا</option>
          <option>منتهي</option>
        </select>
      </section>
      {error ? <div className="pg-exams__error">{error}</div> : null}
      <div className="pg-exams__grid">
        {filtered.map((exam) => (
          <ExamListCard key={exam.id} exam={exam} classes={examCardClasses} />
        ))}
      </div>
    </section>
  )
}
