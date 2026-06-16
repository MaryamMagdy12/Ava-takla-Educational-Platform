import { motion } from 'framer-motion'
import '../../assets/css/GacHomeHero.css'

export default function GacHomeHero() {
  return (
    <motion.section
      className="gac-home-hero"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <p className="gac-home-hero__eyebrow">الاجتماع العامة — بوابة العائلات</p>
      <h1 className="gac-home-hero__title">اطّلعوا على المسارات التعليمية والاختبارات المتاحة لعائلاتكم</h1>
      <p className="gac-home-hero__lead">
        تصفحوا الدورات الموجهة للعائلات ثم انتقلوا لقائمة الاختبارات المرتبطة بكل مسار. هذه الواجهة للعرض فقط
        ويمكن ربطها لاحقاً بالخادم.
      </p>
    </motion.section>
  )
}
