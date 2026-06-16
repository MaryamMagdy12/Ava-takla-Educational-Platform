import { motion } from 'framer-motion'
import logoCrestWide from '../../assets/images/انبا تكلا اجنحة نورانية.png'
import logoSaintPortrait from '../../assets/images/انبا تكلا بجودة عالية جدا.png'
import '../../assets/css/PortalTopBrand.css'

export default function PortalTopBrand() {
  return (
    <motion.header
      className="portal-top-brand"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* <img
        className="portal-top-brand__crest"
        src={logoCrestWide}
        alt=""
        width={640}
        height={200}
        decoding="async"
        aria-hidden="true"
      /> */}
      <div className="portal-top-brand__halo" aria-hidden="true" />
      <div className="portal-top-brand__logo-wrap">
        <img
          className="portal-top-brand__logo"
          src={logoSaintPortrait}
          alt="الأنبا تكلا هيمانوت"
          width={88}
          height={88}
          decoding="async"
        />
      </div>
      <h1 className="portal-top-brand__title">كنيسة الأنبا تكلا هيمانوت</h1>
      <p className="portal-top-brand__subtitle">بوابة موحدة للطلاب، المسارات، والمحاضرات</p>
    </motion.header>
  )
}
