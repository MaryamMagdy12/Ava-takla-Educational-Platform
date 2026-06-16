import { useEffect, useMemo, useState } from 'react'
import { contentApi, openProtectedStudentMedia } from '../api'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/ui/PageHeader'
import LectureCard from '../components/lectures/LectureCard'
import '../assets/css/LecturesPage.css'

const lectureClasses = {
  root: 'pg-lectures__card',
  cardBody: 'pg-lectures__card-body',
  row: 'pg-lectures__row',
  chip: 'pg-lectures__chip',
  chipType: 'pg-lectures__chip-type',
  badgeNew: 'pg-lectures__badge-new',
  duration: 'pg-lectures__duration',
  durationIc: 'pg-lectures__duration-ic',
  title: 'pg-lectures__card-title',
  highlight: 'pg-lectures__highlight',
  media: 'pg-lectures__media',
  lecturer: 'pg-lectures__lecturer',
  action: 'pg-lectures__action',
  actionIcon: 'pg-lectures__action-icon',
  doneBadge: 'pg-lectures__done-badge',
}

const MEDIA_ALL = 'الكل'
const MEDIA_VIDEO = 'فيديو'
const MEDIA_AUDIO = 'صوت'
const mediaTabLabels = [MEDIA_ALL, MEDIA_VIDEO, MEDIA_AUDIO]

export default function LecturesPage() {
  const { student } = useAuth()
  const [lectures, setLectures] = useState([])
  const [courseFilter, setCourseFilter] = useState('الكل')
  const [mediaFilter, setMediaFilter] = useState(MEDIA_ALL)

  /** Tabs = only real course names from your lectures (same as admin course names). */
  const tabLabels = useMemo(() => {
    const names = [...new Set(lectures.map((l) => l.course).filter(Boolean))]
    names.sort((a, b) => a.localeCompare(b, 'ar', { sensitivity: 'base' }))
    return ['الكل', ...names]
  }, [lectures])

  useEffect(() => {
    if (courseFilter !== 'الكل' && !tabLabels.includes(courseFilter)) {
      setCourseFilter('الكل')
    }
  }, [tabLabels, courseFilter])

  const filtered = useMemo(
    () =>
      lectures.filter((lecture) => {
        const courseOk = courseFilter === 'الكل' || lecture.course === courseFilter
        const mediaOk =
          mediaFilter === MEDIA_ALL ||
          (mediaFilter === MEDIA_VIDEO && lecture.type === 'video') ||
          (mediaFilter === MEDIA_AUDIO && lecture.type === 'audio')
        return courseOk && mediaOk
      }),
    [lectures, courseFilter, mediaFilter],
  )

  useEffect(() => {
    contentApi.getLectures(student).then(setLectures)
  }, [student])

  return (
    <section id="pg-lectures-root">
      <PageHeader
        title="المحاضرات"
        subtitle="تابع دروسك ومحاضراتك المسجلة"
        headerClassName="pg-lectures__hero"
        titleClassName="pg-lectures__title"
        subtitleClassName="pg-lectures__subtitle"
      />
      <p className="pg-lectures__tabs-caption">المادة</p>
      <div className="pg-lectures__tabs" role="tablist" aria-label="تصفية حسب المادة">
        {tabLabels.map((label) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={courseFilter === label}
            className={`pg-lectures__tab ${courseFilter === label ? 'pg-lectures__tab--active' : ''}`}
            onClick={() => setCourseFilter(label)}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="pg-lectures__tabs-caption">نوع المحاضرة</p>
      <div className="pg-lectures__tabs" role="tablist" aria-label="تصفية فيديو أو صوت">
        {mediaTabLabels.map((label) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={mediaFilter === label}
            className={`pg-lectures__tab ${mediaFilter === label ? 'pg-lectures__tab--active' : ''}`}
            onClick={() => setMediaFilter(label)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="pg-lectures__grid">
        {filtered.length === 0 ? (
          <p className="pg-lectures__empty">
            {lectures.length === 0
              ? 'لا توجد محاضرات متاحة حالياً.'
              : 'لا توجد محاضرات تطابق المادة ونوع الملف المختارين.'}
          </p>
        ) : (
          filtered.map((lecture) => (
            <LectureCard
              key={lecture.id}
              lecture={lecture}
              classes={lectureClasses}
              searchQuery=""
              onMediaOpen={
                lecture.accessUrl
                  ? () => openProtectedStudentMedia(lecture.accessUrl).catch(() => {})
                  : undefined
              }
            />
          ))
        )}
      </div>
    </section>
  )
}
