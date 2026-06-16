import { motion } from 'framer-motion'
import '../../assets/css/PortalBottomStrip.css'

export default function PortalBottomStrip() {
  return (
    <motion.footer
      className="portal-bottom-strip"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45 }}
    >
      <p className="portal-bottom-strip__line">
        لتغيير الروابط انسخ <code className="portal-bottom-strip__code">.env.example</code> إلى{' '}
        <code className="portal-bottom-strip__code">.env</code> داخل مجلد Interfaces_Hub.
      </p>
    </motion.footer>
  )
}
