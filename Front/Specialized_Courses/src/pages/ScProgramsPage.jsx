import { useEffect, useState } from 'react'
import { fetchSpecialCourses } from '../api/specialApi.js'
import ScProgramTile from '../components/sc-programs/ScProgramTile.jsx'
import '../assets/css/ScProgramsPage.css'

export default function ScProgramsPage() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const remote = await fetchSpecialCourses()
      if (!cancelled) {
        setCourses(Array.isArray(remote) ? remote : [])
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div id="sc-page-programs-root" className="sc-page-programs">
      <div className="sc-page-programs__inner">
        <header className="sc-page-programs__hero">
          <h1 className="sc-page-programs__title">المقررات</h1>
          <p className="sc-page-programs__subtitle">اختر مقرراً لعرض المحاضرات والكتب في صفحة المقرر.</p>
        </header>

        {loading ? (
          <p className="sc-page-programs__status" role="status">
            جاري تحميل المقررات…
          </p>
        ) : courses.length === 0 ? (
          <p className="sc-page-programs__status sc-page-programs__status--empty" role="status">
            لا توجد مقررات نشطة من الخادم. تأكد من إضافة مقررات (واجهة المتعلّمين الخاصّين) في لوحة الإدارة وأن عنوان واجهة البرمجة في الإعدادات يشير إلى الخادم الصحيح.
          </p>
        ) : (
          <div className="sc-page-programs__grid">
            {courses.map((c, i) => (
              <ScProgramTile key={c.slug} course={c} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
