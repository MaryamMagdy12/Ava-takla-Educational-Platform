import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import PageShell from "../components/common/PageShell";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import * as adminApi from "../api/adminApi";
import { useAdminNav } from "../context/AdminNavContext";
import { useQuestionnaireScope } from "../hooks/useQuestionnaireScope";

const PAGE_KEY = "pg-questionnaire-details";

export default function QuestionnaireDetailsPage() {
  const { id } = useParams();
  const nav = useAdminNav();
  const scope = useQuestionnaireScope();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("responses");
  const [payload, setPayload] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const perPage = 50;

  useEffect(() => {
    setPage(1);
  }, [scope, id]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    adminApi
      .fetchQuestionnaireDetailsAdmin(scope, id, { page, perPage })
      .then((data) => {
        if (!mounted) return;
        setPayload(data);
        setPagination(data?.responses_pagination ?? null);
        setErr("");
      })
      .catch((e) => {
        if (!mounted) return;
        setErr(e.message || "تعذر تحميل التفاصيل");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [scope, id, page]);

  const questions = useMemo(() => payload?.questionnaire?.questions ?? [], [payload]);
  const responses = useMemo(() => payload?.responses ?? [], [payload]);
  const matrix = useMemo(() => payload?.matrix ?? [], [payload]);
  const headCellStyle = {
    padding: "10px 12px",
    textAlign: "center",
    whiteSpace: "nowrap",
    borderBottom: "2px solid #d8e0c4",
  };
  const bodyCellStyle = {
    padding: "10px 12px",
    textAlign: "center",
    whiteSpace: "nowrap",
    borderBottom: "1px solid #e8ecd9",
    verticalAlign: "middle",
  };

  return (
    <PageShell
      pageKey={PAGE_KEY}
      title={payload?.questionnaire?.title ? `تفاصيل: ${payload.questionnaire.title}` : "تفاصيل الاستبيان"}
      subtitle="متابعة المشاركين وإجاباتهم حسب الواجهة الحالية."
    >
      <PageToolbar pageKey={PAGE_KEY}>
        <ToolbarLink pageKey={PAGE_KEY} to={nav("questionnaires")}>
          كل الاستبيانات
        </ToolbarLink>
        <ToolbarLink pageKey={PAGE_KEY} to={nav(`questionnaires/${id}/edit`)}>
          تعديل
        </ToolbarLink>
      </PageToolbar>

      <div className="adm-form-actions" style={{ marginBottom: 12 }}>
        <button type="button" className={`adm-btn ${tab === "responses" ? "adm-btn-primary" : "adm-btn-secondary"}`} onClick={() => setTab("responses")}>
          المشاركون
        </button>
        <button type="button" className={`adm-btn ${tab === "matrix" ? "adm-btn-primary" : "adm-btn-secondary"}`} onClick={() => setTab("matrix")}>
          جدول الإجابات
        </button>
      </div>

      {pagination && pagination.last_page > 1 ? (
        <div className="adm-form-actions" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className="adm-btn adm-btn-secondary"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            السابق
          </button>
          <span className="adm-muted" style={{ alignSelf: "center" }}>
            صفحة {pagination.current_page} من {pagination.last_page} ({pagination.total} مشارك)
          </span>
          <button
            type="button"
            className="adm-btn adm-btn-secondary"
            disabled={page >= pagination.last_page || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            التالي
          </button>
        </div>
      ) : null}

      {err ? <p className="adm-error">{err}</p> : null}
      {loading ? <p className="adm-muted">جاري التحميل…</p> : null}

      {!loading && tab === "responses" ? (
        responses.length === 0 ? (
          <p className="adm-muted">لا توجد استجابات حتى الآن.</p>
        ) : (
          <div className="adm-card" style={{ overflowX: "auto" }}>
            <table className="adm-table" style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={headCellStyle}>الاسم</th>
                  <th style={headCellStyle}>الحالة</th>
                  <th style={headCellStyle}>بدأ في</th>
                  <th style={headCellStyle}>أرسل في</th>
                </tr>
              </thead>
              <tbody>
                {responses.map((r) => (
                  <tr key={r.response_id}>
                    <td style={bodyCellStyle}>{r.respondent_name}</td>
                    <td style={bodyCellStyle}>{r.status}</td>
                    <td style={bodyCellStyle}>{r.started_at ? new Date(r.started_at).toLocaleString() : "—"}</td>
                    <td style={bodyCellStyle}>{r.submitted_at ? new Date(r.submitted_at).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}

      {!loading && tab === "matrix" ? (
        matrix.length === 0 ? (
          <p className="adm-muted">لا توجد إجابات لعرضها.</p>
        ) : (
          <div className="adm-card" style={{ overflowX: "auto" }}>
            <table className="adm-table" style={{ width: "100%", minWidth: 920, borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...headCellStyle, minWidth: 170, position: "sticky", insetInlineStart: 0, background: "#f4f6ea" }}>المشارك</th>
                  {questions.map((q) => (
                    <th key={q.id} style={{ ...headCellStyle, minWidth: 170 }}>{q.body}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row) => (
                  <tr key={row.response_id}>
                    <td style={{ ...bodyCellStyle, minWidth: 170, position: "sticky", insetInlineStart: 0, background: "#fffef9" }}>{row.respondent_name}</td>
                    {questions.map((q) => {
                      const cell = (row.cells || []).find((c) => String(c.question_id) === String(q.id));
                      return <td key={`${row.response_id}-${q.id}`} style={{ ...bodyCellStyle, minWidth: 170 }}>{cell?.value ?? "—"}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}
    </PageShell>
  );
}
