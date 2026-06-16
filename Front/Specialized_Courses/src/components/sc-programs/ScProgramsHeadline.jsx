import { motion } from 'framer-motion'
import '../../assets/css/ScProgramsHeadline.css'

export default function ScProgramsHeadline() {
  return (
    <motion.div
      className="sc-programs-headline"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45 }}
    >
      <h1 className="sc-programs-headline__h">دورات متخصصة</h1>
      <p className="sc-programs-headline__p">
        اختر دورة للاطلاع على وصفها ومحتواها: كتب، محاضرات، وامتحانات. الضغط على البطاقة يفتح صفحة تفاصيل الدورة.
      </p>
    </motion.div>
  )
}
