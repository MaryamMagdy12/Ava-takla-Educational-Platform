import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/common/PageShell";
import FormCard from "../components/common/FormCard";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import { useAdminData } from "../context/AdminDataContext";
import * as adminApi from "../api/adminApi";
import { useAdminNav } from "../context/AdminNavContext";
import { sp } from "../navigation/adminPaths";
import { validateBookFile } from "../api/adminValidation";
import "../assets/css/AddBookPage.css";

const PAGE_KEY = "pg-book-new";

function AddBookPage() {
  const navigate = useNavigate();
  const nav = useAdminNav();
  const isSpecialLms = nav === sp;
  const { courses, tracks, refreshBooks } = useAdminData();
  const [form, setForm] = useState({
    title: "",
    course_id: courses[0]?.id ?? "",
    track_id: "",
    status: "active",
  });
  const [file, setFile] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm((p) => ({
      ...p,
      course_id: p.course_id || courses[0]?.id || "",
      track_id: isSpecialLms ? "" : p.track_id || tracks[0]?.id || "",
    }));
  }, [courses, tracks, isSpecialLms]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setErr("");
    const title = form.title.trim();
    if (!title) return setErr("عنوان الكتاب مطلوب.");
    const course_id = Number(form.course_id);
    if (!course_id) return setErr("اختر المادة.");
    const track_id = isSpecialLms ? null : Number(form.track_id);
    if (!isSpecialLms && !track_id) return setErr("اختر المسار.");
    const fe = validateBookFile(file);
    if (fe) return setErr(fe);

    setBusy(true);
    try {
      await adminApi.createBookApi({
        title,
        course_id,
        track_id: isSpecialLms ? null : track_id,
        file,
        status: form.status,
      });
      await refreshBooks();
      navigate(nav("library"));
    } catch (e) {
      setErr(e.message || "فشل رفع الملف.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell
      pageKey={PAGE_KEY}
      title="إضافة كتاب"
      subtitle={isSpecialLms ? "رفع كتاب مع العنوان والمادة والملف (مرتبط بالدورة دون مسار)." : "رفع كتاب مع العنوان والمادة والمسار والملف."}
    >
      <PageToolbar pageKey={PAGE_KEY}>
        <ToolbarLink pageKey={PAGE_KEY} to={nav("library")}>
          الرجوع إلى المكتبة
        </ToolbarLink>
      </PageToolbar>

      {err ? <p className="adm-error">{err}</p> : null}

      <FormCard pageKey={PAGE_KEY} title="كتاب جديد" onSubmit={onSubmit} submitText={busy ? "جارٍ الرفع..." : "رفع الكتاب"}>
        <label className={`${PAGE_KEY}-form-label`}>
          عنوان الكتاب
          <input
            className={`${PAGE_KEY}-form-control`}
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            required
          />
        </label>
        <label className={`${PAGE_KEY}-form-label`}>
          المادة
          <select
            className={`${PAGE_KEY}-form-control`}
            value={form.course_id}
            onChange={(e) => setForm((p) => ({ ...p, course_id: Number(e.target.value) }))}
          >
            {courses.length === 0 ? <option value="">لا توجد مواد في قاعدة البيانات</option> : null}
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {!isSpecialLms ? (
          <label className={`${PAGE_KEY}-form-label`}>
            المسار
            <select
              className={`${PAGE_KEY}-form-control`}
              value={form.track_id}
              onChange={(e) => setForm((p) => ({ ...p, track_id: Number(e.target.value) }))}
            >
              {tracks.length === 0 ? <option value="">لا توجد مسارات في قاعدة البيانات</option> : null}
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className={`${PAGE_KEY}-form-label`}>
          الحالة
          <select
            className={`${PAGE_KEY}-form-control`}
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
          >
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
          </select>
        </label>
        <label className={`${PAGE_KEY}-form-label`}>
          الملف
          <input
            className={`${PAGE_KEY}-form-control`}
            type="file"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.zip"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </FormCard>
    </PageShell>
  );
}

export default AddBookPage;
