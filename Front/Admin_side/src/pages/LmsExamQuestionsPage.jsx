import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageShell from "../components/common/PageShell";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import Panel from "../components/common/Panel";
import DataTable from "../components/common/DataTable";
import * as adminApi from "../api/adminApi";
import { useAdminNav } from "../context/AdminNavContext";
import "../assets/css/ExamsPage.css";

const PAGE_KEY = "pg-exams";

function sortOptions(opts) {
  return [...(opts || [])].sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
}

export default function LmsExamQuestionsPage() {
  const nav = useAdminNav();
  const { examId } = useParams();
  const [exam, setExam] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!examId) return;
    let cancelled = false;
    adminApi
      .fetchExamApi(examId)
      .then((data) => {
        if (!cancelled) setExam(data);
      })
      .catch((e) => {
        if (!cancelled) setErr(e.message || "تعذر تحميل الامتحان.");
      });
    return () => {
      cancelled = true;
    };
  }, [examId]);

  const poolRows = useMemo(() => {
    const rows = exam?.exam_questions ?? exam?.examQuestions ?? [];
    if (!Array.isArray(rows)) return [];
    return [...rows].sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0));
  }, [exam]);

  const tableRows = useMemo(() => {
    return poolRows.map((eq) => {
      const q = eq.question;
      const qid = q?.id ?? eq.question_id;
      const text = q?.question_text ?? (qid ? `(سؤال #${qid})` : "—");
      const opts = sortOptions(q?.options);
      const isOptCorrect = (o) => Boolean(o?.is_correct) || o?.is_correct === 1;
      const optionsPreview = opts
        .map((o) => {
          const t = (o.option_text ?? "").trim();
          if (!t) return null;
          return isOptCorrect(o) ? `${t} ✓` : t;
        })
        .filter(Boolean)
        .join(" | ");
      const correctAnswer = opts.find((o) => isOptCorrect(o))?.option_text?.trim() || "—";
      return {
        _eqId: eq.id,
        _questionId: qid,
        question_text: text,
        difficulty: q?.difficulty ?? "—",
        options_preview: optionsPreview || "—",
        correct_answer: correctAnswer,
      };
    });
  }, [poolRows]);

  const columns = [
    { key: "question_text", title: "السؤال" },
    { key: "difficulty", title: "الصعوبة" },
    { key: "options_preview", title: "الاختيارات (✓ = الصحيح)" },
    { key: "correct_answer", title: "الإجابة الصحيحة" },
    {
      key: "actions",
      title: "الإجراءات",
      render: (row) =>
        row._questionId ? (
          <Link className={`${PAGE_KEY}-datatable-btn`} to={nav(`add-question/${row._questionId}`)}>
            تعديل
          </Link>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <PageShell
      pageKey={PAGE_KEY}
      title="أسئلة الامتحان"
      subtitle={exam?.title ? `الامتحان: ${exam.title}` : "عرض أسئلة مجمّعة لهذا الامتحان مع رابط التحرير في بنك الأسئلة."}
    >
      <PageToolbar pageKey={PAGE_KEY}>
        <ToolbarLink pageKey={PAGE_KEY} to={nav("exams")} variant="secondary">
          الرجوع لإدارة الامتحانات
        </ToolbarLink>
        {examId ? (
          <ToolbarLink pageKey={PAGE_KEY} to={nav(`exams/${examId}/edit`)} variant="primary">
            إعدادات الامتحان
          </ToolbarLink>
        ) : null}
      </PageToolbar>
      {err ? <p className="adm-error">{err}</p> : null}
      {!err && exam && tableRows.length === 0 ? (
        <p className="adm-muted" style={{ marginTop: 8 }}>
          لا توجد أسئلة في مجموعة هذا الامتحان بعد. انشر الامتحان أو حدّث إعدادات عدد الأسئلة لتوليد المجموعة.
        </p>
      ) : null}
      <Panel pageKey={PAGE_KEY}>
        <DataTable pageKey={PAGE_KEY} columns={columns} rows={tableRows} />
      </Panel>
    </PageShell>
  );
}
