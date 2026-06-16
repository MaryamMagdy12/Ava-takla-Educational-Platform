import { useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import HighlightedText from "../components/common/HighlightedText";
import PageShell from "../components/common/PageShell";
import Panel from "../components/common/Panel";
import DataTable from "../components/common/DataTable";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import { useAdminData } from "../context/AdminDataContext";
import useDebouncedValue from "../hooks/useDebouncedValue";
import * as adminApi from "../api/adminApi";
import { useAdminNav } from "../context/AdminNavContext";
import { sp } from "../navigation/adminPaths";
import "../assets/css/ExamsPage.css";
import { useDialog } from "../components/common/DialogProvider";
import { useToast } from "../components/common/ToastProvider";

const PAGE_KEY = "pg-exams";

function ExamsPage() {
  const nav = useAdminNav();
  const isSpecialLms = nav === sp;
  const { exams, refreshExams } = useAdminData();
  const { confirm, alertMessage } = useDialog();
  const { showToast } = useToast();
  const { globalSearch } = useOutletContext();
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState("");
  const debouncedGlobalSearch = useDebouncedValue(globalSearch);
  const highlightQueries = [debouncedGlobalSearch];

  const filteredExams = useMemo(() => {
    const query = debouncedGlobalSearch.trim().toLowerCase();
    if (!query) return exams;
    return exams.filter(
      (exam) =>
        exam.title.toLowerCase().includes(query) ||
        String(exam.course || "").toLowerCase().includes(query) ||
        String(exam.track || "").toLowerCase().includes(query) ||
        String(exam.status || "").toLowerCase().includes(query) ||
        String(exam.questions ?? "").includes(query) ||
        String(exam.duration ?? "").includes(query),
    );
  }, [debouncedGlobalSearch, exams]);

  const togglePublish = async (row) => {
    setErr("");
    setBusyId(row.id);
    try {
      if (row.status === "published") {
        await adminApi.unpublishExamApi(row.id);
                showToast({ type: "info", message: "تم إلغاء نشر الامتحان." });
      } else {
        await adminApi.publishExamApi(row.id);
                showToast({ type: "success", message: "تم نشر الامتحان." });
      }
      await refreshExams();
    } catch (e) {
      setErr(e.message || "فشل التحديث.");
    } finally {
      setBusyId(null);
    }
  };

  const toggleAnswersView = async (row) => {
    setErr("");
    setBusyId(`answers-${row.id}`);
    try {
      await adminApi.updateExamApi(row.id, {
        show_correct_answers_after_submit: !row.showCorrectAnswersAfterSubmit,
      });
      showToast({
        type: "success",
        message: !row.showCorrectAnswersAfterSubmit
          ? "تم تفعيل عرض الإجابات الصحيحة بعد التسليم."
          : "تم إخفاء الإجابات الصحيحة بعد التسليم.",
      });
      await refreshExams();
    } catch (e) {
      setErr(e.message || "فشل تحديث عرض الإجابات.");
    } finally {
      setBusyId(null);
    }
  };

  const titleCol = {
    key: "title",
    title: "العنوان",
    render: (row) => (
      <HighlightedText text={row.title} queries={highlightQueries} highlightClassName={`${PAGE_KEY}-highlight`} />
    ),
  };
  const courseCol = {
    key: "course",
    title: "المادة",
    render: (row) => (
      <HighlightedText text={row.course} queries={highlightQueries} highlightClassName={`${PAGE_KEY}-highlight`} />
    ),
  };
  const trackCol = {
    key: "track",
    title: "المسار",
    render: (row) => (
      <HighlightedText text={row.track} queries={highlightQueries} highlightClassName={`${PAGE_KEY}-highlight`} />
    ),
  };
  const columns = [
    titleCol,
    courseCol,
    ...(isSpecialLms ? [] : [trackCol]),
    { key: "questions", title: "عدد الأسئلة" },
    {
      key: "duration",
      title: "المدة",
      render: (row) => `${row.duration} دقيقة`,
    },
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
          {busyId === row.id ? "..." : row.published ? "إلغاء النشر" : "نشر"}
        </button>
      ),
    },
    {
      key: "answers_view",
      title: "عرض الإجابات",
      render: (row) => (
        <button
          type="button"
          className={`${PAGE_KEY}-datatable-btn`}
          disabled={busyId === `answers-${row.id}`}
          onClick={() => toggleAnswersView(row)}
        >
          {busyId === `answers-${row.id}`
            ? "..."
            : row.showCorrectAnswersAfterSubmit
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
          <Link className={`${PAGE_KEY}-datatable-btn`} to={nav(`exams/${row.id}/questions`)}>
            الأسئلة
          </Link>
          <Link className={`${PAGE_KEY}-datatable-btn`} to={nav(`exams/${row.id}/edit`)}>
            تعديل
          </Link>
          <button
            type="button"
            className={`${PAGE_KEY}-datatable-btn adm-delete`}
            onClick={async () => {
              const ok = await confirm({
                title: "حذف الامتحان",
                message: `هل تريد حذف الامتحان "${row.title}"؟ قد تُحذف المحاولات المرتبطة به حسب قواعد قاعدة البيانات.`,
              });
              if (!ok) return;
              try {
                await adminApi.deleteExamApi(row.id);
                await refreshExams();
                showToast({ type: "success", message: "تم حذف الامتحان." });
              } catch (e) {
                await alertMessage({ title: "تعذر الحذف", message: e.message });
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
    <PageShell
      pageKey={PAGE_KEY}
      title="إدارة الامتحانات"
      subtitle="أنشئ الامتحانات من صفحة الإنشاء، والنشر أو إلغاء النشر يتم عبر الواجهة البرمجية."
    >
      <PageToolbar pageKey={PAGE_KEY}>
        <ToolbarLink pageKey={PAGE_KEY} to={nav("exams/new")} variant="primary">
          + إضافة امتحان
        </ToolbarLink>
      </PageToolbar>

      {err ? <p className="adm-error">{err}</p> : null}

      <Panel pageKey={PAGE_KEY}>
        <DataTable pageKey={PAGE_KEY} columns={columns} rows={filteredExams} />
      </Panel>
    </PageShell>
  );
}

export default ExamsPage;
