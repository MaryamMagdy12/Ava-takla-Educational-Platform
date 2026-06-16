import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/common/PageShell";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import FormCard from "../components/common/FormCard";
import * as adminApi from "../api/adminApi";
import { ga } from "../navigation/adminPaths";
import "./GaAddLecturePage.css";

const PAGE_KEY = "pg-ga-lectures-manage";

export default function GaAddLecturePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const uploadAbortRef = useRef(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    summary: "",
    video_url: "",
    duration_label: "",
    sort_order: "0",
    status: "draft",
  });
  const [videoFile, setVideoFile] = useState(null);
  const [uploadPct, setUploadPct] = useState(null);

  function clearFile() {
    setVideoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function onCreate(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setBusy(true);
    setErr("");
    setUploadPct(null);
    uploadAbortRef.current?.abort();
    const ac = new AbortController();
    uploadAbortRef.current = ac;
    try {
      const payload = {
        title: form.title.trim(),
        summary: form.summary.trim() || null,
        video_url: form.video_url.trim() || null,
        duration_label: form.duration_label.trim() || null,
        sort_order: form.sort_order === "" ? 0 : Number(form.sort_order),
        status: form.status,
      };
      if (videoFile) {
        payload.video = videoFile;
      }
      await adminApi.createGaLectureApi(payload, (pct) => setUploadPct(pct), ac.signal);
      navigate(ga("library"), { replace: true });
    } catch (e2) {
      if (e2?.code === "ERR_CANCELED" || e2?.name === "CanceledError") {
        setErr("");
      } else {
        setErr(e2.message || "فشل الإنشاء");
      }
    } finally {
      uploadAbortRef.current = null;
      setBusy(false);
      setUploadPct(null);
    }
  }

  function cancelUpload() {
    uploadAbortRef.current?.abort();
  }

  const pctKnown = typeof uploadPct === "number";
  const loaderStatusText = (() => {
    if (videoFile) {
      if (pctKnown) return `جارٍ الرفع… ${Math.round(uploadPct)}%`;
      return "جارٍ الرفع…";
    }
    if (pctKnown) return `جارٍ الحفظ… ${Math.round(uploadPct)}%`;
    return "جارٍ الحفظ…";
  })();

  const uploadOverlay = busy
    ? createPortal(
        <div className="ga-lecture-upload-overlay" role="presentation">
          <div className="ga-lecture-upload-modal" role="status" aria-live="polite" aria-busy="true">
            <div className="ga-lecture-upload-modal__spinner" aria-hidden />
            {videoFile ? (
              <div className="ga-lecture-upload-modal__track" aria-hidden>
                <div
                  className={`ga-lecture-upload-modal__bar${pctKnown ? " ga-lecture-upload-modal__bar--solid" : " ga-lecture-upload-modal__bar--indeterminate"}`}
                  style={pctKnown ? { width: `${Math.min(100, Math.max(0, uploadPct))}%` } : undefined}
                />
              </div>
            ) : (
              <div className="ga-lecture-upload-modal__track" aria-hidden>
                <div className="ga-lecture-upload-modal__bar ga-lecture-upload-modal__bar--indeterminate" />
              </div>
            )}
            <p className="ga-lecture-upload-modal__status">{loaderStatusText}</p>
            <button type="button" className="ga-lecture-upload-modal__cancel" onClick={cancelUpload}>
              إيقاف الرفع
            </button>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <PageShell
      pageKey={PAGE_KEY}
      title="إضافة محاضرة"
      subtitle="أضف عنوان المحاضرة والملخص وملف الوسائط أو الرابط. المحتوى يُسجَّل لمحاضرات الجمعية العامة فقط."
    >
      <PageToolbar pageKey={PAGE_KEY}>
        <ToolbarLink pageKey={PAGE_KEY} to={ga("library")} variant="primary">
          الرجوع إلى المكتبة
        </ToolbarLink>
        <ToolbarLink pageKey={PAGE_KEY} to={ga()}>
          لوحة الجمعية
        </ToolbarLink>
      </PageToolbar>
      {err ? <p className="adm-error">{err}</p> : null}
      {uploadOverlay}

      <div className={`${PAGE_KEY}-form-shell`}>
        <FormCard
          pageKey={PAGE_KEY}
          title="محاضرة جديدة"
          onSubmit={onCreate}
          disabled={busy}
          submitText={busy ? "جارٍ الرفع..." : "رفع المحاضرة"}
        >
          <label className={`${PAGE_KEY}-form-label`}>
            عنوان المحاضرة
            <input
              className={`${PAGE_KEY}-form-control`}
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </label>
          <label className={`${PAGE_KEY}-form-label`}>
            الحالة
            <select
              className={`${PAGE_KEY}-form-control`}
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="draft">مسودة</option>
              <option value="published">منشورة</option>
              <option value="archived">مؤرشفة</option>
            </select>
          </label>
          <label className={`${PAGE_KEY}-form-label`}>
            ترتيب العرض
            <input
              className={`${PAGE_KEY}-form-control`}
              type="number"
              min={0}
              value={form.sort_order}
              onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
            />
          </label>
          <label className={`${PAGE_KEY}-form-label`}>
            مدة العرض (نص اختياري)
            <input
              className={`${PAGE_KEY}-form-control`}
              value={form.duration_label}
              onChange={(e) => setForm((f) => ({ ...f, duration_label: e.target.value }))}
              placeholder="مثال: ٢٥ دقيقة"
            />
          </label>
          <label className={`${PAGE_KEY}-form-label`} style={{ gridColumn: "1 / -1" }}>
            أو رابط فيديو خارجي
            <input
              className={`${PAGE_KEY}-form-control`}
              type="url"
              placeholder="https://…"
              value={form.video_url}
              onChange={(e) => setForm((f) => ({ ...f, video_url: e.target.value }))}
            />
          </label>
          <label className={`${PAGE_KEY}-form-label`} style={{ gridColumn: "1 / -1" }}>
            ملخص
            <textarea
              className={`${PAGE_KEY}-form-control`}
              rows={4}
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
            />
          </label>
          <div className={`${PAGE_KEY}-form-label ga-lecture-file-grid-cell`} style={{ gridColumn: "1 / -1" }}>
            <span>ملف فيديو أو صوت (اختياري)</span>
            <input
              ref={fileInputRef}
              className="ga-lecture-file-input"
              type="file"
              accept="video/*,audio/*,.mp3,.mp4,.m4a,.webm,.mov,.mkv,.wav,.ogg"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setVideoFile(f);
              }}
            />
            <div className="ga-lecture-file-row">
              <div className="ga-lecture-file-actions">
                <button type="button" className="ga-lecture-file-trigger" onClick={() => fileInputRef.current?.click()}>
                  اختيار ملف
                </button>
                {videoFile ? (
                  <button type="button" className="ga-lecture-file-clear" onClick={clearFile}>
                    إزالة الملف
                  </button>
                ) : null}
              </div>
              {videoFile ? <span className="ga-lecture-file-name">{videoFile.name}</span> : null}
            </div>
          </div>
        </FormCard>
      </div>
    </PageShell>
  );
}
