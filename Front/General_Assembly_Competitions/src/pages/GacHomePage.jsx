import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useGacAuth } from '../context/GacAuthContext.jsx'
import {
  fetchGaCatalogCourses,
  fetchGaCatalogPublishedLectures,
  fetchFamilyCompetitionsTotal,
} from '../api/familyApi.js'
import '../assets/css/GacHomePage.css'

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

function StatIconCompetitions() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 2h8l1 4h4l-3 3 1 5-5-3-5 3 1-5-3-3h4l1-4zm4 18l2-2 2 2-2 2-2-2z"
      />
    </svg>
  )
}

export default function GacHomePage() {
  const { user } = useGacAuth()
  const [courseCount, setCourseCount] = useState(null)
  const [competitionTotal, setCompetitionTotal] = useState(null)
  const [loadErr, setLoadErr] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadErr('')
      const [courses, pubLectures, total] = await Promise.all([
        fetchGaCatalogCourses(),
        fetchGaCatalogPublishedLectures(),
        fetchFamilyCompetitionsTotal(),
      ])
      if (cancelled) return
      if (courses === null && pubLectures === null) {
        setLoadErr('تعذّر تحميل بيانات المقررات والمحاضرات.')
        setCourseCount(0)
      } else {
        const n = (courses?.length ?? 0) + (pubLectures?.length ?? 0)
        setCourseCount(n)
        if (courses === null || pubLectures === null) {
          setLoadErr('تعذّر تحميل جزء من الكتالوج؛ قد يكون الرقم ناقصاً.')
        } else {
          setLoadErr('')
        }
      }
      setCompetitionTotal(Number.isFinite(total) ? total : 0)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const firstName = useMemo(() => {
    const n = (user?.display_name && String(user.display_name).trim()) || ''
    if (!n) return ''
    return n.split(/\s+/)[0] || n
  }, [user])

  const showCourses = courseCount !== null
  const showCompetitions = competitionTotal !== null

  return (
    <div id="gac-dashboard-root">
      <section className="gac-dashboard__hero">
        <div className="gac-dashboard__hero-inner">
          <div className="gac-dashboard__hero-text">
            <h1 className="gac-dashboard__title">
              {firstName ? `مرحباً، ${firstName}` : user?.family_login_id ? `عائلة رقم ${user.family_login_id}` : 'مرحباً بكم'}
            </h1>
            <p className="gac-dashboard__subtitle">
              لوحة العائلة: المقررات النشطة والمحاضرات المنشورة من قاعدة البيانات، والمسابقات المنشورة ضمن النافذة الزمنية الحالية.
            </p>
            <span className="gac-dashboard__chip">الاجتماع العام</span>
          </div>
          <div className="gac-dashboard__hero-actions">
            <Link className="gac-dashboard__hero-btn gac-dashboard__hero-btn--primary" to="/courses">
              المقررات
            </Link>
            <Link className="gac-dashboard__hero-btn gac-dashboard__hero-btn--ghost" to="/competitions">
              المسابقات
            </Link>
          </div>
        </div>
      </section>

      {loadErr ? (
        <p className="gac-dashboard__banner" role="alert">
          {loadErr}
        </p>
      ) : null}

      <div className="gac-dashboard__stats">
        <div className="gac-dashboard__stat">
          <div className="gac-dashboard__stat-icon">
            <StatIconCourses />
          </div>
          <div className="gac-dashboard__stat-body">
            <p className="gac-dashboard__stat-label">مقررات + محاضرات منشورة</p>
            <p className="gac-dashboard__stat-value">{showCourses ? courseCount : '…'}</p>
          </div>
        </div>
        <div className="gac-dashboard__stat">
          <div className="gac-dashboard__stat-icon">
            <StatIconCompetitions />
          </div>
          <div className="gac-dashboard__stat-body">
            <p className="gac-dashboard__stat-label">مسابقات منشورة (النافذة الحالية)</p>
            <p className="gac-dashboard__stat-value">{showCompetitions ? competitionTotal : '…'}</p>
          </div>
        </div>
      </div>

      <div className="gac-dashboard__quick">
        <Link className="gac-dashboard__quick-card" to="/courses">
          <h2 className="gac-dashboard__quick-title">المقررات</h2>
          <p className="gac-dashboard__quick-desc">مقررات LMS ومحاضرات منشورة من مكتبة المشرف.</p>
        </Link>
        <Link className="gac-dashboard__quick-card" to="/competitions">
          <h2 className="gac-dashboard__quick-title">المسابقات</h2>
          <p className="gac-dashboard__quick-desc">بدء أو متابعة أو عرض نتيجة المسابقات المتاحة لحسابكم.</p>
        </Link>
        <Link className="gac-dashboard__quick-card" to="/questionnaires">
          <h2 className="gac-dashboard__quick-title">الاستبيانات</h2>
          <p className="gac-dashboard__quick-desc">الاستبيانات المنشورة للجمعية العامة ضمن فترة التقديم.</p>
        </Link>
      </div>
    </div>
  )
}
