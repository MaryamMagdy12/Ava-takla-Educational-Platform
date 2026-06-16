import { useEffect, useMemo, useState } from "react";
import PageShell from "../components/common/PageShell";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import HighlightedText from "../components/common/HighlightedText";
import Panel from "../components/common/Panel";
import DataTable from "../components/common/DataTable";
import * as adminApi from "../api/adminApi";
import { ga } from "../navigation/adminPaths";
import "../assets/css/StudentsPage.css";
import { useDialog } from "../components/common/DialogProvider";
import { useToast } from "../components/common/ToastProvider";
import useDebouncedValue from "../hooks/useDebouncedValue";
import { useOutletContext } from "react-router-dom";

const PAGE_KEY = "pg-students";

function dateOnly(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString("ar-EG");
}

function timeOnly(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function GaFamiliesPage() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [attemptsOpen, setAttemptsOpen] = useState(false);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [attemptsError, setAttemptsError] = useState("");
  const [attemptsTitle, setAttemptsTitle] = useState("");
  const [attemptsRows, setAttemptsRows] = useState([]);
  const [editor, setEditor] = useState(null);
  const [editorSaving, setEditorSaving] = useState(false);
  const [openFamilyActionsId, setOpenFamilyActionsId] = useState(null);
  const { globalSearch } = useOutletContext() || { globalSearch: "" };
  const { confirmWithPassword, alertMessage } = useDialog();
  const { showToast } = useToast();
  const debouncedSearch = useDebouncedValue(search);
  const debouncedGlobalSearch = useDebouncedValue(globalSearch);
  const highlightQueries = [debouncedSearch, debouncedGlobalSearch];

  const load = () =>
    adminApi
      .fetchGaFamilies()
      .then(setRows)
      .catch((e) => setErr(e.message));

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (openFamilyActionsId == null) return;
    const onDoc = (e) => {
      if (!e.target.closest?.("[data-pg-students-actions-root]")) {
        setOpenFamilyActionsId(null);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [openFamilyActionsId]);

  async function saveFamilyEditor() {
    if (!editor) return;
    const name = editor.display_name.trim();
    if (!name) {
      await alertMessage({ title: "بيانات ناقصة", message: "يرجى إدخال اسم العائلة." });
      return;
    }
    setEditorSaving(true);
    try {
      await adminApi.updateGaFamilyApi(editor.id, { display_name: name, status: editor.status });
      setEditor(null);
      await load();
      showToast({ type: "success", message: "تم حفظ بيانات العائلة." });
    } catch (e) {
      await alertMessage({ title: "تعذر الحفظ", message: e.message });
    } finally {
      setEditorSaving(false);
    }
  }

  async function openAttempts(row, type) {
    setAttemptsOpen(true);
    setAttemptsLoading(true);
    setAttemptsError("");
    setAttemptsRows([]);
    setAttemptsTitle(type === "exam" ? `امتحانات العائلة: ${row.display_name}` : `مسابقات العائلة: ${row.display_name}`);
    try {
      const data =
        type === "exam"
          ? await adminApi.fetchGaFamilyExamAttemptsApi(row.id)
          : await adminApi.fetchGaFamilyCompetitionAttemptsApi(row.id);
      setAttemptsRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setAttemptsError(e.message || "تعذر تحميل البيانات.");
    } finally {
      setAttemptsLoading(false);
    }
  }

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const localQuery = debouncedSearch.trim().toLowerCase();
        const sharedQuery = debouncedGlobalSearch.trim().toLowerCase();
        const name = (r.display_name || "").toLowerCase();
        const lid = String(r.family_login_id || "").toLowerCase();
        const matchesLocal = !localQuery || name.includes(localQuery) || lid.includes(localQuery);
        const matchesShared =
          !sharedQuery || name.includes(sharedQuery) || lid.includes(sharedQuery) || String(r.status || "").includes(sharedQuery);
        return matchesLocal && matchesShared;
      }),
    [rows, debouncedGlobalSearch, debouncedSearch],
  );

  const columns = [
    {
      key: "family_login_id",
      title: "رقم الدخول",
      render: (row) => (
        <HighlightedText text={String(row.family_login_id)} queries={highlightQueries} highlightClassName={`${PAGE_KEY}-highlight`} />
      ),
    },
    {
      key: "display_name",
      title: "الاسم",
      render: (row) => (
        <HighlightedText text={row.display_name} queries={highlightQueries} highlightClassName={`${PAGE_KEY}-highlight`} />
      ),
    },
    { key: "status", title: "الحالة" },
    {
      key: "actions",
      title: "الإجراءات",
      render: (row) => {
        const menuOpen = openFamilyActionsId === row.id;
        return (
          <div className={`${PAGE_KEY}-actions-wrap`} data-pg-students-actions-root>
            <button
              type="button"
              className={`${PAGE_KEY}-actions-trigger`}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={(e) => {
                e.stopPropagation();
                setOpenFamilyActionsId((id) => (id === row.id ? null : row.id));
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
                  <button
                    type="button"
                    role="menuitem"
                    className={`${PAGE_KEY}-actions-menu-item`}
                    onClick={() => {
                      setOpenFamilyActionsId(null);
                      setEditor({
                        id: row.id,
                        display_name: row.display_name ?? "",
                        status: row.status === "inactive" ? "inactive" : "active",
                        family_login_id: row.family_login_id ?? "",
                      });
                    }}
                  >
                    تعديل
                  </button>
                </li>
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className={`${PAGE_KEY}-actions-menu-item`}
                    onClick={() => {
                      setOpenFamilyActionsId(null);
                      void openAttempts(row, "exam");
                    }}
                  >
                    عرض الامتحانات
                  </button>
                </li>
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className={`${PAGE_KEY}-actions-menu-item`}
                    onClick={() => {
                      setOpenFamilyActionsId(null);
                      void openAttempts(row, "competition");
                    }}
                  >
                    عرض المسابقات
                  </button>
                </li>
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className={`${PAGE_KEY}-actions-menu-item`}
                    onClick={async () => {
                      setOpenFamilyActionsId(null);
                      try {
                        await adminApi.toggleGaFamilyStatus(row.id);
                        await load();
                        showToast({ type: "info", message: "تم تحديث حالة العائلة." });
                      } catch (e) {
                        await alertMessage({ title: "تعذر التحديث", message: e.message });
                      }
                    }}
                  >
                    تبديل الحالة
                  </button>
                </li>
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className={`${PAGE_KEY}-actions-menu-item`}
                    onClick={async () => {
                      setOpenFamilyActionsId(null);
                      const auth = await confirmWithPassword({
                        title: "إعادة تعيين كلمة المرور",
                        message: `سيتم إصدار كلمات مرور جديدة للعائلة "${row.display_name}".`,
                      });
                      if (!auth?.password) return;
                      try {
                        const creds = await adminApi.resetGaFamilyPassword(row.id, auth.password);
                        const credentialsText = [
                          creds.message ? `${creds.message}\n` : "",
                          `كلمة المرور المؤقتة:\n${creds.temporary_password}`,
                          "",
                          `كلمة المرور الدائمة (Ga#…):\n${creds.permanent_password}`,
                        ]
                          .filter(Boolean)
                          .join("\n");
                        await alertMessage({
                          title: "بيانات الدخول (انسخ الآن)",
                          message: credentialsText,
                          copyText: credentialsText,
                          confirmText: "تم",
                        });
                      } catch (e) {
                        await alertMessage({ title: "تعذر إعادة التعيين", message: e.message });
                      }
                    }}
                  >
                    إعادة تعيين كلمة المرور
                  </button>
                </li>
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className={`${PAGE_KEY}-actions-menu-item ${PAGE_KEY}-actions-menu-item--danger`}
                    onClick={async () => {
                      setOpenFamilyActionsId(null);
                      const auth = await confirmWithPassword({
                        title: "حذف العائلة",
                        message: `هل تريد حذف حساب العائلة "${row.display_name}"؟`,
                      });
                      if (!auth?.password) return;
                      try {
                        await adminApi.deleteGaFamilyApi(row.id, auth.password);
                        await load();
                        showToast({ type: "success", message: "تم حذف العائلة." });
                      } catch (e) {
                        await alertMessage({ title: "تعذر الحذف", message: e.message });
                      }
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
      title="عائلات المسابقة"
      subtitle="نفس منطق الطلاب: كلمة مرور مؤقتة ثم الدائمة الرسمية Ga#… — انسخ البيانات عند الإنشاء أو إعادة التعيين."
    >
      <PageToolbar pageKey={PAGE_KEY}>
        <input
          className={`${PAGE_KEY}-toolbar-search`}
          placeholder="ابحث عن عائلة…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <ToolbarLink pageKey={PAGE_KEY} to={ga("families/new")} variant="primary">
          + إضافة عائلة
        </ToolbarLink>
      </PageToolbar>
      {err ? <p className="adm-error">{err}</p> : null}
      <Panel pageKey={PAGE_KEY}>
        <DataTable pageKey={PAGE_KEY} columns={columns} rows={filtered} />
      </Panel>
      {!err && filtered.length === 0 ? <p style={{ color: "#5c4a47" }}>لا توجد عائلات بعد.</p> : null}

      {editor ? (
        <div className="pg-students-edit-overlay" role="dialog" aria-modal="true" aria-labelledby="ga-family-edit-title">
          <div className="pg-students-edit-dialog">
            <h3 id="ga-family-edit-title">تعديل عائلة</h3>
            <p className={`${PAGE_KEY}-modal-note`} style={{ marginBottom: 12 }}>
              رقم الدخول: <strong dir="ltr">{editor.family_login_id || "—"}</strong> (لا يمكن تغييره من هنا)
            </p>
            <div className="pg-students-edit-field">
              <label htmlFor="ga-fam-display">اسم العرض</label>
              <input
                id="ga-fam-display"
                value={editor.display_name}
                onChange={(e) => setEditor((p) => (p ? { ...p, display_name: e.target.value } : p))}
              />
            </div>
            <div className="pg-students-edit-field">
              <label htmlFor="ga-fam-status">الحالة</label>
              <select
                id="ga-fam-status"
                value={editor.status}
                onChange={(e) => setEditor((p) => (p ? { ...p, status: e.target.value } : p))}
              >
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>
            </div>
            <div className="pg-students-edit-actions">
              <button type="button" className={`${PAGE_KEY}-datatable-btn`} onClick={() => setEditor(null)} disabled={editorSaving}>
                إلغاء
              </button>
              <button type="button" className={`${PAGE_KEY}-datatable-btn`} onClick={() => void saveFamilyEditor()} disabled={editorSaving}>
                {editorSaving ? "جاري الحفظ…" : "حفظ"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {attemptsOpen ? (
        <div className={`${PAGE_KEY}-modal-overlay`} onClick={() => setAttemptsOpen(false)}>
          <div className={`${PAGE_KEY}-modal`} onClick={(e) => e.stopPropagation()}>
            <div className={`${PAGE_KEY}-modal-head`}>
              <div>
                <h3 className={`${PAGE_KEY}-modal-title`}>{attemptsTitle}</h3>
                <p className={`${PAGE_KEY}-modal-subtitle`}>
                  العنوان | الدرجة | تاريخ بدء المحاولة | وقت بدء المحاولة | تاريخ التسليم | وقت التسليم
                </p>
              </div>
              <button type="button" className={`${PAGE_KEY}-modal-close`} onClick={() => setAttemptsOpen(false)}>
                إغلاق
              </button>
            </div>

            {attemptsLoading ? <p className={`${PAGE_KEY}-modal-note`}>جاري التحميل...</p> : null}
            {attemptsError ? <p className={`${PAGE_KEY}-modal-error`}>{attemptsError}</p> : null}

            {!attemptsLoading && !attemptsError && attemptsRows.length > 0 ? (
              <DataTable
                pageKey={PAGE_KEY}
                keyField="attempt_id"
                columns={[
                  { key: "title", title: "العنوان", render: (item) => item.title || "—" },
                  { key: "score", title: "الدرجة", render: (item) => item.score ?? "—" },
                  { key: "started_date", title: "تاريخ بدء المحاولة", render: (item) => dateOnly(item.started_at) },
                  { key: "started_time", title: "وقت بدء المحاولة", render: (item) => timeOnly(item.started_at) },
                  { key: "submitted_date", title: "تاريخ التسليم", render: (item) => dateOnly(item.submitted_at) },
                  { key: "submitted_time", title: "وقت التسليم", render: (item) => timeOnly(item.submitted_at) },
                ]}
                rows={attemptsRows}
              />
            ) : null}

            {!attemptsLoading && !attemptsError && attemptsRows.length === 0 ? (
              <p className={`${PAGE_KEY}-modal-note`}>لا توجد بيانات لعرضها.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
