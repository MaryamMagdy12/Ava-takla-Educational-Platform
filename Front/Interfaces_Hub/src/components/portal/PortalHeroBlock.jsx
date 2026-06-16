import { motion } from 'framer-motion'
import '../../assets/css/PortalHeroBlock.css'

export default function PortalHeroBlock() {
  return (
    <motion.header
      className="portal-hero-block"
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="portal-hero-block__canvas" aria-hidden="true">
        <span className="portal-hero-block__blob portal-hero-block__blob--a" />
        <span className="portal-hero-block__blob portal-hero-block__blob--b" />
        <span className="portal-hero-block__blob portal-hero-block__blob--c" />
      </div>
      <div className="portal-hero-block__content">
        <motion.p
          className="portal-hero-block__eyebrow"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.45 }}
        >
          بوابة موحّدة
        </motion.p>
        <motion.h1
          className="portal-hero-block__title"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          كنيسة الانبا تكلا هيمانوت
        </motion.h1>
        <div className="portal-hero-block__divider" aria-hidden="true" />
        <motion.p
          className="portal-hero-block__lead"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.5 }}
        >
        ثلاث بوابات مستقلة بالتصميم نفسه تقريباً: مدرسة الشمامسة، الدورات متخصصة متعددة،  الاجتماع العام
          للعائلات. اختر الرابط المناسب أدناه.
        </motion.p>
      </div>
    </motion.header>
  )
}
