import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import HighlightedText from "../components/common/HighlightedText";
import PageShell from "../components/common/PageShell";
import Panel from "../components/common/Panel";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import useDebouncedValue from "../hooks/useDebouncedValue";
import "../assets/css/LibraryPage.css";
import { useAdminNav } from "../context/AdminNavContext";
import * as adminApi from "../api/adminApi";
import { useDialog } from "../components/common/DialogProvider";
import { useToast } from "../components/common/ToastProvider";

const PAGE_KEY = "pg-library";

export default function GaLibraryPage() {
  const nav = useAdminNav();
  const { confirm, alertMessage } = useDialog();
  const { showToast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyDeleteId, setBusyDeleteId] = useState(null);
  const { globalSearch } = useOutletContext() ?? { globalSearch: "" };
  const debouncedGlobalSearch = useDebouncedValue(globalSearch);
  const highlightQueries = [debouncedGlobalSearch];

  async function load() {
    setLoading(true);
    try {
      const list = await adminApi.fetchGaLectures();
      setRows(Array.isArray(list) ? list : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filteredLectures = useMemo(() => {
    const query = debouncedGlobalSearch.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(
      (row) =>
        String(row.title || "")
          .toLowerCase()
          .includes(query) ||
        String(row.status || "")
          .toLowerCase()
          .includes(query) ||
        String(row.summary || "")
          .toLowerCase()
          .includes(query),
    );
  }, [debouncedGlobalSearch, rows]);

  const deleteLecture = async (row) => {
    const ok = await confirm({
      title: "حذف المحاضرة",
      message: `هل تريد حذف «${row.title}»؟ لا يمكن التراجع عن هذا الإجراء.`,
    });
    if (!ok) return;
    setBusyDeleteId(row.id);
    try {
      await adminApi.deleteGaLectureApi(row.id);
      await load();
      showToast({ type: "success", message: "تم حذف المحاضرة." });
    } catch (e) {
      await alertMessage({ title: "تعذر الحذف", message: e.message || "حدث خطأ." });
    } finally {
      setBusyDeleteId(null);
    }
  };

  return (
    <PageShell
      pageKey={PAGE_KEY}
      title="الكتب والمحاضرات"
      subtitle="مسار مستقل عن منهج الطلاب: محاضرات الجمعية العامة (رفع ملف أو رابط). إدارة الكتب غير مفعّلة هنا."
    >
      <PageToolbar pageKey={PAGE_KEY}>
        <ToolbarLink pageKey={PAGE_KEY} to={nav("library/lectures/new")}>
          + إضافة محاضرة
        </ToolbarLink>
      </PageToolbar>

      <Panel pageKey={PAGE_KEY} variant="books">
        <h3 className={`${PAGE_KEY}-section-title`}>الكتب</h3>
        <div className={`${PAGE_KEY}-empty`}>إدارة الكتب غير متاحة في واجهة الجمعية العامة.</div>
      </Panel>

      <Panel pageKey={PAGE_KEY} variant="lectures">
        <h3 className={`${PAGE_KEY}-section-title`}>المحاضرات</h3>
        {loading ? <div className={`${PAGE_KEY}-empty`}>جاري التحميل…</div> : null}
        {!loading && filteredLectures.length === 0 ? (
          <div className={`${PAGE_KEY}-empty`}>لا توجد محاضرات حتى الآن.</div>
        ) : null}
        {!loading &&
          filteredLectures.map((row) => (
            <div key={row.id} className={`${PAGE_KEY}-list-row`}>
              <div className={`${PAGE_KEY}-list-row-main`}>
                <HighlightedText
                  text={row.title}
                  className={`${PAGE_KEY}-list-title`}
                  queries={highlightQueries}
                  highlightClassName={`${PAGE_KEY}-highlight`}
                />
                <span className={`${PAGE_KEY}-list-meta`}>
                  {" "}
                  — {row.status}
                  {row.duration_label ? ` · ${row.duration_label}` : ""}
                </span>
              </div>
              <div className={`${PAGE_KEY}-row-actions`}>
                {row.video_file_url ? (
                  <a className={`${PAGE_KEY}-action-link`} href={row.video_file_url} target="_blank" rel="noopener noreferrer">
                    عرض الملف
                  </a>
                ) : null}
                {row.video_url ? (
                  <a className={`${PAGE_KEY}-action-link`} href={row.video_url} target="_blank" rel="noopener noreferrer">
                    فتح الرابط
                  </a>
                ) : null}
                <button
                  type="button"
                  className={`${PAGE_KEY}-action-btn ${PAGE_KEY}-action-btn--danger`}
                  disabled={busyDeleteId === row.id}
                  onClick={() => deleteLecture(row)}
                >
                  {busyDeleteId === row.id ? "…" : "حذف"}
                </button>
              </div>
            </div>
          ))}
      </Panel>
    </PageShell>
  );
}
