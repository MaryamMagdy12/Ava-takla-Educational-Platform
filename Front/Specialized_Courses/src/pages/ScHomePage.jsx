import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useScAuth } from '../context/ScAuthContext.jsx'
import { fetchAllSpecialQuestionnaires, fetchSpecialCourses } from '../api/specialApi.js'
import { fetchSpecialExamsCount } from '../api/specialExamApi.js'
import '../assets/css/ScDashboardHome.css'

function StatIconCourses() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"
      />
    </svg>
  )
}

function StatIconExams() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path fill="currentColor" d="M12 3L2 8l10 5 8-4v9h2V8L12 3zm0 7.2L5.3 8 12 4.8 18.7 8 12 10.2z" />
    </svg>
  )
}

function StatIconLectures() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"
      />
    </svg>
  )
}

function StatIconQuestionnaires() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"
      />
    </svg>
  )
}

export default function ScHomePage() {
  const { user } = useScAuth()
  const [courses, setCourses] = useState([])
  const [examCount, setExamCount] = useState(0)
  const [questionnaireCount, setQuestionnaireCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [cRows, examCount, qRows] = await Promise.all([
        fetchSpecialCourses(),
        fetchSpecialExamsCount(),
        fetchAllSpecialQuestionnaires(),
      ])
      if (cancelled) return
      setCourses(Array.isArray(cRows) ? cRows : [])
      setExamCount(Number.isFinite(examCount) ? examCount : 0)
      setQuestionnaireCount(Array.isArray(qRows) ? qRows.length : 0)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const firstName = useMemo(() => {
    const n = user?.full_name?.trim()
    if (!n) return ''
    return n.split(/\s+/)[0]
  }, [user])

  const lectureTotal = useMemo(
    () => courses.reduce((acc, c) => acc + (c.lecturesCount ?? c.lectures?.length ?? 0), 0),
    [courses],
  )

  return (
    <div id="sc-dashboard-root">
      <section className="sc-dashboard__hero">
        <div className="sc-dashboard__hero-inner">
          <div className="sc-dashboard__hero-text">
            <h1 className="sc-dashboard__title">
              {firstName ? `مرحباً، ${firstName}` : 'مرحباً بك'}
            </h1>
            <p className="sc-dashboard__subtitle">
              لوحة التحكم الخاصة بك: المقررات، المحاضرات والكتب، الامتحانات المنشورة، والاستبيانات المتاحة.
            </p>
            <span className="sc-dashboard__chip">الدورات المتخصصة</span>
          </div>
          <div className="sc-dashboard__hero-actions">
            <Link className="sc-dashboard__hero-btn sc-dashboard__hero-btn--primary" to="/courses">
              استعرض المقررات
            </Link>
            <Link className="sc-dashboard__hero-btn sc-dashboard__hero-btn--ghost" to="/exams">
              الامتحانات
            </Link>
          </div>
        </div>
      </section>

      <div className="sc-dashboard__stats">
        <div className="sc-dashboard__stat">
          <div className="sc-dashboard__stat-icon">
            <StatIconCourses />
          </div>
          <div className="sc-dashboard__stat-body">
            <p className="sc-dashboard__stat-label">المقررات النشطة</p>
            <p className="sc-dashboard__stat-value">{courses.length}</p>
          </div>
        </div>
        <div className="sc-dashboard__stat">
          <div className="sc-dashboard__stat-icon">
            <StatIconExams />
          </div>
          <div className="sc-dashboard__stat-body">
            <p className="sc-dashboard__stat-label">امتحانات منشورة</p>
            <p className="sc-dashboard__stat-value">{examCount}</p>
          </div>
        </div>
        <div className="sc-dashboard__stat">
          <div className="sc-dashboard__stat-icon">
            <StatIconLectures />
          </div>
          <div className="sc-dashboard__stat-body">
            <p className="sc-dashboard__stat-label">محاضرات (إجمالي)</p>
            <p className="sc-dashboard__stat-value">{lectureTotal}</p>
          </div>
        </div>
        <div className="sc-dashboard__stat">
          <div className="sc-dashboard__stat-icon">
            <StatIconQuestionnaires />
          </div>
          <div className="sc-dashboard__stat-body">
            <p className="sc-dashboard__stat-label">استبيانات متاحة</p>
            <p className="sc-dashboard__stat-value">{questionnaireCount}</p>
          </div>
        </div>
      </div>

      <div className="sc-dashboard__quick">
        <Link className="sc-dashboard__quick-card" to="/courses">
          <h2 className="sc-dashboard__quick-title">المقررات</h2>
          <p className="sc-dashboard__quick-desc">بطاقات لكل مقرر، مع محاضرات وكتب داخل صفحة المقرر.</p>
        </Link>
        <Link className="sc-dashboard__quick-card" to="/exams">
          <h2 className="sc-dashboard__quick-title">الامتحانات</h2>
          <p className="sc-dashboard__quick-desc">قائمة بكل الامتحانات المنشورة مع ربط المقرر.</p>
        </Link>
        <Link className="sc-dashboard__quick-card" to="/questionnaires">
          <h2 className="sc-dashboard__quick-title">الاستبيانات</h2>
          <p className="sc-dashboard__quick-desc">أجب عن الاستبيانات المتاحة في نافذة منبثقة واحفظ ثم أرسل.</p>
        </Link>
      </div>
    </div>
  )
}
