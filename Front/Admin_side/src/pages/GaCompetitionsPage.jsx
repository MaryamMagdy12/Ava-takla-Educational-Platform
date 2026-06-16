import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import PageShell from "../components/common/PageShell";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import Panel from "../components/common/Panel";
import DataTable from "../components/common/DataTable";
import HighlightedText from "../components/common/HighlightedText";
import { useDialog } from "../components/common/DialogProvider";
import { useToast } from "../components/common/ToastProvider";
import useDebouncedValue from "../hooks/useDebouncedValue";
import * as adminApi from "../api/adminApi";
import { ga } from "../navigation/adminPaths";
import "../assets/css/StudentsPage.css";

const PAGE_KEY = "pg-students";

function dateOnly(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString("ar-EG");
}

export default function GaCompetitionsPage() {
  const { confirm, alertMessage } = useDialog();
  const { showToast } = useToast();
  const { globalSearch } = useOutletContext() || { globalSearch: "" };
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsData, setDetailsData] = useState(null);
  const [openActionsId, setOpenActionsId] = useState(null);

  const debouncedSearch = useDebouncedValue(search);
  const debouncedGlobalSearch = useDebouncedValue(globalSearch);
  const highlightQueries = [debouncedSearch, debouncedGlobalSearch];

  async function loadRows() {
    const data = await adminApi.fetchGaCompetitionsAdmin();
    setRows(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    loadRows().catch((e) => setErr(e.message));
  }, []);

  useEffect(() => {
    if (openActionsId == null) return;
    const onDoc = (e) => {
      if (!e.target.closest?.("[data-pg-students-actions-root]")) {
        setOpenActionsId(null);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [openActionsId]);

  const filteredRows = useMemo(() => {
    const localQ = debouncedSearch.trim().toLowerCase();
    const sharedQ = debouncedGlobalSearch.trim().toLowerCase();
    return rows.filter((r) => {
      const title = String(r.title ?? "").toLowerCase();
      const status = String(r.status ?? "").toLowerCase();
      const idStr = String(r.id ?? "");
      const matchesLocal =
        !localQ || title.includes(localQ) || status.includes(localQ) || idStr.includes(localQ);
      const matchesShared = !sharedQ || title.includes(sharedQ) || status.includes(sharedQ) || idStr.includes(sharedQ);
      return matchesLocal && matchesShared;
    });
  }, [rows, debouncedSearch, debouncedGlobalSearch]);

  function nextStatus(current) {
    if (current === "draft") return "published";
    if (current === "published") return "closed";
    return "draft";
  }

  async function showFamilyAnswers(competitionId) {
    try {
      const attempts = await adminApi.fetchGaCompetitionAttemptsApi(competitionId);
      const rowsText = (attempts || [])
        .slice(0, 20)
        .map(
          (a, i) =>
            `${i + 1}) family:${a.family_id ?? "—"} | score:${a.score ?? "—"}/${a.total_questions ?? "—"} | status:${a.status ?? "—"}`,
        )
        .join("\n");
      await alertMessage({
        title: "إجابات العائلات / المحاولات",
        message: rowsText || "لا توجد محاولات حتى الآن.",
        confirmText: "إغلاق",
      });
    } catch (e) {
      setErr(e.message || "تعذر تحميل محاولات العائلات.");
    }
  }

  async function openDetails(row) {
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsData(null);
    try {
      const data = await adminApi.fetchGaCompetitionApi(row.id);
      setDetailsData(data);
    } catch (e) {
      setErr(e.message || "تعذر تحميل التفاصيل.");
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleChangeState(row) {
    const to = nextStatus(row.status);
    const ok = await confirm({
      title: "تغيير حالة المسابقة",
      message: `تغيير الحالة من "${row.status}" إلى "${to}"؟`,
    });
    if (!ok) return;
    setBusy(true);
    setErr("");
    try {
      await adminApi.updateGaCompetitionApi(row.id, { status: to });
      await loadRows();
      showToast({ type: "success", message: "تم تغيير حالة المسابقة." });
    } catch (e) {
      setErr(e.message || "حدث خطأ.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(row) {
    const ok = await confirm({
      title: "حذف المسابقة",
      message: `هل تريد حذف المسابقة "${row.title}"؟`,
    });
    if (!ok) return;
    setBusy(true);
    setErr("");
    try {
      await adminApi.deleteGaCompetitionApi(row.id);
      await loadRows();
      showToast({ type: "success", message: "تم حذف المسابقة." });
    } catch (e) {
      setErr(e.message || "حدث خطأ.");
    } finally {
      setBusy(false);
    }
  }

  const columns = [
    {
      key: "title",
      title: "العنوان",
      render: (row) => (
        <HighlightedText text={row.title ?? "—"} queries={highlightQueries} highlightClassName={`${PAGE_KEY}-highlight`} />
      ),
    },
    {
      key: "status",
      title: "الحالة",
      render: (row) => (
        <HighlightedText text={String(row.status ?? "—")} queries={highlightQueries} highlightClassName={`${PAGE_KEY}-highlight`} />
      ),
    },
    {
      key: "starts_at",
      title: "البداية",
      render: (row) => dateOnly(row.starts_at),
    },
    {
      key: "ends_at",
      title: "النهاية",
      render: (row) => dateOnly(row.ends_at),
    },
    {
      key: "actions",
      title: "الإجراءات",
      render: (row) => {
        const menuOpen = openActionsId === row.id;
        return (
          <div className={`${PAGE_KEY}-actions-wrap`} data-pg-students-actions-root>
            <button
              type="button"
              className={`${PAGE_KEY}-actions-trigger`}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              disabled={busy}
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
                    to={ga(`competitions/${row.id}/edit`)}
                    onClick={() => setOpenActionsId(null)}
                  >
                    تعديل
                  </Link>
                </li>
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className={`${PAGE_KEY}-actions-menu-item`}
                    onClick={() => {
                      setOpenActionsId(null);
                      void openDetails(row);
                    }}
                  >
                    عرض التفاصيل
                  </button>
                </li>
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className={`${PAGE_KEY}-actions-menu-item`}
                    onClick={() => {
                      setOpenActionsId(null);
                      void handleChangeState(row);
                    }}
                  >
                    تغيير الحالة
                  </button>
                </li>
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className={`${PAGE_KEY}-actions-menu-item`}
                    onClick={() => {
                      setOpenActionsId(null);
                      void showFamilyAnswers(row.id);
                    }}
                  >
                    عرض إجابات العائلات
                  </button>
                </li>
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className={`${PAGE_KEY}-actions-menu-item ${PAGE_KEY}-actions-menu-item--danger`}
                    onClick={() => {
                      setOpenActionsId(null);
                      void handleDelete(row);
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
  ];

  return (
    <PageShell
      pageKey={PAGE_KEY}
      title="المسابقات"
      subtitle="أنشئ مسابقة ونافذتها الزمنية، ثم أضف الأسئلة والخيارات من صفحة التحرير."
    >
      <PageToolbar pageKey={PAGE_KEY}>
        <input
          className={`${PAGE_KEY}-toolbar-search`}
          placeholder="ابحث في المسابقات…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <ToolbarLink pageKey={PAGE_KEY} to={ga("competitions/new")} variant="primary">
          + مسابقة جديدة
        </ToolbarLink>
        <ToolbarLink pageKey={PAGE_KEY} to={ga("family-exams")} variant="secondary">
          إدارة امتحانات العائلات
        </ToolbarLink>
      </PageToolbar>
      {err ? <p className="adm-error">{err}</p> : null}
      <Panel pageKey={PAGE_KEY}>
        <DataTable pageKey={PAGE_KEY} columns={columns} rows={filteredRows} />
      </Panel>
      {!err && rows.length === 0 ? (
        <p style={{ color: "#5c4a47" }}>لا توجد مسابقات بعد.</p>
      ) : !err && filteredRows.length === 0 ? (
        <p style={{ color: "#5c4a47" }}>لا توجد مسابقات مطابقة للبحث.</p>
      ) : null}

      {detailsOpen ? (
        <div
          className={`${PAGE_KEY}-modal-overlay`}
          onClick={() => {
            setDetailsOpen(false);
            setDetailsData(null);
          }}
        >
          <div className={`${PAGE_KEY}-modal`} onClick={(e) => e.stopPropagation()}>
            <div className={`${PAGE_KEY}-modal-head`}>
              <div>
                <h3 className={`${PAGE_KEY}-modal-title`}>تفاصيل المسابقة (مراجعة كاملة)</h3>
              </div>
              <button
                type="button"
                className={`${PAGE_KEY}-modal-close`}
                onClick={() => {
                  setDetailsOpen(false);
                  setDetailsData(null);
                }}
              >
                إغلاق
              </button>
            </div>

            {detailsLoading ? <p className={`${PAGE_KEY}-modal-note`}>جاري تحميل التفاصيل…</p> : null}

            {!detailsLoading && detailsData ? (
              <>
                <div className="adm-card" style={{ marginBottom: 12 }}>
                  <p>
                    <strong>العنوان:</strong> {detailsData.title || "—"}
                  </p>
                  <p>
                    <strong>الوصف:</strong> {detailsData.description || "—"}
                  </p>
                  <p>
                    <strong>الحالة:</strong> {detailsData.status || "—"}
                  </p>
                  <p>
                    <strong>البداية:</strong> {dateOnly(detailsData.starts_at)}
                  </p>
                  <p>
                    <strong>النهاية:</strong> {dateOnly(detailsData.ends_at)}
                  </p>
                  <p>
                    <strong>مدة المحاولة (ساعات):</strong> {detailsData.max_attempt_duration_hours ?? "غير محددة"}
                  </p>
                </div>

                <div className="adm-card" style={{ marginBottom: 12 }}>
                  <h4 style={{ marginTop: 0 }}>الأجزاء</h4>
                  {Array.isArray(detailsData.topics) && detailsData.topics.length > 0 ? (
                    <ul style={{ margin: 0, paddingInlineStart: "1.2rem" }}>
                      {detailsData.topics.map((t) => {
                        const topicQuestions = (detailsData.questions || []).filter(
                          (q) => String(q.ga_competition_topic_id) === String(t.id),
                        );
                        const testamentMap = new Map();
                        for (const q of topicQuestions) {
                          const testament = q.testament_type || "unknown";
                          const chapter = Number(q.chapter_number) || 0;
                          if (!testamentMap.has(testament)) testamentMap.set(testament, new Map());
                          const chapterMap = testamentMap.get(testament);
                          chapterMap.set(chapter, (chapterMap.get(chapter) || 0) + 1);
                        }

                        return (
                          <li key={t.id} style={{ marginBottom: 10 }}>
                            <strong>{t.title}</strong>
                            {topicQuestions.length === 0 ? (
                              <p className="adm-muted" style={{ margin: "4px 0 0" }}>
                                لا توجد أسئلة مرتبطة بهذا الجزء.
                              </p>
                            ) : (
                              <ul style={{ margin: "6px 0 0", paddingInlineStart: "1.2rem" }}>
                                {Array.from(testamentMap.entries()).map(([testament, chapters]) => (
                                  <li key={`${t.id}-${testament}`}>
                                    <strong>{testament === "old" ? "عهد قديم" : testament === "new" ? "عهد جديد" : testament}</strong>
                                    <ul style={{ margin: "4px 0 0", paddingInlineStart: "1.2rem" }}>
                                      {Array.from(chapters.entries())
                                        .sort((a, b) => a[0] - b[0])
                                        .map(([chapter, count]) => (
                                          <li key={`${t.id}-${testament}-${chapter}`}>
                                            أصحاح {chapter || "—"}: {count} سؤال
                                          </li>
                                        ))}
                                    </ul>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="adm-muted" style={{ margin: 0 }}>
                      لا توجد أجزاء.
                    </p>
                  )}
                </div>

                <div className="adm-card">
                  <h4 style={{ marginTop: 0 }}>الأسئلة</h4>
                  {Array.isArray(detailsData.questions) && detailsData.questions.length > 0 ? (
                    <div className="adm-form-stack">
                      {detailsData.questions.map((q, idx) => (
                        <article key={q.id} className="adm-card" style={{ margin: 0 }}>
                          <p style={{ margin: "0 0 6px", fontWeight: 700 }}>
                            {idx + 1}. {q.body || q.question_text}
                          </p>
                          <p className="adm-muted" style={{ margin: "0 0 8px" }}>
                            topic:{q.ga_competition_topic_id ?? "—"} / {q.testament_type ?? "—"} / chapter:
                            {q.chapter_number ?? "—"}
                          </p>
                          {Array.isArray(q.options) && q.options.length > 0 ? (
                            <ul style={{ margin: 0, paddingInlineStart: "1.2rem" }}>
                              {q.options.map((o) => (
                                <li key={o.id}>
                                  {o.option_text} {o.is_correct ? "✓" : ""}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="adm-muted" style={{ margin: 0 }}>
                              لا توجد اختيارات.
                            </p>
                          )}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="adm-muted" style={{ margin: 0 }}>
                      لا توجد أسئلة.
                    </p>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
