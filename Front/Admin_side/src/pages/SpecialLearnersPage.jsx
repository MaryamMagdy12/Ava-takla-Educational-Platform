import { useEffect, useMemo, useState, useCallback } from "react";
import PageShell from "../components/common/PageShell";
import PageToolbar from "../components/common/PageToolbar";
import HighlightedText from "../components/common/HighlightedText";
import Panel from "../components/common/Panel";
import DataTable from "../components/common/DataTable";
import * as adminApi from "../api/adminApi";
import "../assets/css/StudentsPage.css";
import { useDialog } from "../components/common/DialogProvider";
import { useToast } from "../components/common/ToastProvider";
import useDebouncedValue from "../hooks/useDebouncedValue";
import { useOutletContext } from "react-router-dom";
import { resolveLearnerPhotoUrlFromRecord } from "../utils/resolveLearnerPhotoUrl";

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

async function showSpecialLearnerIssuedCredentials(issued, alertMessage) {
  if (!issued?.temporary_password) return;
  const credentialsText = [
    `كلمة المرور المؤقتة:\n${issued.temporary_password}`,
    "",
    `كلمة المرور الدائمة:\n${issued.permanent_password}`,
  ].join("\n");
  await alertMessage({
    title: "بيانات الدخول (انسخ الآن)",
    message: credentialsText,
    copyText: credentialsText,
    confirmText: "تم",
  });
}

function birthDisplay(value) {
  if (value == null || value === "") return "—";
  const s = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "—";
}

export default function SpecialLearnersPage() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState(null);
  const [editorSaving, setEditorSaving] = useState(false);
  const { globalSearch } = useOutletContext() || { globalSearch: "" };
  const { confirmWithPassword, alertMessage } = useDialog();
  const { showToast } = useToast();
  const debouncedSearch = useDebouncedValue(search);
  const debouncedGlobalSearch = useDebouncedValue(globalSearch);
  const highlightQueries = [debouncedSearch, debouncedGlobalSearch];
  const [openLearnerActionsId, setOpenLearnerActionsId] = useState(null);
  const [photoLightbox, setPhotoLightbox] = useState(null);
  const [attemptModal, setAttemptModal] = useState({
    open: false,
    learnerId: null,
    learnerName: "",
    rows: [],
    loading: false,
    error: "",
    page: 1,
    lastPage: 1,
    total: 0,
  });

  useEffect(() => {
    if (!photoLightbox) return;
    const onKey = (e) => {
      if (e.key === "Escape") setPhotoLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [photoLightbox]);

  useEffect(() => {
    if (openLearnerActionsId == null) return;
    const onDoc = (e) => {
      if (!e.target.closest?.("[data-pg-students-actions-root]")) {
        setOpenLearnerActionsId(null);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [openLearnerActionsId]);

  const load = () =>
    adminApi
      .fetchSpecialLearners()
      .then(setRows)
      .catch((e) => setErr(e.message));

  useEffect(() => {
    load();
  }, []);

  const loadAttempts = async (learnerId, learnerName, page = 1) => {
    setAttemptModal((prev) => ({
      ...prev,
      open: true,
      learnerId,
      learnerName,
      rows: page === 1 ? [] : prev.rows,
      loading: true,
      error: "",
    }));
    try {
      const result = await adminApi.fetchSpecialLearnerAttemptsApi(learnerId, page);
      setAttemptModal({
        open: true,
        learnerId,
        learnerName,
        rows: result.data || [],
        loading: false,
        error: "",
        page: result.current_page ?? 1,
        lastPage: result.last_page ?? 1,
        total: result.total ?? 0,
      });
    } catch (e) {
      setAttemptModal({
        open: true,
        learnerId,
        learnerName,
        rows: [],
        loading: false,
        error: e.message || "تعذر تحميل محاولات المتعلّم.",
        page: 1,
        lastPage: 1,
        total: 0,
      });
    }
  };

  const openAttempts = async (row) => {
    await loadAttempts(row.id, row.full_name || "—", 1);
  };

  const openEditor = useCallback((row) => {
    setOpenLearnerActionsId(null);
    setEditor({
      id: row.id,
      full_name: row.full_name ?? "",
      email: row.email ?? "",
      phone: row.phone ?? "",
      address: row.address ?? "",
      age: row.age != null && row.age !== "" ? String(row.age) : "",
      birth_date: row.birth_date ? String(row.birth_date).slice(0, 10) : "",
      status: row.status ?? "active",
      originalStatus: row.status ?? "inactive",
      photoUrl: resolveLearnerPhotoUrlFromRecord(row),
    });
  }, []);

  const saveEditor = async () => {
    if (!editor) return;

    const activating = editor.originalStatus === "inactive" && editor.status === "active";
    let adminPassword;
    if (activating) {
      const auth = await confirmWithPassword({
        title: "تفعيل حساب المتعلّم",
        message: `سيتم تفعيل حساب «${editor.full_name.trim()}». أدخل كلمة مرور المشرف للمتابعة.`,
      });
      if (!auth?.password) return;
      adminPassword = auth.password;
    }

    setEditorSaving(true);
    try {
      const payload = {
        full_name: editor.full_name.trim(),
        email: editor.email.trim(),
        phone: editor.phone.trim() || null,
        address: editor.address.trim() || null,
        age:
          editor.age === ""
            ? null
            : (() => {
                const n = parseInt(editor.age, 10);
                return Number.isNaN(n) ? null : n;
              })(),
        birth_date: editor.birth_date || null,
        status: editor.status,
      };
      if (adminPassword) payload.admin_password = adminPassword;

      const res = await adminApi.updateSpecialLearnerApi(editor.id, payload);
      if (res.issued_credentials) {
        await showSpecialLearnerIssuedCredentials(res.issued_credentials, alertMessage);
      }
      setEditor(null);
      await load();
      showToast({ type: "success", message: "تم حفظ البيانات." });
    } catch (e) {
      await alertMessage({ title: "تعذر الحفظ", message: e.message });
    } finally {
      setEditorSaving(false);
    }
  };

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const localQuery = debouncedSearch.trim().toLowerCase();
        const sharedQuery = debouncedGlobalSearch.trim().toLowerCase();
        const name = (r.full_name || "").toLowerCase();
        const email = (r.email || "").toLowerCase();
        const phone = String(r.phone || "").toLowerCase();
        const ageStr = r.age != null && r.age !== "" ? String(r.age) : "";
        const birthStr = birthDisplay(r.birth_date).toLowerCase();
        const matchesLocal =
          !localQuery ||
          name.includes(localQuery) ||
          email.includes(localQuery) ||
          phone.includes(localQuery) ||
          ageStr.includes(localQuery) ||
          birthStr.includes(localQuery);
        const matchesShared =
          !sharedQuery ||
          name.includes(sharedQuery) ||
          email.includes(sharedQuery) ||
          phone.includes(sharedQuery) ||
          ageStr.includes(sharedQuery) ||
          birthStr.includes(sharedQuery) ||
          String(r.status || "").includes(sharedQuery);
        return matchesLocal && matchesShared;
      }),
    [rows, debouncedGlobalSearch, debouncedSearch],
  );

  const columns = [
    {
      key: "photo",
      title: "الصورة",
      render: (row) => {
        const url = resolveLearnerPhotoUrlFromRecord(row);
        return (
          <div className={`${PAGE_KEY}-photo-preview-cell`}>
            {url ? (
              <img className={`${PAGE_KEY}-photo-preview`} src={url} alt="" loading="lazy" />
            ) : (
              <span className={`${PAGE_KEY}-photo-preview--empty`}>لا صورة</span>
            )}
          </div>
        );
      },
    },
    {
      key: "full_name",
      title: "الاسم",
      render: (row) => (
        <HighlightedText text={row.full_name || "—"} queries={highlightQueries} highlightClassName={`${PAGE_KEY}-highlight`} />
      ),
    },
    {
      key: "email",
      title: "البريد",
      render: (row) => (
        <HighlightedText text={row.email || "—"} queries={highlightQueries} highlightClassName={`${PAGE_KEY}-highlight`} />
      ),
    },
    {
      key: "phone",
      title: "الهاتف",
      render: (row) => row.phone || "—",
    },
    {
      key: "age",
      title: "العمر",
      render: (row) => (row.age != null && row.age !== "" ? row.age : "—"),
    },
    {
      key: "birth_date",
      title: "تاريخ الميلاد",
      render: (row) => birthDisplay(row.birth_date),
    },
    {
      key: "verified",
      title: "البريد مُفعّل",
      render: (row) => (row.email_verified_at ? "نعم" : "لا"),
    },
    { key: "status", title: "الحالة" },
    {
      key: "actions",
      title: "الإجراءات",
      render: (row) => {
        const menuOpen = openLearnerActionsId === row.id;
        return (
          <div className={`${PAGE_KEY}-actions-wrap`} data-pg-students-actions-root>
            <button
              type="button"
              className={`${PAGE_KEY}-actions-trigger`}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={(e) => {
                e.stopPropagation();
                setOpenLearnerActionsId((id) => (id === row.id ? null : row.id));
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
                      setOpenLearnerActionsId(null);
                      openEditor(row);
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
                      setOpenLearnerActionsId(null);
                      void openAttempts(row);
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
                      setOpenLearnerActionsId(null);
                      const url = resolveLearnerPhotoUrlFromRecord(row);
                      if (!url) {
                        void alertMessage({
                          title: "لا توجد صورة",
                          message: "لا يوجد ملف صورة لهذا المتعلّم.",
                          confirmText: "حسنًا",
                        });
                        return;
                      }
                      setPhotoLightbox({
                        url,
                        name: row.full_name || "—",
                      });
                    }}
                  >
                    عرض الصورة الشخصية
                  </button>
                </li>
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className={`${PAGE_KEY}-actions-menu-item`}
                    onClick={async () => {
                      setOpenLearnerActionsId(null);
                      const activating = row.status === "inactive";
                      let adminPassword;
                      if (activating) {
                        const auth = await confirmWithPassword({
                          title: "تفعيل حساب المتعلّم",
                          message: `سيتم تفعيل حساب «${row.full_name}». أدخل كلمة مرور المشرف للمتابعة.`,
                        });
                        if (!auth?.password) return;
                        adminPassword = auth.password;
                      }
                      try {
                        const res = await adminApi.toggleSpecialLearnerStatus(row.id, adminPassword);
                        await load();
                        showToast({ type: "info", message: "تم تحديث الحالة." });
                        if (res.issued_credentials) {
                          await showSpecialLearnerIssuedCredentials(res.issued_credentials, alertMessage);
                        }
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
                      setOpenLearnerActionsId(null);
                      const auth = await confirmWithPassword({
                        title: "إعادة إصدار كلمات المرور",
                        message: `سيتم إلغاء جلسات «${row.full_name}» وإصدار كلمات مرور جديدة.`,
                      });
                      if (!auth?.password) return;
                      try {
                        const pw = await adminApi.resetSpecialLearnerPasswordApi(row.id, auth.password);
                        await load();
                        await showSpecialLearnerIssuedCredentials(
                          { temporary_password: pw.temporary_password, permanent_password: pw.permanent_password },
                          alertMessage,
                        );
                      } catch (e) {
                        await alertMessage({ title: "تعذر العملية", message: e.message });
                      }
                    }}
                  >
                    كلمات مرور جديدة
                  </button>
                </li>
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className={`${PAGE_KEY}-actions-menu-item ${PAGE_KEY}-actions-menu-item--danger`}
                    onClick={async () => {
                      setOpenLearnerActionsId(null);
                      const auth = await confirmWithPassword({
                        title: "حذف المتعلّم",
                        message: `هل تريد حذف "${row.full_name}"؟`,
                      });
                      if (!auth?.password) return;
                      try {
                        await adminApi.deleteSpecialLearnerApi(row.id, auth.password);
                        await load();
                        showToast({ type: "success", message: "تم الحذف." });
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
      title="حسابات المتعلّمين"
      subtitle="عرض وتعديل البيانات. التسجيل العام: تحقق بالبريد ثم انتظار تفعيل الكنيسة. يمكن إعادة إصدار كلمات المرور من الإجراءات."
    >
      <PageToolbar pageKey={PAGE_KEY}>
        <input
          className={`${PAGE_KEY}-toolbar-search`}
          placeholder="ابحث…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </PageToolbar>
      {err ? <p className="adm-error">{err}</p> : null}
      <Panel pageKey={PAGE_KEY}>
        <DataTable pageKey={PAGE_KEY} columns={columns} rows={filtered} />
      </Panel>
      {!err && filtered.length === 0 ? <p style={{ color: "#5c4a47" }}>لا يوجد متعلّمون بعد.</p> : null}

      {photoLightbox ? (
        <div
          className="pg-students-photo-lightbox-overlay"
          role="presentation"
          onClick={() => setPhotoLightbox(null)}
        >
          <div
            className="pg-students-photo-lightbox-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sp-photo-lightbox-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pg-students-photo-lightbox-head">
              <h3 id="sp-photo-lightbox-title" className="pg-students-photo-lightbox-title">
                {photoLightbox.name}
              </h3>
              <button
                type="button"
                className="pg-students-photo-lightbox-close"
                onClick={() => setPhotoLightbox(null)}
              >
                إغلاق
              </button>
            </div>
            <div className="pg-students-photo-lightbox-img-wrap">
              <img
                className="pg-students-photo-lightbox-img"
                src={photoLightbox.url}
                alt={photoLightbox.name}
              />
            </div>
          </div>
        </div>
      ) : null}

      {attemptModal.open ? (
        <div className={`${PAGE_KEY}-modal-overlay`} onClick={() => setAttemptModal((p) => ({ ...p, open: false }))}>
          <div className={`${PAGE_KEY}-modal`} onClick={(e) => e.stopPropagation()}>
            <div className={`${PAGE_KEY}-modal-head`}>
              <div>
                <h3 className={`${PAGE_KEY}-modal-title`}>سجل الامتحانات</h3>
                <p className={`${PAGE_KEY}-modal-subtitle`}>
                  المتعلّم: {attemptModal.learnerName}
                  <span dir="ltr" style={{ display: "block", marginTop: 4, opacity: 0.85, fontSize: "0.9em" }}>
                    Start / submit times are when the learner opened and finished the exam.
                  </span>
                </p>
              </div>
              <button
                type="button"
                className={`${PAGE_KEY}-modal-close`}
                onClick={() => setAttemptModal((p) => ({ ...p, open: false }))}
              >
                إغلاق
              </button>
            </div>

            {attemptModal.loading ? <p className={`${PAGE_KEY}-modal-note`}>جارٍ تحميل النتائج...</p> : null}
            {attemptModal.error ? <p className={`${PAGE_KEY}-modal-error`}>{attemptModal.error}</p> : null}
            {!attemptModal.loading && !attemptModal.error && attemptModal.rows.length === 0 ? (
              <p className={`${PAGE_KEY}-modal-note`}>لم يدخل هذا المتعلّم أي امتحان حتى الآن.</p>
            ) : null}

            {!attemptModal.loading && !attemptModal.error && attemptModal.rows.length > 0 ? (
              <>
                <div className={`${PAGE_KEY}-attempts-list`}>
                  {attemptModal.rows.map((attempt) => (
                    <article key={attempt.id} className={`${PAGE_KEY}-attempt-card`}>
                      <div className={`${PAGE_KEY}-attempt-head`}>
                        <h4 className={`${PAGE_KEY}-attempt-title`}>{attempt.exam?.title ?? "امتحان"}</h4>
                        <span className={`${PAGE_KEY}-attempt-status`}>{attempt.status ?? "—"}</span>
                      </div>
                      <p className={`${PAGE_KEY}-attempt-line`}>
                        الدرجة: {attempt.score ?? 0}/{attempt.total_questions ?? 0}
                      </p>
                      <p className={`${PAGE_KEY}-attempt-line`}>النسبة: {attempt.percentage ?? 0}%</p>
                      <p className={`${PAGE_KEY}-attempt-line`} dir="ltr" style={{ textAlign: "left" }}>
                        <strong>Start date:</strong> {dateOnly(attempt.started_at)}{" "}
                        <span style={{ opacity: 0.75 }}>(تاريخ بدء المحاولة)</span>
                      </p>
                      <p className={`${PAGE_KEY}-attempt-line`} dir="ltr" style={{ textAlign: "left" }}>
                        <strong>Start time:</strong> {timeOnly(attempt.started_at)}{" "}
                        <span style={{ opacity: 0.75 }}>(وقت بدء المحاولة)</span>
                      </p>
                      <p className={`${PAGE_KEY}-attempt-line`} dir="ltr" style={{ textAlign: "left" }}>
                        <strong>Submit date:</strong> {dateOnly(attempt.submitted_at)}{" "}
                        <span style={{ opacity: 0.75 }}>(تاريخ التسليم)</span>
                      </p>
                      <p className={`${PAGE_KEY}-attempt-line`} dir="ltr" style={{ textAlign: "left" }}>
                        <strong>Submit time:</strong> {timeOnly(attempt.submitted_at)}{" "}
                        <span style={{ opacity: 0.75 }}>(وقت التسليم)</span>
                      </p>
                    </article>
                  ))}
                </div>

                {attemptModal.lastPage > 1 ? (
                  <div className={`${PAGE_KEY}-modal-pagination`}>
                    <button
                      type="button"
                      className={`${PAGE_KEY}-datatable-btn`}
                      disabled={attemptModal.page <= 1 || attemptModal.loading}
                      onClick={() => loadAttempts(attemptModal.learnerId, attemptModal.learnerName, attemptModal.page - 1)}
                    >
                      السابق
                    </button>
                    <span className={`${PAGE_KEY}-modal-note`}>
                      صفحة {attemptModal.page} من {attemptModal.lastPage} - {attemptModal.total} نتيجة
                    </span>
                    <button
                      type="button"
                      className={`${PAGE_KEY}-datatable-btn`}
                      disabled={attemptModal.page >= attemptModal.lastPage || attemptModal.loading}
                      onClick={() => loadAttempts(attemptModal.learnerId, attemptModal.learnerName, attemptModal.page + 1)}
                    >
                      التالي
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {editor ? (
        <div className="pg-students-edit-overlay" role="dialog" aria-modal="true" aria-labelledby="sp-learner-edit-title">
          <div className="pg-students-edit-dialog">
            <h3 id="sp-learner-edit-title">تعديل متعلّم</h3>
            {editor.photoUrl ? (
              <img className="pg-students-edit-photo-preview" src={editor.photoUrl} alt="" />
            ) : (
              <div className={`${PAGE_KEY}-photo-preview--empty`} style={{ marginBottom: 12 }}>
                لا صورة
              </div>
            )}
            <div className="pg-students-edit-field">
              <label htmlFor="sp-ed-full">الاسم الكامل</label>
              <input
                id="sp-ed-full"
                value={editor.full_name}
                onChange={(e) => setEditor((p) => ({ ...p, full_name: e.target.value }))}
              />
            </div>
            <div className="pg-students-edit-field">
              <label htmlFor="sp-ed-email">البريد</label>
              <input
                id="sp-ed-email"
                type="email"
                dir="ltr"
                value={editor.email}
                onChange={(e) => setEditor((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="pg-students-edit-field">
              <label htmlFor="sp-ed-phone">الهاتف</label>
              <input
                id="sp-ed-phone"
                dir="ltr"
                value={editor.phone}
                onChange={(e) => setEditor((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div className="pg-students-edit-field">
              <label htmlFor="sp-ed-address">العنوان</label>
              <textarea
                id="sp-ed-address"
                rows={2}
                value={editor.address}
                onChange={(e) => setEditor((p) => ({ ...p, address: e.target.value }))}
              />
            </div>
            <div className="pg-students-edit-field">
              <label htmlFor="sp-ed-age">العمر</label>
              <input
                id="sp-ed-age"
                type="number"
                min={0}
                max={150}
                inputMode="numeric"
                placeholder="—"
                value={editor.age}
                onChange={(e) => setEditor((p) => ({ ...p, age: e.target.value }))}
              />
            </div>
            <div className="pg-students-edit-field">
              <label htmlFor="sp-ed-birth">تاريخ الميلاد</label>
              <input
                id="sp-ed-birth"
                type="date"
                value={editor.birth_date}
                onChange={(e) => setEditor((p) => ({ ...p, birth_date: e.target.value }))}
              />
            </div>
            <div className="pg-students-edit-field">
              <label htmlFor="sp-ed-status">الحالة</label>
              <select
                id="sp-ed-status"
                value={editor.status}
                onChange={(e) => setEditor((p) => ({ ...p, status: e.target.value }))}
              >
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>
            </div>
            <div className="pg-students-edit-actions">
              <button type="button" className={`${PAGE_KEY}-datatable-btn`} onClick={() => setEditor(null)} disabled={editorSaving}>
                إلغاء
              </button>
              <button type="button" className={`${PAGE_KEY}-datatable-btn`} onClick={saveEditor} disabled={editorSaving || !editor.full_name.trim()}>
                {editorSaving ? "جاري الحفظ…" : "حفظ"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
