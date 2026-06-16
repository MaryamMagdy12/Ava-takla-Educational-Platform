import { motion } from 'framer-motion'
import '../../assets/css/ScDetailExamsHeading.css'

export default function ScDetailExamsHeading() {
  return (
    <motion.h2
      className="sc-detail-exams-heading"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35 }}
    >
      امتحانات هذه الدورة
    </motion.h2>
  )
}
