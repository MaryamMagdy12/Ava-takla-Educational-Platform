import { useEffect, useState } from "react";
import PageShell from "../components/common/PageShell";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import StatCard from "../components/common/StatCard";
import { ClipboardList, Send, Trophy, Users } from "lucide-react";
import * as adminApi from "../api/adminApi";
import { ga } from "../navigation/adminPaths";
import "../assets/css/InterfaceDashboardExtras.css";

const PAGE_KEY = "pg-ga-dashboard";

export default function GaDashboardPage() {
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    adminApi.fetchGaDashboard().then(setStats).catch((e) => setErr(e.message));
  }, []);

  return (
    <PageShell pageKey={PAGE_KEY} title={null} subtitle={null}>
      {err ? <p className={`${PAGE_KEY}-error`}>{err}</p> : null}

      <section className={`${PAGE_KEY}-hero`}>
        <h1 className={`${PAGE_KEY}-hero-welcome`}>لوحة اجتماع العام</h1>
        <p className={`${PAGE_KEY}-hero-lead`}>إحصائيات العائلات والمسابقات، مع روابط سريعة للكتب والمحاضرات والاستبيانات.</p>
      </section>

      <PageToolbar pageKey={PAGE_KEY}>
        <ToolbarLink pageKey={PAGE_KEY} to={ga("library")}>
          الكتب والمحاضرات
        </ToolbarLink>
        <ToolbarLink pageKey={PAGE_KEY} to={ga("questionnaires")}>
          الاستبيانات
        </ToolbarLink>
      </PageToolbar>

      <div className={`${PAGE_KEY}-stats-grid`}>
        <StatCard pageKey={PAGE_KEY} icon={Users} title="إجمالي العائلات" value={stats?.total_families ?? "—"} />
        <StatCard pageKey={PAGE_KEY} icon={Trophy} title="إجمالي المسابقات" value={stats?.total_competitions ?? "—"} />
        <StatCard pageKey={PAGE_KEY} icon={Send} title="مسابقات منشورة" value={stats?.published_competitions ?? "—"} />
        <StatCard
          pageKey={PAGE_KEY}
          icon={ClipboardList}
          title="محاولات المسابقة"
          value={stats?.total_competition_attempts ?? "—"}
        />
      </div>

      <article className={`${PAGE_KEY}-card`}>
        <header className={`${PAGE_KEY}-card-head`}>
          <h2 className={`${PAGE_KEY}-block-title`}>تلميح</h2>
        </header>
        <p>
          أنشئ العائلات من «عائلات المسابقة»، ثم أضف المسابقة وأسئلتها من «المسابقات». أضف محاضرات الجمعية من «الكتب والمحاضرات» كما
          في واجهة الطلاب (+ إضافة محاضرة). يمكنك أيضًا إدارة «الاستبيانات» من القائمة.
        </p>
      </article>
    </PageShell>
  );
}
