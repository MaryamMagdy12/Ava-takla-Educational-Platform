import { useEffect, useMemo, useState } from 'react'
import { fetchGaCatalogCourses, fetchGaCatalogPublishedLectures } from '../api/familyApi.js'
import GacCoursesPageHeader from '../components/gac-courses/GacCoursesPageHeader.jsx'
import GacCourseFamilyCard from '../components/gac-courses/GacCourseFamilyCard.jsx'
import { getGaLectureMediaKind } from '../components/gac-courses/gacLectureKind.js'
import '../assets/css/GacCoursesPage.css'

export default function GacCoursesPage() {
  const [courses, setCourses] = useState([])
  const [lectures, setLectures] = useState([])
  const [loadError, setLoadError] = useState('')
  const [lectureFilter, setLectureFilter] = useState('all')

  useEffect(() => {
    let cancelled = false
    setLoadError('')
    ;(async () => {
      const [courseRows, lectureRows] = await Promise.all([
        fetchGaCatalogCourses(),
        fetchGaCatalogPublishedLectures(),
      ])
      if (cancelled) return
      if (courseRows === null && lectureRows === null) {
        setLoadError('تعذّر تحميل المحتوى من الخادم.')
        setCourses([])
        setLectures([])
        return
      }
      setCourses(Array.isArray(courseRows) ? courseRows : [])
      setLectures(Array.isArray(lectureRows) ? lectureRows : [])
      if (courseRows === null || lectureRows === null) {
        setLoadError('تعذّر تحميل جزء من القائمة؛ قد تكون البيانات ناقصة.')
      } else {
        setLoadError('')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredLectures = useMemo(() => {
    if (lectureFilter === 'all') return lectures
    return lectures.filter((row) => getGaLectureMediaKind(row) === lectureFilter)
  }, [lectures, lectureFilter])

  const emptyCourses = courses.length === 0
  const emptyLectures = lectures.length === 0
  const showGlobalEmpty = !loadError && emptyCourses && emptyLectures
  const showLectureFilter = !emptyLectures
  const showFilteredLectureEmpty = showLectureFilter && filteredLectures.length === 0

  return (
    <div id="gac-page-courses-root" className="gac-page-courses">
      <GacCoursesPageHeader />
      {loadError ? <p className="gac-page-courses__error">{loadError}</p> : null}
      {showGlobalEmpty ? (
        <p className="gac-page-courses__empty">
          لا توجد مقررات نشطة ولا محاضرات منشورة للجمعية العامة حالياً. أضف محاضرات من لوحة المشرف واضبط حالتها على «منشورة»، أو أنشئ
          مقررات نشطة من نفس اللوحة.
        </p>
      ) : null}
      {!emptyCourses ? (
        <>
          <h2 className="gac-page-courses__section-title">المقررات</h2>
          <div className="gac-page-courses__grid">
            {courses.map((c, i) => (
              <GacCourseFamilyCard key={c.id} course={c} index={i} />
            ))}
          </div>
        </>
      ) : null}
      {!emptyLectures ? (
        <>
          <h2 className="gac-page-courses__section-title">المحاضرات المنشورة</h2>
          <div className="gac-page-courses__filter" role="group" aria-label="تصفية نوع المحاضرة">
            <span className="gac-page-courses__filter-label" id="gac-lecture-filter-label">
              نوع المحاضرة
            </span>
            <div className="gac-page-courses__filter-pills" aria-labelledby="gac-lecture-filter-label">
              <button
                type="button"
                className={lectureFilter === 'all' ? 'gac-page-courses__filter-pill--active' : ''}
                onClick={() => setLectureFilter('all')}
              >
                الكل
              </button>
              <button
                type="button"
                className={lectureFilter === 'video' ? 'gac-page-courses__filter-pill--active' : ''}
                onClick={() => setLectureFilter('video')}
              >
                فيديو
              </button>
              <button
                type="button"
                className={lectureFilter === 'audio' ? 'gac-page-courses__filter-pill--active' : ''}
                onClick={() => setLectureFilter('audio')}
              >
                صوت
              </button>
            </div>
          </div>
          {showFilteredLectureEmpty ? (
            <p className="gac-page-courses__filter-empty">لا توجد محاضرات مطابقة لهذا النوع.</p>
          ) : null}
          {!showFilteredLectureEmpty ? (
            <div className="gac-page-courses__grid">
              {filteredLectures.map((c, i) => (
                <GacCourseFamilyCard key={c.id} course={c} index={i} />
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
