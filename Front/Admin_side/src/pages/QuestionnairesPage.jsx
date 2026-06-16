import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "../components/common/PageShell";
import Panel from "../components/common/Panel";
import DataTable from "../components/common/DataTable";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import * as adminApi from "../api/adminApi";
import { useAdminNav } from "../context/AdminNavContext";
import { useQuestionnaireScope } from "../hooks/useQuestionnaireScope";
import { ga } from "../navigation/adminPaths";
import "../assets/css/QuestionnairesPage.css";

const PAGE_KEY = "pg-questionnaires";

function formatQuestionnaireDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });
}

function statusLabelAr(status) {
  if (status === "draft") return "مسودة";
  if (status === "published") return "منشور";
  if (status === "closed") return "مغلق";
  return status ? String(status) : "—";
}

export default function QuestionnairesPage() {
  const nav = useAdminNav();
  const scope = useQuestionnaireScope();
  const [rows, setRows] = useState([]);
  const [openStatusFor, setOpenStatusFor] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [openActionsId, setOpenActionsId] = useState(null);

  useEffect(() => {
    setLoading(true);
    adminApi
      .fetchQuestionnairesAdmin(scope)
      .then((list) => setRows(list))
      .catch((e) => setErr(e.message || "تعذر التحميل"))
      .finally(() => setLoading(false));
  }, [scope]);

  useEffect(() => {
    if (openActionsId == null) return undefined;
    const onDoc = (e) => {
      if (!e.target.closest?.("[data-pg-questionnaires-actions-root]")) {
        setOpenActionsId(null);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [openActionsId]);

  async function changeStatus(row, nextStatus) {
    setErr("");
    try {
      const updated = await adminApi.updateQuestionnaireAdmin(scope, row.id, { status: nextStatus });
      setRows((prev) =>
        prev.map((q) =>
          String(q.id) === String(row.id) ? { ...q, status: updated?.status ?? nextStatus } : q,
        ),
      );
      setOpenStatusFor(null);
    } catch (e) {
      setErr(e.message || "فشل تغيير الحالة");
    }
  }

  async function removeQuestionnaire(id) {
    setErr("");
    try {
      await adminApi.deleteQuestionnaireAdmin(scope, id);
      setRows((prev) => prev.filter((q) => String(q.id) !== String(id)));
      if (String(openStatusFor) === String(id)) {
        setOpenStatusFor(null);
      }
      if (String(deleteTarget) === String(id)) {
        setDeleteTarget(null);
      }
    } catch (e) {
      setErr(e.message || "فشل الحذف");
    }
  }

  const backTo = scope === "general_assembly" ? ga() : nav();

  const title =
    scope === "general_assembly"
      ? "استبيانات الجمعية العامة"
      : scope === "special"
        ? "استبيانات الدورات المتخصصة"
        : "استبيانات الطلاب";

  const statusRow = rows.find((r) => String(r.id) === String(openStatusFor)) || null;

  const columns = useMemo(() => {
    const cols = [
      {
        key: "title",
        title: "العنوان",
        render: (row) => <span className={`${PAGE_KEY}-titlecell`}>{row.title}</span>,
      },
    ];
    if (scope === "student") {
      cols.push({
        key: "level",
        title: "المرحلة",
        render: (row) => <span className={`${PAGE_KEY}-mutedcell`}>{row.level?.name ?? "—"}</span>,
      });
    }
    cols.push(
      {
        key: "available_from",
        title: "يبدأ",
        render: (row) => <span className={`${PAGE_KEY}-mutedcell`}>{formatQuestionnaireDateTime(row.available_from)}</span>,
      },
      {
        key: "available_to",
        title: "ينتهي",
        render: (row) => <span className={`${PAGE_KEY}-mutedcell`}>{formatQuestionnaireDateTime(row.available_to)}</span>,
      },
      {
        key: "duration",
        title: "مدة الإجابة",
        render: (row) => (
          <span className={`${PAGE_KEY}-mutedcell`}>
            {row.response_duration_minutes != null ? `${row.response_duration_minutes} د` : "—"}
          </span>
        ),
      },
      {
        key: "status",
        title: "الحالة",
        render: (row) => <span className={`${PAGE_KEY}-status-pill`}>{statusLabelAr(row.status)}</span>,
      },
      {
        key: "actions",
        title: "الإجراءات",
        render: (row) => {
          const menuOpen = openActionsId === row.id;
          return (
            <div className={`${PAGE_KEY}-actions-wrap`} data-pg-questionnaires-actions-root>
              <button
                type="button"
                className={`${PAGE_KEY}-actions-trigger`}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenActionsId((id) => (id === row.id ? null : row.id));
                }}
              >
                الإجراءات
                <span className={`${PAGE_KEY}-actions-chevron`} aria-hidden>
                  {menuOpen ? "▲" : "▼"}
                </span>
              </button>
              {menuOpen ? (
                <ul className={`${PAGE_KEY}-actions-menu`} role="menu">
                  <li role="none">
                    <Link
                      role="menuitem"
                      className={`${PAGE_KEY}-actions-menu-item`}
                      to={nav(`questionnaires/${row.id}/edit`)}
                      onClick={() => setOpenActionsId(null)}
                    >
                      تعديل البيانات
                    </Link>
                  </li>
                  <li role="none">
                    <Link
                      role="menuitem"
                      className={`${PAGE_KEY}-actions-menu-item`}
                      to={nav(`questionnaires/${row.id}/edit?step=questions`)}
                      onClick={() => setOpenActionsId(null)}
                    >
                      عرض وتحرير الأسئلة
                    </Link>
                  </li>
                  <li role="none">
                    <Link
                      role="menuitem"
                      className={`${PAGE_KEY}-actions-menu-item`}
                      to={nav(`questionnaires/${row.id}/details`)}
                      onClick={() => setOpenActionsId(null)}
                    >
                      تفاصيل الاستبيان
                    </Link>
                  </li>
                  <li role="none">
                    <button
                      type="button"
                      role="menuitem"
                      className={`${PAGE_KEY}-actions-menu-item`}
                      onClick={() => {
                        setOpenActionsId(null);
                        setOpenStatusFor(row.id);
                      }}
                    >
                      تغيير الحالة
                    </button>
                  </li>
                  <li role="none">
                    <button
                      type="button"
                      role="menuitem"
                      className={`${PAGE_KEY}-actions-menu-item ${PAGE_KEY}-actions-menu-item--danger`}
                      onClick={() => {
                        setOpenActionsId(null);
                        setDeleteTarget(row.id);
                      }}
                    >
                      حذف
                    </button>
                  </li>
                </ul>
              ) : null}
            </div>
          );
        },
      },
    );
    return cols;
  }, [nav, openActionsId, scope]);

  return (
    <PageShell pageKey={PAGE_KEY} title={title} subtitle="جدول الاستبيانات: البيانات العامة، التواريخ، والإجراءات.">
      <PageToolbar pageKey={PAGE_KEY}>
        <ToolbarLink pageKey={PAGE_KEY} to={backTo}>
          العودة للوحة
        </ToolbarLink>
        <ToolbarLink pageKey={PAGE_KEY} to={nav("questionnaires/new")} variant="primary">
          استبيان جديد
        </ToolbarLink>
      </PageToolbar>
      {err ? <p className="adm-error">{err}</p> : null}
      {loading ? <p className="adm-muted">جاري التحميل…</p> : null}
      {!loading && rows.length === 0 ? <p className="adm-muted">لا توجد استبيانات بعد.</p> : null}
      {!loading && rows.length > 0 ? (
        <Panel pageKey={PAGE_KEY}>
          <DataTable pageKey={PAGE_KEY} columns={columns} rows={rows} />
        </Panel>
      ) : null}

      {statusRow ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10, 8, 8, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
            padding: 16,
          }}
          onClick={() => setOpenStatusFor(null)}
        >
          <div
            className="adm-card"
            style={{ width: "min(420px, 96vw)", marginBottom: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="adm-section-title" style={{ marginBottom: 8 }}>
              تغيير حالة الاستبيان
            </h3>
            <p className="adm-muted" style={{ marginBottom: 10 }}>
              {statusRow.title}
            </p>
            <div className="adm-form-actions" style={{ marginTop: 0 }}>
              <button type="button" className="adm-btn adm-btn-secondary" onClick={() => changeStatus(statusRow, "draft")}>
                مسودة
              </button>
              <button type="button" className="adm-btn adm-btn-secondary" onClick={() => changeStatus(statusRow, "published")}>
                منشور
              </button>
              <button type="button" className="adm-btn adm-btn-secondary" onClick={() => changeStatus(statusRow, "closed")}>
                مغلق
              </button>
              <button type="button" className="adm-btn adm-btn-primary" onClick={() => setOpenStatusFor(null)}>
                إغلاق
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10, 8, 8, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2100,
            padding: 16,
          }}
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="adm-card"
            style={{ width: "min(420px, 96vw)", marginBottom: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="adm-section-title" style={{ marginBottom: 8 }}>
              تأكيد الحذف
            </h3>
            <p className="adm-muted" style={{ marginBottom: 14 }}>
              هل تريد حذف هذا الاستبيان نهائيًا؟
            </p>
            <div className="adm-form-actions" style={{ marginTop: 0 }}>
              <button type="button" className="adm-btn adm-btn-secondary" onClick={() => setDeleteTarget(null)}>
                إلغاء
              </button>
              <button type="button" className="adm-btn adm-btn-danger" onClick={() => removeQuestionnaire(deleteTarget)}>
                حذف نهائي
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
