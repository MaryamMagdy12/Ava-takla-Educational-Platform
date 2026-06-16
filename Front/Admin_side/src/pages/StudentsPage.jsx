import { useEffect, useMemo, useState } from "react";
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
import "../assets/css/StudentsPage.css";
import { useDialog } from "../components/common/DialogProvider";
import { useToast } from "../components/common/ToastProvider";
import LearnerAvatar from "../components/common/LearnerAvatar";

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

function StudentsPage() {
  const nav = useAdminNav();
  const { students, levels, refreshStudents } = useAdminData();
  const { globalSearch } = useOutletContext();
  const { confirmWithPassword, alertMessage } = useDialog();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [attemptModal, setAttemptModal] = useState({
    open: false,
    studentId: null,
    studentName: "",
    rows: [],
    loading: false,
    error: "",
    page: 1,
    lastPage: 1,
    total: 0,
  });
  const debouncedSearch = useDebouncedValue(search);
  const debouncedGlobalSearch = useDebouncedValue(globalSearch);
  const highlightQueries = [debouncedSearch, debouncedGlobalSearch];
  const [openStudentActionsId, setOpenStudentActionsId] = useState(null);

  useEffect(() => {
    if (openStudentActionsId == null) return;
    const onDoc = (e) => {
      if (!e.target.closest?.("[data-pg-students-actions-root]")) {
        setOpenStudentActionsId(null);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [openStudentActionsId]);

  const loadAttempts = async (studentId, studentName, page = 1) => {
    setAttemptModal((prev) => ({
      ...prev,
      open: true,
      studentId,
      studentName,
      rows: page === 1 ? [] : prev.rows,
      loading: true,
      error: "",
    }));
    try {
      const result = await adminApi.fetchStudentAttemptsApi(studentId, page);
      setAttemptModal({
        open: true,
        studentId,
        studentName,
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
        studentId,
        studentName,
        rows: [],
        loading: false,
        error: e.message || "تعذر تحميل محاولات الطالب.",
        page: 1,
        lastPage: 1,
        total: 0,
      });
    }
  };

  const openAttempts = async (row) => {
    await loadAttempts(row.id, row.name, 1);
  };

  const filtered = useMemo(
    () =>
      students.filter((student) => {
        const localQuery = debouncedSearch.trim().toLowerCase();
        const sharedQuery = debouncedGlobalSearch.trim().toLowerCase();
        const matchesLocal =
          !localQuery ||
          student.name.toLowerCase().includes(localQuery) ||
          student.studentId.toLowerCase().includes(localQuery) ||
          String(student.parentName || "").toLowerCase().includes(localQuery) ||
          String(student.parentPhone || "").toLowerCase().includes(localQuery) ||
          String(student.parentEmail || "").toLowerCase().includes(localQuery);
        const matchesShared =
          !sharedQuery ||
          student.name.toLowerCase().includes(sharedQuery) ||
          student.studentId.toLowerCase().includes(sharedQuery) ||
          String(student.level || "").toLowerCase().includes(sharedQuery) ||
          String(student.status || "").toLowerCase().includes(sharedQuery) ||
          String(student.email || "").toLowerCase().includes(sharedQuery) ||
          String(student.parentName || "").toLowerCase().includes(sharedQuery) ||
          String(student.parentPhone || "").toLowerCase().includes(sharedQuery) ||
          String(student.parentEmail || "").toLowerCase().includes(sharedQuery);
        const matchesLevel =
          !levelFilter || Number(student.levelId) === Number(levelFilter);
        return matchesLocal && matchesShared && matchesLevel;
      }),
    [debouncedGlobalSearch, debouncedSearch, levelFilter, students],
  );

  const columns = [
    {
      key: "name",
      title: "الاسم",
      render: (row) => (
        <span className={`${PAGE_KEY}-namecell`}>
          <LearnerAvatar photoUrl={row.photoUrl} name={row.name} />
          <HighlightedText text={row.name} queries={highlightQueries} highlightClassName={`${PAGE_KEY}-highlight`} />
        </span>
      ),
    },
    {
      key: "studentId",
      title: "كود الطالب",
      render: (row) => (
        <HighlightedText text={row.studentId} queries={highlightQueries} highlightClassName={`${PAGE_KEY}-highlight`} />
      ),
    },
    {
      key: "level",
      title: "المرحلة",
      render: (row) => (
        <HighlightedText text={row.level} queries={highlightQueries} highlightClassName={`${PAGE_KEY}-highlight`} />
      ),
    },
    {
      key: "parentName",
      title: "ولي الأمر",
      render: (row) => (
        <HighlightedText
          text={row.parentName || "—"}
          queries={highlightQueries}
          highlightClassName={`${PAGE_KEY}-highlight`}
        />
      ),
    },
    {
      key: "parentPhone",
      title: "جوال الولي",
      render: (row) => (
        <span className={`${PAGE_KEY}-mono`} dir="ltr">
          <HighlightedText
            text={row.parentPhone || "—"}
            queries={highlightQueries}
            highlightClassName={`${PAGE_KEY}-highlight`}
          />
        </span>
      ),
    },
    {
      key: "parentEmail",
      title: "بريد الولي",
      render: (row) => (
        <span className={`${PAGE_KEY}-mono`} dir="ltr" style={{ fontSize: "0.85rem" }}>
          <HighlightedText
            text={row.parentEmail || "—"}
            queries={highlightQueries}
            highlightClassName={`${PAGE_KEY}-highlight`}
          />
        </span>
      ),
    },
    { key: "status", title: "الحالة" },
    {
      key: "actions",
      title: "الإجراءات",
      render: (row) => {
        const menuOpen = openStudentActionsId === row.id;
        return (
          <div className={`${PAGE_KEY}-actions-wrap`} data-pg-students-actions-root>
            <button
              type="button"
              className={`${PAGE_KEY}-actions-trigger`}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={(e) => {
                e.stopPropagation();
                setOpenStudentActionsId((id) => (id === row.id ? null : row.id));
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
                    to={nav(`students/${row.id}/edit`)}
                    onClick={() => setOpenStudentActionsId(null)}
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
                      setOpenStudentActionsId(null);
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
                    className={`${PAGE_KEY}-actions-menu-item ${PAGE_KEY}-actions-menu-item--danger`}
                    onClick={async () => {
                      setOpenStudentActionsId(null);
                      const auth = await confirmWithPassword({
                        title: "حذف الطالب",
                        message: `هل تريد حذف الطالب "${row.name}"؟ لا يمكن التراجع عن هذا الإجراء.`,
                      });
                      if (!auth?.password) return;
                      try {
                        await adminApi.deleteStudentApi(row.id, auth.password);
                        await refreshStudents();
                        showToast({ type: "success", message: "تم حذف الطالب." });
                      } catch (e) {
                        await alertMessage({ title: "تعذر الحذف", message: e.message });
                      }
                    }}
                  >
                    حذف
                  </button>
                </li>
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className={`${PAGE_KEY}-actions-menu-item`}
                    onClick={async () => {
                      setOpenStudentActionsId(null);
                      try {
                        await adminApi.toggleStudentStatus(row.id);
                        await refreshStudents();
                        showToast({ type: "info", message: "تم تحديث حالة الطالب." });
                      } catch (e) {
                        await alertMessage({ title: "تعذر تحديث الحالة", message: e.message });
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
                      setOpenStudentActionsId(null);
                      const auth = await confirmWithPassword({
                        title: "إعادة تعيين كلمة المرور",
                        message: `سيتم إصدار كلمات مرور جديدة للطالب "${row.name}". أدخل كلمة مرور المشرف للمتابعة.`,
                      });
                      if (!auth?.password) return;
                      try {
                        const creds = await adminApi.resetStudentPassword(row.id, auth.password);
                        const credentialsText = [
                          creds.message ? `${creds.message}\n` : "",
                          `كلمة المرور المؤقتة:\n${creds.temporary_password}`,
                          "",
                          `كلمة المرور الدائمة (صيغة المرحلة):\n${creds.permanent_password}`,
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
      title="إدارة الطلاب"
      subtitle="ابحث عن الطلاب وفعّلهم أو عطّلهم وأعد تعيين كلمات المرور."
    >
      <PageToolbar pageKey={PAGE_KEY}>
        <input
          className={`${PAGE_KEY}-toolbar-search`}
          placeholder="ابحث عن الطلاب..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className={`${PAGE_KEY}-toolbar-filter`}>
          <span className={`${PAGE_KEY}-toolbar-filter-label`}>المرحلة</span>
          <select
            className={`${PAGE_KEY}-toolbar-select`}
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            aria-label="تصفية حسب المرحلة"
          >
            <option value="">جميع المراحل</option>
            {levels.map((lv) => (
              <option key={lv.id} value={String(lv.id)}>
                {lv.name}
              </option>
            ))}
          </select>
        </label>
        <ToolbarLink pageKey={PAGE_KEY} to={nav("students/new")} variant="primary">
          + إضافة طالب
        </ToolbarLink>
      </PageToolbar>

      <Panel pageKey={PAGE_KEY}>
        <DataTable pageKey={PAGE_KEY} columns={columns} rows={filtered} />
      </Panel>

      {attemptModal.open ? (
        <div className={`${PAGE_KEY}-modal-overlay`} onClick={() => setAttemptModal((p) => ({ ...p, open: false }))}>
          <div className={`${PAGE_KEY}-modal`} onClick={(e) => e.stopPropagation()}>
            <div className={`${PAGE_KEY}-modal-head`}>
              <div>
                <h3 className={`${PAGE_KEY}-modal-title`}>سجل الامتحانات</h3>
                <p className={`${PAGE_KEY}-modal-subtitle`}>
                  الطالب: {attemptModal.studentName}
                  <span dir="ltr" style={{ display: "block", marginTop: 4, opacity: 0.85, fontSize: "0.9em" }}>
                    Start / submit times are when the student opened and finished the exam.
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
              <p className={`${PAGE_KEY}-modal-note`}>هذا الطالب لم يدخل أي امتحان حتى الآن.</p>
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
                      onClick={() => loadAttempts(attemptModal.studentId, attemptModal.studentName, attemptModal.page - 1)}
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
                      onClick={() => loadAttempts(attemptModal.studentId, attemptModal.studentName, attemptModal.page + 1)}
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
    </PageShell>
  );
}

export default StudentsPage;
