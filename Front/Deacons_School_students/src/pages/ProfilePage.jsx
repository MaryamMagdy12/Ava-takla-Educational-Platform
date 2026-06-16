import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LearnerAvatar from '../components/LearnerAvatar'
import { mapUserToStudent } from '../api/liveApi'
import { studentClient } from '../api/axiosClient'
import '../assets/css/ProfilePage.css'

function dash(v) {
  const s = v == null ? '' : String(v).trim()
  return s === '' ? '—' : s
}

export default function ProfilePage() {
  const { student: authStudent } = useAuth()
  const [student, setStudent] = useState(authStudent)

  useEffect(() => {
    setStudent(authStudent)
  }, [authStudent])

  useEffect(() => {
    if (!authStudent) return undefined
    let alive = true
    ;(async () => {
      try {
        const { data: body } = await studentClient.get('/student/profile')
        const u = body?.data
        if (alive && u) setStudent(mapUserToStudent(u))
      } catch {
        /* keep session snapshot */
      }
    })()
    return () => {
      alive = false
    }
  }, [authStudent?.id])

  if (!student) return null

  return (
    <div id="pg-profile-root">
      <section className="pg-profile__hero">
        <LearnerAvatar className="pg-profile__avatar" photoUrl={student?.photoUrl} name={student?.name} title={student?.name} />
        <div>
          <h1 className="pg-profile__title">الحساب الشخصي</h1>
          <p className="pg-profile__subtitle">بيانات الطالب والمرحلة الدراسية</p>
        </div>
      </section>

      <section className="pg-profile__grid">
        <article className="pg-profile__card">
          <h2 className="pg-profile__card-title">البيانات الأساسية</h2>
          <p className="pg-profile__line"><strong>الاسم:</strong> {student.name}</p>
          <p className="pg-profile__line"><strong>رقم الطالب:</strong> {student.studentUniqueId ?? student.id}</p>
          <p className="pg-profile__line"><strong>المرحلة:</strong> {student.level}</p>
          {/* <p className="pg-profile__line"><strong>المسار:</strong> {student.curriculumTrack}</p> */}

          <h3 className="pg-profile__card-subtitle">بيانات ولي الأمر</h3>
          <p className="pg-profile__line"><strong>اسم ولي الأمر:</strong> {dash(student.parentName)}</p>
          <p className="pg-profile__line">
            <strong>رقم ولي الأمر:</strong>{' '}
            <span className="pg-profile__ltr" dir="ltr">
              {dash(student.parentPhone)}
            </span>
          </p>
          <p className="pg-profile__line">
            <strong>بريد ولي الأمر:</strong>{' '}
            <span className="pg-profile__ltr" dir="ltr">
              {dash(student.parentEmail)}
            </span>
          </p>
        </article>

        <article className="pg-profile__card">
          <h2 className="pg-profile__card-title">روابط سريعة</h2>
          <div className="pg-profile__actions">
            <Link to="/exams" className="pg-profile__action">الامتحانات</Link>
            <Link to="/lectures" className="pg-profile__action">المحاضرات</Link>
            <Link to="/books" className="pg-profile__action">المكتبة</Link>
            <Link to="/" state={{ openExamHistory: true }} className="pg-profile__action">
              سجل الدرجات
            </Link>
            {/* <Link to="/change-password" className="pg-profile__action pg-profile__action--danger">تغيير كلمة المرور</Link> */}
          </div>
        </article>
      </section>
    </div>
  )
}
