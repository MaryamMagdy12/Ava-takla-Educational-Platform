import { useEffect, useState } from "react";
import PageShell from "../components/common/PageShell";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import StatCard from "../components/common/StatCard";
import { FileQuestion, Layers, Library, Users } from "lucide-react";
import * as adminApi from "../api/adminApi";
import { sp } from "../navigation/adminPaths";
import "../assets/css/InterfaceDashboardExtras.css";

const PAGE_KEY = "pg-special-dashboard";

export default function SpecialDashboardPage() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    adminApi.fetchSpecialDashboard().then(setData).catch((e) => setErr(e.message));
  }, []);

  return (
    <PageShell pageKey={PAGE_KEY} title={null} subtitle={null}>
      {err ? <p className={`${PAGE_KEY}-error`}>{err}</p> : null}

      <section className={`${PAGE_KEY}-hero`}>
        <h1 className={`${PAGE_KEY}-hero-welcome`}>لوحة الدورات المتخصصة</h1>
        <p className={`${PAGE_KEY}-hero-lead`}>
          إدارة المتعلّمين ومحتوى الدورات (مواد، مكتبة، امتحانات، استبيانات) عبر واجهة برمجة{" "}
          <code dir="ltr">/admin/special-lms</code>.
        </p>
      </section>

      <PageToolbar pageKey={PAGE_KEY}>
        <ToolbarLink pageKey={PAGE_KEY} to={sp("learners")}>
          حسابات المتعلّمين
        </ToolbarLink>
        <ToolbarLink pageKey={PAGE_KEY} to={sp("courses")}>
          المواد
        </ToolbarLink>
        <ToolbarLink pageKey={PAGE_KEY} to={sp("library")}>
          الكتب والمحاضرات
        </ToolbarLink>
        <ToolbarLink pageKey={PAGE_KEY} to={sp("questionnaires")}>
          الاستبيانات
        </ToolbarLink>
      </PageToolbar>

      <div className={`${PAGE_KEY}-stats-grid`}>
        <StatCard pageKey={PAGE_KEY} icon={Users} title="المتعلّمون" value={data?.total_learners ?? "—"} />
        <StatCard pageKey={PAGE_KEY} icon={Layers} title="الدورات" value={data?.total_courses ?? "—"} />
        <StatCard pageKey={PAGE_KEY} icon={Library} title="المكتبة" value="—" />
        <StatCard pageKey={PAGE_KEY} icon={FileQuestion} title="الاستبيانات" value="—" />
      </div>

      <article className={`${PAGE_KEY}-card`}>
        <header className={`${PAGE_KEY}-card-head`}>
          <h2 className={`${PAGE_KEY}-block-title`}>نظرة عامة</h2>
        </header>
        <p>{data?.message ?? "—"}</p>
        <p className={`${PAGE_KEY}-meta`}>
          استخدم شريط الأدوات أعلاه للانتقال السريع إلى الحسابات، المواد، المكتبة، والاستبيانات.
        </p>
      </article>
    </PageShell>
  );
}
