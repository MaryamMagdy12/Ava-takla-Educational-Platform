import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const MotionArticle = motion.article

export default function FeatureCard({
  title,
  text,
  to,
  index = 0,
  rootClassName,
  titleClassName,
  textClassName,
  linkClassName,
}) {
  return (
    <MotionArticle
      className={rootClassName}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
    >
      <h3 className={titleClassName}>{title}</h3>
      <p className={textClassName}>{text}</p>
      <Link to={to} className={linkClassName}>
        افتح
      </Link>
    </MotionArticle>
  )
}
