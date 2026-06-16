import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "../components/common/PageShell";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import Panel from "../components/common/Panel";
import DataTable from "../components/common/DataTable";
import { useDialog } from "../components/common/DialogProvider";
import { useToast } from "../components/common/ToastProvider";
import * as adminApi from "../api/adminApi";
import { ga } from "../navigation/adminPaths";
import "../assets/css/ExamsPage.css";

const PAGE_KEY = "pg-exams";

function dateOnly(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString("ar-EG");
}

function renderScopeText(row) {
  const scopes = Array.isArray(row.chapter_scopes) ? row.chapter_scopes : [];
  if (scopes.length === 0) return "كل الأصحاحات";
  return scopes
    .map((scope) => `${scope.testament_type === "old" ? "قديم" : "جديد"}:${scope.chapter_number}`)
    .join("، ");
}

export default function GaFamilyExamsPage() {
  const { confirm, alertMessage } = useDialog();
  const { showToast } = useToast();
  const [rows, setRows] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState("");

  async function loadRows() {
    const data = await adminApi.fetchGaFamilyExamsAdmin();
    setRows(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    loadRows().catch((e) => setErr(e.message || "تعذر تحميل الامتحانات."));
  }, []);

  async function togglePublish(row) {
    setBusyId(row.id);
    setErr("");
    try {
      await adminApi.updateGaFamilyExamApi(row.id, {
        status: row.status === "published" ? "draft" : "published",
      });
      await loadRows();
      showToast({
        type: "success",
        message: row.status === "published" ? "تم إلغاء نشر الامتحان." : "تم نشر الامتحان.",
      });
    } catch (e) {
      setErr(e.message || "تعذر تحديث حالة الامتحان.");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleAnswers(row) {
    setBusyId(`answers-${row.id}`);
    setErr("");
    try {
      await adminApi.updateGaFamilyExamApi(row.id, {
        show_result_immediately: !Boolean(row.show_result_immediately),
      });
      await loadRows();
      showToast({
        type: "success",
        message: !Boolean(row.show_result_immediately)
          ? "تم تفعيل عرض الإجابات بعد التسليم."
          : "تم إخفاء عرض الإجابات بعد التسليم.",
      });
    } catch (e) {
      setErr(e.message || "تعذر تحديث إعداد عرض الإجابات.");
    } finally {
      setBusyId(null);
    }
  }

  const columns = [
    { key: "title", title: "العنوان" },
    { key: "chapter_scope", title: "نطاق الأصحاحات", render: (row) => renderScopeText(row) },
    { key: "duration_minutes", title: "المدة", render: (row) => `${row.duration_minutes ?? 0} دقيقة` },
    { key: "question_count", title: "عدد الأسئلة", render: (row) => row.question_count ?? row.questions_count ?? 0 },
    { key: "available_from", title: "البداية", render: (row) => dateOnly(row.available_from) },
    { key: "available_to", title: "النهاية", render: (row) => dateOnly(row.available_to) },
    { key: "status", title: "الحالة" },
    {
      key: "published",
      title: "النشر",
      render: (row) => (
        <button
          type="button"
          className={`${PAGE_KEY}-datatable-btn`}
          disabled={busyId === row.id}
          onClick={() => togglePublish(row)}
        >
          {busyId === row.id ? "..." : row.status === "published" ? "إلغاء النشر" : "نشر"}
        </button>
      ),
    },
    {
      key: "answers",
      title: "عرض الإجابات",
      render: (row) => (
        <button
          type="button"
          className={`${PAGE_KEY}-datatable-btn`}
          disabled={busyId === `answers-${row.id}`}
          onClick={() => toggleAnswers(row)}
        >
          {busyId === `answers-${row.id}`
            ? "..."
            : Boolean(row.show_result_immediately)
              ? "إخفاء الإجابات"
              : "تفعيل العرض"}
        </button>
      ),
    },
    {
      key: "actions",
      title: "الإجراءات",
      render: (row) => (
        <div className={`${PAGE_KEY}-actions-inline`}>
          <Link className={`${PAGE_KEY}-datatable-btn`} to={ga(`family-exams/${row.id}/questions`)}>
            الأسئلة
          </Link>
          <Link className={`${PAGE_KEY}-datatable-btn`} to={ga(`family-exams/${row.id}/edit`)}>
            تعديل
          </Link>
          <button
            type="button"
            className={`${PAGE_KEY}-datatable-btn adm-delete`}
            onClick={async () => {
              const ok = await confirm({
                title: "حذف امتحان العائلات",
                message: `هل تريد حذف الامتحان "${row.title}"؟ قد تُحذف المحاولات المرتبطة به.`,
              });
              if (!ok) return;
              try {
                await adminApi.deleteGaFamilyExamApi(row.id);
                await loadRows();
                showToast({ type: "success", message: "تم حذف الامتحان." });
              } catch (e) {
                await alertMessage({ title: "تعذر الحذف", message: e.message || "حدث خطأ غير متوقع." });
              }
            }}
          >
            حذف
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageShell pageKey={PAGE_KEY} title="إدارة امتحانات العائلات" subtitle="نفس تدفق إدارة امتحانات الطلاب مع تخصيص العائلات.">
      <PageToolbar pageKey={PAGE_KEY}>
        <ToolbarLink pageKey={PAGE_KEY} to={ga("family-exams/new")} variant="primary">
          + إضافة امتحان
        </ToolbarLink>
      </PageToolbar>
      {err ? <p className="adm-error">{err}</p> : null}
      <Panel pageKey={PAGE_KEY}>
        <DataTable pageKey={PAGE_KEY} columns={columns} rows={rows} />
      </Panel>
    </PageShell>
  );
}
