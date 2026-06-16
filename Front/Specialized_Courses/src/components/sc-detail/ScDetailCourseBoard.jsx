import { motion } from 'framer-motion'
import '../../assets/css/ScDetailCourseBoard.css'

export default function ScDetailCourseBoard({ course }) {
  return (
    <motion.section
      className="sc-detail-course-board"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="sc-detail-course-board__title">{course.title}</h1>
      <p className="sc-detail-course-board__tagline">{course.tagline}</p>
      <p className="sc-detail-course-board__body">{course.summary}</p>
      <div className="sc-detail-course-board__stats">
        <span className="sc-detail-course-board__stat">
          {course.booksCount ?? course.books?.length ?? 0} كتاب
        </span>
        <span className="sc-detail-course-board__stat">
          {course.lecturesCount ?? course.lectures?.length ?? 0} محاضرة
        </span>
        <span className="sc-detail-course-board__stat">
          {course.examsCount ?? course.exams?.length ?? 0} امتحاناً
        </span>
      </div>
    </motion.section>
  )
}
