import { motion } from 'framer-motion'
import '../../assets/css/PortalLinkCard.css'

function CardIconDeacons() {
  return (
    <svg className="portal-link-card__icon-svg" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path
        d="M8 16h24l-2 4H10l-2-4z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M12 20v10M20 20v12M28 20v10"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M14 14c2-3 4.5-4.5 6-4.5s4 1.5 6 4.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

function CardIconSpecialized() {
  return (
    <svg className="portal-link-card__icon-svg" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path
        d="M8 12h10v20H8a2 2 0 01-2-2V14a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M18 12h14a2 2 0 012 2v16a2 2 0 01-2 2H18V12z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M12 18h4M12 22h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function CardIconGac() {
  return (
    <svg className="portal-link-card__icon-svg" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path
        d="M12 28l3-14h10l3 14M14 28h12"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 14h10l-1.2 6H16.2L15 14z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M20 8v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

const ICONS = {
  deacons: CardIconDeacons,
  specialized: CardIconSpecialized,
  gac: CardIconGac,
}

export default function PortalLinkCard({
  title,
  brief,
  href,
  accent,
  ctaLabel = 'فتح الواجهة',
  ctaVariant = 'gold',
  delay = 0,
}) {
  const Icon = ICONS[accent] ?? CardIconDeacons
  const anchorClass =
    ctaVariant === 'outline'
      ? 'portal-link-card__anchor portal-link-card__anchor--outline'
      : 'portal-link-card__anchor portal-link-card__anchor--gold'

  return (
    <div className={`portal-link-card__frame portal-link-card__frame--accent-${accent}`}>
      <motion.article
        className={`portal-link-card portal-link-card--accent-${accent}`}
        initial={{ opacity: 0, y: 36 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ y: -6, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } }}
      >
        <div className="portal-link-card__top">
          <span className="portal-link-card__icon-wrap">
            <Icon />
          </span>
          <h2 className="portal-link-card__title">{title}</h2>
        </div>
        <p className="portal-link-card__brief">{brief}</p>
        <a className={anchorClass} href={href} target="_blank" rel="noreferrer">
          <span className="portal-link-card__anchor-glow" aria-hidden="true" />
          <span className="portal-link-card__anchor-label">{ctaLabel}</span>
        </a>
      </motion.article>
    </div>
  )
}
