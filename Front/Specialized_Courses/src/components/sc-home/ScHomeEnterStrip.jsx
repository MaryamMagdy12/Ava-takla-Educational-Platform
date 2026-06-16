import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import '../../assets/css/ScHomeEnterStrip.css'

export default function ScHomeEnterStrip() {
  return (
    <motion.div
      className="sc-home-enter-strip"
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.12 }}
    >
      <Link className="sc-home-enter-strip__cta" to="/courses">
        استعراض كل الدورات
      </Link>
      <p className="sc-home-enter-strip__hint">كل دورة تعرض الكتب والمحاضرات والامتحانات في صفحة التفاصيل.</p>
    </motion.div>
  )
}
