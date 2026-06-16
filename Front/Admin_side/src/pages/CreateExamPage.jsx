import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageShell from "../components/common/PageShell";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import { useAdminData } from "../context/AdminDataContext";
import * as adminApi from "../api/adminApi";
import { useAdminNav } from "../context/AdminNavContext";
import { sp } from "../navigation/adminPaths";
import { datetimeLocalToIso, toDatetimeLocalValue } from "../api/adminValidation";
import "../assets/css/CreateExamPage.css";

const PAGE_KEY = "pg-exam-new";

function CreateExamPage() {
  const navigate = useNavigate();
  const nav = useAdminNav();
  const isSpecialLms = nav === sp;
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { courses, tracks, refreshExams } = useAdminData();
  const [form, setForm] = useState({
    title: "",
    course_id: courses[0]?.id ?? "",
    track_id: "",
    duration_minutes: 30,
    question_count: 10,
    available_from: "",
    available_to: "",
    pass_mark: "",
    show_correct_answers_after_submit: false,
    easy_count: "",
    medium_count: "",
    hard_count: "",
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadErr, setLoadErr] = useState("");
  const [questionMode, setQuestionMode] = useState("manual");

  useEffect(() => {
    if (isEdit) return;
    setForm((p) => ({
      ...p,
      course_id: p.course_id || courses[0]?.id || "",
      track_id: isSpecialLms ? "" : p.track_id || tracks[0]?.id || "",
    }));
  }, [courses, tracks, isEdit, isSpecialLms]);

  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;
    (async () => {
      setLoadErr("");
      try {
        const e = await adminApi.fetchExamApi(id);
        if (cancelled) return;
        setForm({
          title: e.title ?? "",
          course_id: e.course_id ?? courses[0]?.id ?? "",
          track_id: isSpecialLms ? (e.track_id ?? "") : (e.track_id ?? tracks[0]?.id ?? ""),
          duration_minutes: e.duration_minutes ?? 30,
          question_count: e.question_count ?? 10,
          available_from: toDatetimeLocalValue(e.available_from),
          available_to: toDatetimeLocalValue(e.available_to),
          pass_mark: e.pass_mark != null ? String(e.pass_mark) : "",
          show_correct_answers_after_submit: Boolean(e.show_correct_answers_after_submit),
          easy_count: e.easy_count != null ? String(e.easy_count) : "",
          medium_count: e.medium_count != null ? String(e.medium_count) : "",
          hard_count: e.hard_count != null ? String(e.hard_count) : "",
        });
      } catch (e) {
        if (!cancelled) setLoadErr(e.message || "تعذر تحميل بيانات الامتحان.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit, courses, tracks, isSpecialLms]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setErr("");
    const title = form.title.trim();
    if (!title) return setErr("عنوان الامتحان مطلوب.");
    const course_id = Number(form.course_id);
    if (!course_id) return setErr("اختر المادة.");
    const track_id = form.track_id === "" || form.track_id == null ? null : Number(form.track_id);
    if (!isSpecialLms && !track_id) return setErr("اختر المسار.");
    const duration_minutes = Number(form.duration_minutes);
    const question_count = Number(form.question_count);
    if (!Number.isFinite(duration_minutes) || duration_minutes < 1) return setErr("يجب ألا تقل مدة الامتحان عن دقيقة واحدة.");
    if (!Number.isFinite(question_count) || question_count < 1) return setErr("يجب أن يكون عدد الأسئلة 1 على الأقل.");

    const af = datetimeLocalToIso(form.available_from);
    const at = datetimeLocalToIso(form.available_to);
    if (!af || !at) return setErr("حدد وقت بداية ونهاية الإتاحة.");
    if (new Date(at) <= new Date(af)) return setErr("يجب أن يكون وقت النهاية بعد وقت البداية.");

    const body = {
      title,
      course_id,
      track_id: isSpecialLms ? null : track_id,
      duration_minutes,
      question_count,
      available_from: af,
      available_to: at,
      show_correct_answers_after_submit: Boolean(form.show_correct_answers_after_submit),
    };
    const pm = form.pass_mark === "" ? null : Number(form.pass_mark);
    if (pm !== null) {
      if (!Number.isFinite(pm) || pm < 0 || pm > 100) return setErr("يجب أن تكون درجة النجاح بين 0 و100.");
      body.pass_mark = pm;
    }
    const ez = form.easy_count === "" ? null : Number(form.easy_count);
    const md = form.medium_count === "" ? null : Number(form.medium_count);
    const hd = form.hard_count === "" ? null : Number(form.hard_count);
    if (ez !== null) body.easy_count = ez;
    if (md !== null) body.medium_count = md;
    if (hd !== null) body.hard_count = hd;

    setBusy(true);
    try {
      if (isEdit) {
        await adminApi.updateExamApi(id, body);
      } else {
        await adminApi.createExamApi(body);
      }
      await refreshExams();
      navigate(nav("exams"));
    } catch (e) {
      setErr(e.message || "تعذر حفظ الامتحان.");
    } finally {
      setBusy(false);
    }
  };

  const shellTitle = isEdit ? "تعديل الامتحان" : "إضافة امتحان";
  const cardTitle = isEdit ? "تعديل الامتحان" : "امتحان جديد";
  const submitText = busy ? "جارٍ الحفظ..." : isEdit ? "حفظ التعديلات" : "إنشاء الامتحان";

  return (
    <PageShell
      pageKey={PAGE_KEY}
      title={shellTitle}
      subtitle={
        isSpecialLms
          ? "الحقول المطلوبة: المادة، المدة، عدد الأسئلة، ونافذة الإتاحة. (الامتحان مرتبط بالدورة دون مسار.)"
          : "الحقول المطلوبة: المادة، المسار، المدة، عدد الأسئلة، ونافذة الإتاحة."
      }
    >
      <PageToolbar pageKey={PAGE_KEY}>
        <ToolbarLink pageKey={PAGE_KEY} to={nav("exams")}>
          الرجوع إلى الامتحانات
        </ToolbarLink>
      </PageToolbar>

      {loadErr ? <p className="adm-error">{loadErr}</p> : null}
      {err ? <p className="adm-error">{err}</p> : null}

      <form className={`${PAGE_KEY}-exam-layout`} onSubmit={onSubmit}>
        <section className={`${PAGE_KEY}-exam-main`}>
          <h3 className={`${PAGE_KEY}-exam-title`}>{cardTitle}</h3>
          <div className={`${PAGE_KEY}-form-card-grid`}>
            <label className={`${PAGE_KEY}-form-label`}>
          عنوان الامتحان
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
          عدد الأسئلة
          <input
            className={`${PAGE_KEY}-form-control`}
            type="number"
            min={1}
            value={form.question_count}
            onChange={(e) => setForm((p) => ({ ...p, question_count: Number(e.target.value) }))}
          />
            </label>
            <label className={`${PAGE_KEY}-form-label`}>
          مدة الامتحان بالدقائق
          <input
            className={`${PAGE_KEY}-form-control`}
            type="number"
            min={1}
            value={form.duration_minutes}
            onChange={(e) => setForm((p) => ({ ...p, duration_minutes: Number(e.target.value) }))}
          />
            </label>
            <label className={`${PAGE_KEY}-form-label`}>
          متاح من
          <input
            className={`${PAGE_KEY}-form-control`}
            type="datetime-local"
            value={form.available_from}
            onChange={(e) => setForm((p) => ({ ...p, available_from: e.target.value }))}
          />
            </label>
            <label className={`${PAGE_KEY}-form-label`}>
          متاح إلى
          <input
            className={`${PAGE_KEY}-form-control`}
            type="datetime-local"
            value={form.available_to}
            onChange={(e) => setForm((p) => ({ ...p, available_to: e.target.value }))}
          />
            </label>
            <label className={`${PAGE_KEY}-form-label`}>
          نسبة النجاح % (اختياري)
          <input
            className={`${PAGE_KEY}-form-control`}
            type="number"
            min={0}
            max={100}
            value={form.pass_mark}
            onChange={(e) => setForm((p) => ({ ...p, pass_mark: e.target.value }))}
            placeholder="مثال: 60"
          />
            </label>
            <label className={`${PAGE_KEY}-form-label`} style={{ gridColumn: "1 / -1" }}>
          <input
            type="checkbox"
            checked={Boolean(form.show_correct_answers_after_submit)}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                show_correct_answers_after_submit: e.target.checked,
              }))
            }
            style={{ marginInlineEnd: 8 }}
          />
          إظهار الإجابات الصحيحة للطالب بعد تسليم الامتحان
            </label>
            <p style={{ gridColumn: "1 / -1", fontSize: "0.9rem", opacity: 0.85 }}>
          توزيع مستويات الصعوبة اختياري، وإذا تم تحديده فسيُستخدم عند اختيار الأسئلة:
            </p>
            <label className={`${PAGE_KEY}-form-label`}>
          عدد السهل
          <input
            className={`${PAGE_KEY}-form-control`}
            type="number"
            min={0}
            value={form.easy_count}
            onChange={(e) => setForm((p) => ({ ...p, easy_count: e.target.value }))}
          />
            </label>
            <label className={`${PAGE_KEY}-form-label`}>
          عدد المتوسط
          <input
            className={`${PAGE_KEY}-form-control`}
            type="number"
            min={0}
            value={form.medium_count}
            onChange={(e) => setForm((p) => ({ ...p, medium_count: e.target.value }))}
          />
            </label>
            <label className={`${PAGE_KEY}-form-label`}>
          عدد الصعب
          <input
            className={`${PAGE_KEY}-form-control`}
            type="number"
            min={0}
            value={form.hard_count}
            onChange={(e) => setForm((p) => ({ ...p, hard_count: e.target.value }))}
          />
            </label>
          </div>
          <div className={`${PAGE_KEY}-exam-question-mode`}>
            <strong>اختيار الأسئلة</strong>
            <label>
              <input type="radio" name="questionMode" value="manual" checked={questionMode === "manual"} onChange={(e) => setQuestionMode(e.target.value)} />
              يدوي
            </label>
            <label>
              <input type="radio" name="questionMode" value="random" checked={questionMode === "random"} onChange={(e) => setQuestionMode(e.target.value)} />
              عشوائي من بنك الأسئلة
            </label>
          </div>
        </section>
        <aside className={`${PAGE_KEY}-exam-summary`}>
          <h4>ملخص الامتحان</h4>
          <p>عدد الأسئلة: {form.question_count || 0}</p>
          <p>الدرجة: {(Number(form.pass_mark) || 0) > 0 ? `${form.pass_mark}% نجاح` : "غير محددة"}</p>
          <p>المدة: {form.duration_minutes || 0} دقيقة</p>
          <p>من: {form.available_from || "—"}</p>
          <p>إلى: {form.available_to || "—"}</p>
          <button type="submit" className={`${PAGE_KEY}-form-card-submit`}>
            {submitText}
          </button>
        </aside>
      </form>
    </PageShell>
  );
}

export default CreateExamPage;
