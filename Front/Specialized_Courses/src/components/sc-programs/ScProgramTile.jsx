import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import '../../assets/css/ScProgramTile.css'

export default function ScProgramTile({ course, index }) {
  const examCount = course.examsCount ?? course.exams?.length ?? 0
  const booksCount = course.booksCount ?? course.books?.length ?? 0
  const lecturesCount = course.lecturesCount ?? course.lectures?.length ?? 0
  return (
    <motion.div
      className="sc-program-tile-wrap"
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.48, delay: index * 0.08 }}
    >
      <Link className="sc-program-tile" to={`/courses/${course.slug}`}>
        <div className="sc-program-tile__top">
          <span className="sc-program-tile__units">{booksCount} كتب · {lecturesCount} محاضرات</span>
          <span className="sc-program-tile__exams">{examCount} امتحانات</span>
        </div>
        <h2 className="sc-program-tile__title">{course.title}</h2>
        {course.tagline ? <p className="sc-program-tile__tagline">{course.tagline}</p> : null}
        {course.summary ? <p className="sc-program-tile__summary">{course.summary}</p> : null}
        <span className="sc-program-tile__go">فتح تفاصيل الدورة</span>
      </Link>
    </motion.div>
  )
}
