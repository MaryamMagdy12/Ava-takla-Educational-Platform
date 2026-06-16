import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { fetchSpecialCourseById } from '../api/specialApi.js'
import ScDetailStickyNav from '../components/sc-detail/ScDetailStickyNav.jsx'
import ScDetailCourseBoard from '../components/sc-detail/ScDetailCourseBoard.jsx'
import ScLectureCard from '../components/sc-detail/ScLectureCard.jsx'
import { motion } from 'framer-motion'
import '../assets/css/ScCourseDetailPage.css'

function inAnswersSeries(lecture) {
  const t = String(lecture?.lectureType ?? '').toLowerCase()
  if (t === 'audio') return true
  return /أجيبة|إجابة|أجيب/i.test(String(lecture?.title ?? ''))
}

export default function ScCourseDetailPage() {
  const { slug } = useParams()
  const [course, setCourse] = useState(null)
  const [loadState, setLoadState] = useState('loading')
  const [tab, setTab] = useState('lectures')

  useEffect(() => {
    let cancelled = false
    setLoadState('loading')
    setCourse(null)
    ;(async () => {
      const remote = await fetchSpecialCourseById(slug)
      if (cancelled) return
      if (remote) {
        setCourse(remote)
        setLoadState('ok')
      } else {
        setLoadState('notfound')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  const sortedLectureIds = useMemo(() => {
    const list = course?.lectures ?? []
    return [...list].sort((a, b) => Number(a.id) - Number(b.id))
  }, [course])

  const newLectureIdSet = useMemo(() => {
    const set = new Set()
    sortedLectureIds.slice(0, 2).forEach((l) => set.add(l.id))
    return set
  }, [sortedLectureIds])

  if (loadState === 'loading') {
    return (
      <div id="sc-page-detail-root" className="sc-page-detail">
        <div className="sc-page-detail__inner">
          <p className="sc-course-tabs__empty" role="status">
            جاري تحميل المقرر…
          </p>
        </div>
      </div>
    )
  }

  if (loadState === 'notfound' || !course) {
    return <Navigate to="/courses" replace />
  }

  const lectures = course.lectures ?? []
  const books = course.books ?? []

  return (
    <div id="sc-page-detail-root" className="sc-page-detail">
      <div className="sc-page-detail__inner">
        <ScDetailStickyNav title={course.title} />
        <ScDetailCourseBoard course={course} />

        <div className="sc-course-tabs" role="tablist" aria-label="محتوى المقرر">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'lectures'}
            className={`sc-course-tabs__btn${tab === 'lectures' ? ' sc-course-tabs__btn--active' : ''}`}
            onClick={() => setTab('lectures')}
          >
            المحاضرات
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'books'}
            className={`sc-course-tabs__btn${tab === 'books' ? ' sc-course-tabs__btn--active' : ''}`}
            onClick={() => setTab('books')}
          >
            الكتب
          </button>
        </div>

        {tab === 'lectures' ? (
          <motion.div
            key="lectures"
            className="sc-course-tabs__panel"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
          >
            {lectures.length ? (
              <div className="sc-lectures-section">
                <h2 className="sc-lectures-section__heading">تابع دروسك ومحاضراتك المسجلة</h2>
                <ul className="sc-lectures-section__grid">
                  {lectures.map((l) => (
                    <li key={l.id} className="sc-lectures-section__cell">
                      <ScLectureCard
                        lecture={l}
                        showNewTag={newLectureIdSet.has(l.id)}
                        showAnswersTag={inAnswersSeries(l)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="sc-course-tabs__empty">لا توجد محاضرات مدرجة لهذا المقرر بعد.</p>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="books"
            className="sc-course-tabs__panel"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
          >
            {books.length ? (
              <ul className="sc-page-detail__resource-list sc-page-detail__resource-list--cards">
                {books.map((b) => (
                  <li key={b.id} className="sc-course-resource-card">
                    <span className="sc-course-resource-card__title">{b.title}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="sc-course-tabs__empty">لا توجد كتب مدرجة لهذا المقرر بعد.</p>
            )}
          </motion.div>
        )}

        <p className="sc-page-detail__exam-hint">
          لعرض الامتحانات المنشورة لهذا المقرر، افتح صفحة <Link className="sc-page-detail__exam-link" to="/exams">الامتحانات</Link>.
        </p>
      </div>
    </div>
  )
}
