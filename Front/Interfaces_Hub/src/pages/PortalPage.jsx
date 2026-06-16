import { PORTAL_URLS } from '../config/portalUrls.js'
import PortalTopBrand from '../components/portal/PortalTopBrand.jsx'
import PortalScrollHint from '../components/portal/PortalScrollHint.jsx'
import PortalLinkCard from '../components/portal/PortalLinkCard.jsx'
import portalWingsHero from '../assets/images/portal-wings-bg-halo.png'
// import PortalBottomStrip from '../components/portal/PortalBottomStrip.jsx'
import '../assets/css/PortalPage.css'

const cards = [
  {
    key: 'deacons',
    title: 'مدرسة الشمامسة',
    brief:
      'بوابة الطلاب: تسجيل الدخول، الامتحانات، المحاضرات، والكتب مع نفس ألوان مدرسة الشمامسة. هذه هي الواجهة الرئيسية للطلاب المسجلين.',
    href: PORTAL_URLS.deaconsSchoolStudents,
    accent: 'deacons',
    ctaLabel: 'دخول المدرسة',
    ctaVariant: 'gold',
  },
  {
    key: 'gac',
    title: 'مسابقات الاجتماع العام',
    brief:
      'يتطلب تسجيل دخول عائلة الجمعية العامة (رقم العائلة وكلمة المرور). دورات العرض ومسابقات مباشرة من الخادم.',
    href: PORTAL_URLS.generalAssemblyCompetitions,
    accent: 'gac',
    ctaLabel: 'عرض المنافسات',
    ctaVariant: 'outline',
  },
  {
    key: 'specialized',
    title: 'دورات متخصصة',
    brief:
      'يتطلب تسجيل دخول الطالب (الرقم السري الثماني وكلمة المرور). عرض دورات متخصصة وامتحاناتها بعد الدخول.',
    href: PORTAL_URLS.specializedCourses,
    accent: 'specialized',
    ctaLabel: 'تصفح الكورسات',
    ctaVariant: 'outline',
  },
]

export default function PortalPage() {
  return (
    <div id="portal-page-root" className="portal-page">
      <div className="portal-page__backdrop" aria-hidden="true">
        <img
          className="portal-page__backdrop-img"
          src={portalWingsHero}
          alt=""
          width={1920}
          height={1080}
          decoding="async"
          fetchPriority="high"
        />
        <div className="portal-page__backdrop-scrim" />
        <div className="portal-page__backdrop-vignette" />
      </div>
      <div className="portal-page__shell">
        <PortalTopBrand />
        <PortalScrollHint />
        <div className="portal-page__grid">
          {cards.map((c, i) => (
            <PortalLinkCard
              key={c.key}
              title={c.title}
              brief={c.brief}
              href={c.href}
              accent={c.accent}
              ctaLabel={c.ctaLabel}
              ctaVariant={c.ctaVariant}
              delay={i * 0.1}
            />
          ))}
        </div>
        {/* <PortalBottomStrip /> */}
      </div>
    </div>
  )
}
