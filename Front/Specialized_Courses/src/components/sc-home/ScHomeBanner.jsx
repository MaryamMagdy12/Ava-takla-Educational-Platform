import { motion } from 'framer-motion'
import '../../assets/css/ScHomeBanner.css'

export default function ScHomeBanner() {
  return (
    <motion.div
      className="sc-home-banner"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="sc-home-banner__kicker">الدورات المتخصصة</span>
      <h1 className="sc-home-banner__title">عدة دورات — ولكل دورة امتحاناتها</h1>
      <p className="sc-home-banner__sub">
        تصفّح الدورات المتاحة ثم افتح تفاصيل أي دورة لرؤية الكتب والمحاضرات والامتحانات المرتبطة بها (من بيانات
        المنصة عند الاتصال بالخادم).
      </p>
    </motion.div>
  )
}
