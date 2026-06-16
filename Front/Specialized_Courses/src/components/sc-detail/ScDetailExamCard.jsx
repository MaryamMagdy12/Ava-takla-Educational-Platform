import { motion } from 'framer-motion'
import '../../assets/css/ScDetailExamCard.css'

export default function ScDetailExamCard({ exam, index }) {
  return (
    <motion.article
      className="sc-detail-exam-card"
      initial={{ opacity: 0, x: 24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-25px' }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ x: -4 }}
    >
      <div className="sc-detail-exam-card__row">
        <span className="sc-detail-exam-card__type">{exam.type}</span>
        <span className="sc-detail-exam-card__time">{exam.durationMin} دقيقة</span>
      </div>
      <h2 className="sc-detail-exam-card__title">{exam.title}</h2>
      <button type="button" className="sc-detail-exam-card__fake">
        فتح الامتحان (واجهة فقط)
      </button>
    </motion.article>
  )
}
