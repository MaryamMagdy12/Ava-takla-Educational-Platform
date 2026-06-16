import { motion } from 'framer-motion'
import '../../assets/css/GacExamsIntro.css'

export default function GacExamsIntro() {
  return (
    <motion.div
      className="gac-exams-intro"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.48 }}
    >
      <h1 className="gac-exams-intro__title">المسابقات</h1>
      <p className="gac-exams-intro__text">
        القائمة أدناه من الخادم: مسابقات منشورة ضمن نافذتها الزمنية فقط. يمكنكم البدء أو المتابعة أو عرض النتيجة
        حسب حالة المحاولة.
      </p>
    </motion.div>
  )
}
