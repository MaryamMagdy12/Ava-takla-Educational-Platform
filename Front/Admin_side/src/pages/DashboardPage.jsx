import { useEffect, useState } from "react";
import PageShell from "../components/common/PageShell";
import StatCard from "../components/common/StatCard";
import { Link } from "react-router-dom";
import {
  Bell,
  BookOpen,
  ChevronLeft,
  CirclePlus,
  FileQuestion,
  GraduationCap,
  SquarePen,
  Users,
} from "lucide-react";
import * as adminApi from "../api/adminApi";
import { useAdminNav } from "../context/AdminNavContext";
import "../assets/css/DashboardPage.css";

const PAGE_KEY = "pg-dashboard";

function formatActivityRelativeTime(iso) {
  if (!iso) return "";
  try {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return "";
    const diffMin = Math.round((then - Date.now()) / 60000);
    const rtf = new Intl.RelativeTimeFormat("ar", { numeric: "auto" });
    const absMin = Math.abs(diffMin);
    if (absMin < 60) return rtf.format(diffMin, "minute");
    const diffHours = Math.round(diffMin / 60);
    if (Math.abs(diffHours) < 48) return rtf.format(diffHours, "hour");
    const diffDays = Math.round(diffHours / 24);
    if (Math.abs(diffDays) < 14) return rtf.format(diffDays, "day");
    const diffWeeks = Math.round(diffDays / 7);
    if (Math.abs(diffWeeks) < 8) return rtf.format(diffWeeks, "week");
    const diffMonths = Math.round(diffDays / 30);
    return rtf.format(diffMonths, "month");
  } catch {
    return "";
  }
}

function formatUpcomingExamWhen(isoFrom) {
  if (!isoFrom) return "—";
  try {
    const d = new Date(isoFrom);
    if (Number.isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("ar-EG", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "—";
  }
}

function upcomingExamBadge(isoFrom, isoTo) {
  const now = Date.now();
  const from = isoFrom ? new Date(isoFrom).getTime() : null;
  const to = isoTo ? new Date(isoTo).getTime() : null;
  if (from != null && !Number.isNaN(from) && from > now) return "قريباً";
  if (to != null && !Number.isNaN(to) && to >= now) return "مفتوح";
  return "";
}

function DashboardPage() {
  const nav = useAdminNav();
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    adminApi
      .fetchDashboardStats()
      .then(setStats)
      .catch((e) => setErr(e.message));
  }, []);

  const quickActions = [
    { id: "student", label: "إضافة طالب", icon: CirclePlus, to: nav("students/new") },
    { id: "exam", label: "إضافة امتحان", icon: SquarePen, to: nav("exams/new") },
    { id: "question", label: "إضافة سؤال", icon: FileQuestion, to: nav("add-question") },
    { id: "lecture", label: "رفع محاضرة", icon: BookOpen, to: nav("library/lectures/new") },
  ];

  return (
    <PageShell pageKey={PAGE_KEY} title={null} subtitle={null}>
      {err ? <p className={`${PAGE_KEY}-error`}>{err}</p> : null}

      <section className={`${PAGE_KEY}-hero`}>
        <h1 className={`${PAGE_KEY}-hero-welcome`}>مرحبًا بك في إدارة مدرسة الأنبا تكلا</h1>
        <p className={`${PAGE_KEY}-hero-lead`}>
          لوحة التحكم الرئيسية لمتابعة الطلاب والمواد والامتحانات والمحتوى التعليمي.
        </p>
      </section>

      <div className={`${PAGE_KEY}-stats-grid`}>
        <StatCard pageKey={PAGE_KEY} icon={Bell} title="التنبيهات" value={stats?.total_attempts ?? "—"} />
        <StatCard pageKey={PAGE_KEY} icon={BookOpen} title="المحاضرات" value={stats?.total_lectures ?? "—"} />
        <StatCard pageKey={PAGE_KEY} icon={GraduationCap} title="إجمالي الامتحانات" value={stats?.total_exams ?? "—"} />
        <StatCard pageKey={PAGE_KEY} icon={Users} title="إجمالي الطلاب" value={stats?.total_students ?? "—"} />
      </div>

      <section className={`${PAGE_KEY}-quick-section`}>
        <h2 className={`${PAGE_KEY}-block-title`}>إجراءات سريعة</h2>
        <div className={`${PAGE_KEY}-quick-grid`}>
          {quickActions.map((action) => (
            <Link key={action.id} className={`${PAGE_KEY}-quick-card`} to={action.to}>
              <span className={`${PAGE_KEY}-quick-icon`}>
                <action.icon size={26} strokeWidth={1.6} />
              </span>
              <span className={`${PAGE_KEY}-quick-label`}>{action.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className={`${PAGE_KEY}-dual-grid`}>
        <article className={`${PAGE_KEY}-card`}>
          <header className={`${PAGE_KEY}-card-head`}>
            <h2 className={`${PAGE_KEY}-block-title`}>أحدث الأنشطة</h2>
            <Link to={nav("students")} className={`${PAGE_KEY}-text-link`}>
              الطلاب
            </Link>
          </header>
          <ul className={`${PAGE_KEY}-feed`}>
            {!stats ? (
              <li className={`${PAGE_KEY}-feed-item`}>
                <span className={`${PAGE_KEY}-feed-bullet`} aria-hidden />
                <div className={`${PAGE_KEY}-feed-body`}>
                  <p className={`${PAGE_KEY}-feed-text`}>جاري التحميل…</p>
                </div>
              </li>
            ) : (stats.recent_activity ?? []).length === 0 ? (
              <li className={`${PAGE_KEY}-feed-item`}>
                <span className={`${PAGE_KEY}-feed-bullet`} aria-hidden />
                <div className={`${PAGE_KEY}-feed-body`}>
                  <p className={`${PAGE_KEY}-feed-text`}>
                    لا توجد أنشطة مسجّلة مؤخرًا (تُسجّل تلقائيًا عند إنشاء طلاب، امتحانات، استبيانات، وغيرها).
                  </p>
                </div>
              </li>
            ) : (
              (stats.recent_activity ?? []).map((row) => (
                <li key={row.id} className={`${PAGE_KEY}-feed-item`}>
                  <span className={`${PAGE_KEY}-feed-bullet`} aria-hidden />
                  <div className={`${PAGE_KEY}-feed-body`}>
                    <p className={`${PAGE_KEY}-feed-text`}>{row.text}</p>
                    <time className={`${PAGE_KEY}-feed-time`} dateTime={row.created_at || undefined}>
                      {formatActivityRelativeTime(row.created_at)}
                    </time>
                  </div>
                </li>
              ))
            )}
          </ul>
        </article>

        <article className={`${PAGE_KEY}-card`}>
          <header className={`${PAGE_KEY}-card-head ${PAGE_KEY}-card-head--stack`}>
            <div>
              <h2 className={`${PAGE_KEY}-block-title`}>الامتحانات القادمة</h2>
              <Link to={nav("exams")} className={`${PAGE_KEY}-card-kicker`}>
                إدارة الامتحانات
              </Link>
            </div>
          </header>
          <div className={`${PAGE_KEY}-exam-stack`}>
            {!stats ? (
              <p className={`${PAGE_KEY}-feed-text`}>جاري التحميل…</p>
            ) : (stats.upcoming_exams ?? []).length === 0 ? (
              <p className={`${PAGE_KEY}-feed-text`}>لا توجد امتحانات منشورة ضمن نافذة زمنية حالية أو قادمة.</p>
            ) : (
              (stats.upcoming_exams ?? []).map((exam) => {
                const badge = upcomingExamBadge(exam.available_from, exam.available_to);
                const registered = Number(exam.registered) || 0;
                const registeredLabel =
                  registered === 0 ? "لا يوجد طلاب مسجّلون بعد" : `المسجلين: ${registered} طالب`;
                return (
                  <div key={exam.id} className={`${PAGE_KEY}-exam-card`}>
                    {badge ? <span className={`${PAGE_KEY}-exam-badge`}>{badge}</span> : null}
                    <h3 className={`${PAGE_KEY}-exam-title`}>{exam.title}</h3>
                    <p className={`${PAGE_KEY}-exam-stage`}>{exam.stage}</p>
                    <div className={`${PAGE_KEY}-exam-meta`}>
                      <span className={`${PAGE_KEY}-exam-count`}>{registeredLabel}</span>
                      <time className={`${PAGE_KEY}-exam-when`} dateTime={exam.available_from || undefined}>
                        {formatUpcomingExamWhen(exam.available_from)}
                      </time>
                    </div>
                    <Link to={nav(`exams/${exam.id}/edit`)} className={`${PAGE_KEY}-details-link`}>
                      التفاصيل
                      <ChevronLeft size={16} aria-hidden />
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        </article>
      </div>
    </PageShell>
  );
}

export default DashboardPage;
