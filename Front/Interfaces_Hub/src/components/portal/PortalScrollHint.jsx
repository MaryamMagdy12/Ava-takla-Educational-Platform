import { motion } from 'framer-motion'
import '../../assets/css/PortalScrollHint.css'

export default function PortalScrollHint() {
  return (
    <motion.p
      className="portal-scroll-hint"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      اختر البوابة المناسبة — كل واجهة تعمل على منفذ تطوير مستقل.
    </motion.p>
  )
}
