import { motion } from 'framer-motion'
import '../../assets/css/GacCoursesPageHeader.css'

export default function GacCoursesPageHeader() {
  return (
    <motion.header
      className="gac-courses-page-header"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="gac-courses-page-header__title">مقررات الاجتماع العام</h1>
      <p className="gac-courses-page-header__subtitle">
        مقررات LMS نشطة، ومحاضرات منشورة من مكتبة المشرف — من قاعدة بيانات الاجتماع العام.
      </p>
    </motion.header>
  )
}
