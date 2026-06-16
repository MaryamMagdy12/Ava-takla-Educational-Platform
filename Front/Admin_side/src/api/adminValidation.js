/** Client-side checks aligned with Laravel rules in controllers. */

export function validateCodePrefix(v) {
  const s = String(v || "").trim();
  if (!/^\d{4}$/.test(s)) return "4-digit prefix must be exactly 4 numbers.";
  return null;
}

/** Matches LevelTrackController: required on create; max 32; non-empty after trim. */
export function validatePermanentPasswordPrefix(v, { required = true } = {}) {
  const s = String(v ?? "").trim();
  if (!s) {
    return required ? "بادئة كلمة المرور الدائمة مطلوبة (مثال: Pa@)." : null;
  }
  if (s.length > 32) return "يجب ألا تتجاوز البادئة 32 حرفًا.";
  return null;
}

export function validateStudentEmail(email) {
  if (!email || !String(email).trim()) return null;
  const s = String(email).trim();
  if (s.length > 255) return "Email must be at most 255 characters.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return "Enter a valid email address.";
  return null;
}

/** Book upload — matches `BookController` (max size configurable on server). */
const BOOK_EXT = /\.(pdf|docx|pptx)$/i;
export function validateBookFile(file) {
  if (!file) return "PDF or document file is required.";
  if (!BOOK_EXT.test(file.name)) return "Allowed types: pdf, docx, pptx.";
  return null;
}

const LEC_AUDIO_EXT = /\.(mp3|wav|m4a)$/i;
const LEC_VIDEO_EXT = /\.(mp4|webm)$/i;

/** Lecture: file or external URL — matches `LectureController`. */
export function validateLectureFile(file, { externalUrl = "", lectureType = "video" } = {}) {
  const u = String(externalUrl || "").trim();
  if (!file && !u) return "Media file or external URL is required.";
  if (file && u) return "Use either a file or an external URL, not both.";
  if (u) {
    try {
      // eslint-disable-next-line no-new
      new URL(u);
    } catch {
      return "Enter a valid http(s) URL.";
    }
    return null;
  }
  if (lectureType === "audio") {
    if (!LEC_AUDIO_EXT.test(file.name)) return "Allowed audio types: mp3, wav, m4a.";
  } else if (!LEC_VIDEO_EXT.test(file.name)) {
    return "Allowed video types: mp4, webm.";
  }
  return null;
}

/** Convert `<input type="datetime-local">` value to ISO string for Laravel `date` rule */
export function datetimeLocalToIso(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

/** API `Y-m-d H:i:s` or ISO → `datetime-local` value (browser local) */
export function toDatetimeLocalValue(v) {
  if (!v) return "";
  const d = new Date(v);
  if (!Number.isNaN(d.getTime())) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  return String(v).replace(" ", "T").slice(0, 16);
}
