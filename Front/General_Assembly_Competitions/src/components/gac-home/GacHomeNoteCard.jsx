import { motion } from 'framer-motion'
import '../../assets/css/GacHomeNoteCard.css'

export default function GacHomeNoteCard() {
  return (
    <motion.aside
      className="gac-home-note-card"
      initial={{ opacity: 0, scale: 0.97 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45 }}
    >
      <h2 className="gac-home-note-card__title">لمحة سريعة</h2>
      <ul className="gac-home-note-card__list">
        <li>محتوى موجّه للعائلات دون الحاجة لتسجيل طالب فردي.</li>
        <li>يمكن لاحقاً ربط هذه الصفحات بنفس أسلوب مدرسة الشمامسة (واجهة برمجية).</li>
        <li>التنقّل بين الدورات والاختبارات يبقى داخل هذا الموقع الصغير.</li>
      </ul>
    </motion.aside>
  )
}
