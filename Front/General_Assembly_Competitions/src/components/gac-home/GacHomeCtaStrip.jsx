import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import '../../assets/css/GacHomeCtaStrip.css'

export default function GacHomeCtaStrip() {
  return (
    <motion.div
      className="gac-home-cta-strip"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: 0.08 }}
    >
      <Link className="gac-home-cta-strip__link gac-home-cta-strip__link--primary" to="/courses">
        عرض الدورات
      </Link>
      <Link className="gac-home-cta-strip__link gac-home-cta-strip__link--ghost" to="/competitions">
        عرض المسابقات
      </Link>
    </motion.div>
  )
}
