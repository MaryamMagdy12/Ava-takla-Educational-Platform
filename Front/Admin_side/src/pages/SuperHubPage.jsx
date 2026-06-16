import { Link } from "react-router-dom";
import { BookOpen, GraduationCap, Wine } from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext";
import { GA_BASE, SPECIAL_BASE, STUDENT_BASE } from "../navigation/adminPaths";
import hubLogo from "../assets/images/انبا تكلا بجودة عالية جدا.png";
import "../assets/css/SuperHubPage.css";

const CARDS = [
  {
    key: "student",
    title: "مدرسة الشمامسة",
    description:
      "الطلاب، المسارات، الامتحانات، بنك الأسئلة، الكتب والمحاضرات، والاستبيانات.",
    to: STUDENT_BASE,
    icon: GraduationCap,
    cta: "الدخول للمدرسة",
    featured: true,
  },
  {
    key: "general_assembly",
    title: "مسابقات الاجتماع العام",
    description:
      "المسابقات والعائلات، إنشاء المسابقات والأسئلة، واعتماد النتائج من لوحة اجتماع العام.",
    to: GA_BASE,
    icon: Wine,
    cta: "فتح الواجهة",
  },

  {
    key: "special",
    title: "دورات متخصصة",
    description: "لوحة إدارة الدورات والمحتوى للمتعلّمين الخاصّين.",
    to: SPECIAL_BASE,
    icon: BookOpen,
    cta: "تصفح الدورات",
  },
];

export default function SuperHubPage() {
  const { session, logout, isSuper } = useAdminAuth();
  const allowed = new Set(session?.allowed_interfaces ?? []);

  const visible = isSuper ? CARDS : CARDS.filter((c) => allowed.has(c.key));
  const adminName = session?.user?.name?.trim() || "مسؤول";

  return (
    <div className="adm-super-hub">
      <div className="adm-super-hub__ambient" aria-hidden="true">
        <span className="adm-super-hub__wing adm-super-hub__wing--start" />
        <span className="adm-super-hub__wing adm-super-hub__wing--end" />
        <span className="adm-super-hub__stars" />
      </div>

      <div className="adm-super-hub__shell">
        <header className="adm-super-hub__hero">
          <div className="adm-super-hub__logo-ring" aria-hidden="true" />
          <img
            className="adm-super-hub__logo"
            src={hubLogo}
            alt=""
            width={96}
            height={96}
            decoding="async"
          />
          <h1 className="adm-super-hub__title">مركز واجهات الإدارة</h1>
          <p className="adm-super-hub__tagline">
            بوابة موحدة للطلاب، المسارات، والمحاضرات
          </p>

          <h2 className="adm-super-hub__welcome-headline" title={`مرحبًا، ${adminName}`}>
            <span className="adm-super-hub__welcome-lead">مرحبًا،</span>
            <span className="adm-super-hub__welcome-name">{adminName}</span>
          </h2>

          <div className="adm-super-hub__toolbar">
            <button type="button" className="adm-super-hub__pill adm-super-hub__pill--logout" onClick={logout}>
              تسجيل الخروج
            </button>
          </div>
        </header>

        <p className="adm-super-hub__lead">
          {isSuper
            ? "كمسؤول أعلى يمكنك فتح أي واجهة والتحكم بكل أدواتها من القائمة الجانبية."
            : "الواجهات المتاحة لحسابك — اختر البطاقة للانتقال."}
        </p>

        <div className="adm-super-hub__grid">
          {visible.map((card) => (
            <Link
              key={card.key}
              className={
                card.featured
                  ? "adm-super-hub__card adm-super-hub__card--featured"
                  : "adm-super-hub__card"
              }
              to={card.to}
            >
              {card.featured ? <span className="adm-super-hub__card-flare" aria-hidden /> : null}
              <span className="adm-super-hub__card-icon" aria-hidden>
                <card.icon size={26} strokeWidth={1.75} />
              </span>
              <h2 className="adm-super-hub__card-title">{card.title}</h2>
              <p className="adm-super-hub__card-desc">{card.description}</p>
              <span className="adm-super-hub__card-cta">{card.cta}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
