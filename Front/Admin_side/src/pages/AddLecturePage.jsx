import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/common/PageShell";
import FormCard from "../components/common/FormCard";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import { useAdminData } from "../context/AdminDataContext";
import * as adminApi from "../api/adminApi";
import { useAdminNav } from "../context/AdminNavContext";
import { sp } from "../navigation/adminPaths";
import { validateLectureFile } from "../api/adminValidation";
import "../assets/css/AddLecturePage.css";

const PAGE_KEY = "pg-lecture-new";

/** Keep in sync with `adminValidation` + `LectureController`. */
const ACCEPT_LECTURE_AUDIO = ".mp3,.wav,.m4a";
const ACCEPT_LECTURE_VIDEO = ".mp4,.webm";

function AddLecturePage() {
  const navigate = useNavigate();
  const nav = useAdminNav();
  const isSpecialLms = nav === sp;
  const { courses, tracks, refreshLectures } = useAdminData();
  const [form, setForm] = useState({
    title: "",
    course_id: courses[0]?.id ?? "",
    track_id: "",
    lecture_type: "video",
    status: "active",
    external_url: "",
  });
  const [file, setFile] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  /** 0–100 while uploading; null if browser did not report total size */
  const [uploadPercent, setUploadPercent] = useState(null);
  const uploadAbortRef = useRef(null);

  useEffect(() => {
    setForm((p) => ({
      ...p,
      course_id: p.course_id || courses[0]?.id || "",
      track_id: isSpecialLms ? "" : p.track_id || tracks[0]?.id || "",
    }));
  }, [courses, tracks, isSpecialLms]);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setErr("");
    const title = form.title.trim();
    if (!title) return setErr("عنوان المحاضرة مطلوب.");
    const course_id = Number(form.course_id);
    if (!course_id) return setErr("اختر المادة.");
    const track_id = isSpecialLms ? null : Number(form.track_id);
    if (!isSpecialLms && !track_id) return setErr("اختر المسار.");
    const fe = validateLectureFile(file, {
      externalUrl: form.external_url,
      lectureType: form.lecture_type,
    });
    if (fe) return setErr(fe);

    setBusy(true);
    setUploadPercent(0);
    uploadAbortRef.current?.abort();
    const ac = new AbortController();
    uploadAbortRef.current = ac;
    try {
      await adminApi.createLectureApi({
        title,
        course_id,
        track_id: isSpecialLms ? null : track_id,
        lecture_type: form.lecture_type,
        file,
        external_url: form.external_url,
        status: form.status,
        signal: ac.signal,
        onUploadProgress: file
          ? (pct) => {
              if (pct === null) {
                setUploadPercent(null);
              } else {
                setUploadPercent(pct);
              }
            }
          : undefined,
      });
      setUploadPercent(100);
      await refreshLectures();
      navigate(nav("library"));
    } catch (e) {
      if (e?.code === "ERR_CANCELED" || e?.name === "CanceledError") {
        setErr("");
      } else {
        setErr(e.message || "فشل رفع الملف.");
      }
    } finally {
      uploadAbortRef.current = null;
      setBusy(false);
      setUploadPercent(null);
    }
  };

  function cancelUpload() {
    uploadAbortRef.current?.abort();
  }

  return (
    <PageShell
      pageKey={PAGE_KEY}
      title="إضافة محاضرة"
      subtitle={isSpecialLms ? "أضف نوع المحاضرة وملف الوسائط مع المادة (مرتبط بالدورة دون مسار)." : "أضف نوع المحاضرة وملف الوسائط مع المادة والمسار."}
    >
      <PageToolbar pageKey={PAGE_KEY}>
        <ToolbarLink pageKey={PAGE_KEY} to={nav("library")}>
          الرجوع إلى المكتبة
        </ToolbarLink>
      </PageToolbar>

      {err ? <p className="adm-error">{err}</p> : null}

      <div className={`${PAGE_KEY}-form-shell`}>
        {busy ? (
          <div className={`${PAGE_KEY}-loading-overlay`} role="status" aria-live="polite">
            <span className={`${PAGE_KEY}-spinner`} aria-hidden="true" />
            <div className={`${PAGE_KEY}-progress-wrap`}>
              <div
                className={`${PAGE_KEY}-progress-track ${uploadPercent === null ? `${PAGE_KEY}-progress-track--indeterminate` : ""}`}
              >
                <div
                  className={`${PAGE_KEY}-progress-fill`}
                  style={
                    uploadPercent === null
                      ? undefined
                      : { width: `${Math.min(100, uploadPercent)}%` }
                  }
                />
              </div>
              <span className={`${PAGE_KEY}-loading-text`}>
                {uploadPercent === null
                  ? "جارٍ الرفع..."
                  : uploadPercent >= 100
                    ? "اكتمل الإرسال، جارٍ المعالجة..."
                    : `جارٍ الرفع… ${uploadPercent}٪`}
              </span>
              <button type="button" className={`${PAGE_KEY}-cancel-upload`} onClick={cancelUpload}>
                إيقاف الرفع
              </button>
            </div>
          </div>
        ) : null}
        <FormCard
          pageKey={PAGE_KEY}
          title="محاضرة جديدة"
          onSubmit={onSubmit}
          disabled={busy}
          submitText={busy ? "جارٍ الرفع..." : "رفع المحاضرة"}
        >
        <label className={`${PAGE_KEY}-form-label`}>
          عنوان المحاضرة
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
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className={`${PAGE_KEY}-form-label`}>
          نوع المحاضرة
          <select
            className={`${PAGE_KEY}-form-control`}
            value={form.lecture_type}
            onChange={(e) => {
              const lecture_type = e.target.value;
              setForm((p) => ({ ...p, lecture_type, external_url: "" }));
              setFile(null);
            }}
          >
            <option value="video">فيديو</option>
            <option value="audio">صوت</option>
          </select>
        </label>
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
          ملف الوسائط (أو اتركه فارغًا إذا استخدمت الرابط أدناه)
          <input
            key={form.lecture_type}
            className={`${PAGE_KEY}-form-control`}
            type="file"
            accept={form.lecture_type === "audio" ? ACCEPT_LECTURE_AUDIO : ACCEPT_LECTURE_VIDEO}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              if (e.target.files?.[0]) setForm((p) => ({ ...p, external_url: "" }));
            }}
          />
          {form.lecture_type === "audio" ? (
            <span className={`${PAGE_KEY}-form-hint`} style={{ display: "block", marginTop: 6, fontSize: "0.9em", opacity: 0.85 }}>
              تسجيلات «مسجل الصوت» في ويندوز تُحفظ غالبًا بصيغة m4a — يمكن اختيارها الآن.
            </span>
          ) : null}
        </label>
        <label className={`${PAGE_KEY}-form-label`}>
          رابط فيديو خارجي (اختياري — بدون رفع ملف)
          <input
            className={`${PAGE_KEY}-form-control`}
            type="url"
            placeholder="https://…"
            value={form.external_url}
            onChange={(e) => {
              const external_url = e.target.value;
              setForm((p) => ({ ...p, external_url }));
              if (String(external_url).trim()) setFile(null);
            }}
          />
        </label>
      </FormCard>
      </div>
    </PageShell>
  );
}

export default AddLecturePage;
