import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageShell from "../components/common/PageShell";
import FormCard from "../components/common/FormCard";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import { useAdminData } from "../context/AdminDataContext";
import * as adminApi from "../api/adminApi";
import { useAdminNav } from "../context/AdminNavContext";
import { sp } from "../navigation/adminPaths";
import { useToast } from "../components/common/ToastProvider";
import { useDialog } from "../components/common/DialogProvider";
import "../assets/css/AddQuestionPage.css";

const PAGE_KEY = "pg-question-new";

const LETTERS = ["A", "B", "C", "D"];

const emptyForm = () => ({
  text: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  answer: "A",
  difficulty: "easy",
  course_id: "",
  track_id: "",
  feedbackCorrect: "",
  feedbackIncorrect: "",
});

function formatImportErrors(errors) {
  if (!Array.isArray(errors) || errors.length === 0) return "";
  const visibleErrors = errors.slice(0, 10).map((item) => `Row ${item.row}: ${item.message}`);
  const remaining = errors.length - visibleErrors.length;

  return [
    ...visibleErrors,
    remaining > 0 ? `... and ${remaining} more issue(s).` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function optionsToFormFields(options) {
  const sorted = [...(options || [])].sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  const fields = { optionA: "", optionB: "", optionC: "", optionD: "", answer: "A" };
  sorted.slice(0, 4).forEach((opt, i) => {
    const key = `option${LETTERS[i]}`;
    fields[key] = opt.option_text ?? "";
    if (opt.is_correct) fields.answer = LETTERS[i];
  });
  return fields;
}

function AddQuestionPage() {
  const navigate = useNavigate();
  const nav = useAdminNav();
  const isSpecialLms = nav === sp;
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { courses, tracks, refreshQuestions } = useAdminData();
  const { showToast } = useToast();
  const { alertMessage } = useDialog();
  const [form, setForm] = useState(() => {
    const f = emptyForm();
    f.course_id = courses[0]?.id ?? "";
    f.track_id = isSpecialLms ? "" : tracks[0]?.id ?? "";
    return f;
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadErr, setLoadErr] = useState("");
  const [submitMode, setSubmitMode] = useState("save");

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
        const q = await adminApi.fetchQuestionApi(id);
        if (cancelled) return;
        const optFields = optionsToFormFields(q.options);
        setForm({
          text: q.question_text ?? "",
          ...optFields,
          difficulty: q.difficulty ?? "easy",
          course_id: q.course_id ?? courses[0]?.id ?? "",
          track_id: isSpecialLms ? (q.track_id ?? "") : (q.track_id ?? tracks[0]?.id ?? ""),
          feedbackCorrect: q.feedback_correct ?? "",
          feedbackIncorrect: q.feedback_wrong ?? "",
        });
      } catch (e) {
        if (!cancelled) setLoadErr(e.message || "تعذر تحميل السؤال.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit, courses, tracks, isSpecialLms]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setErr("");
    const question_text = form.text.trim();
    if (!question_text) return setErr("نص السؤال مطلوب.");
    const course_id = Number(form.course_id);
    if (!course_id) return setErr("اختر المادة.");
    const track_id = isSpecialLms ? null : Number(form.track_id);
    if (!isSpecialLms && !track_id) return setErr("اختر المسار.");

    const opts = [
      { option_text: form.optionA.trim(), is_correct: form.answer === "A" },
      { option_text: form.optionB.trim(), is_correct: form.answer === "B" },
      { option_text: form.optionC.trim(), is_correct: form.answer === "C" },
      { option_text: form.optionD.trim(), is_correct: form.answer === "D" },
    ].filter((o) => o.option_text.length > 0);

    if (opts.length < 2) return setErr("يجب إدخال خيارين غير فارغين على الأقل.");
    const correctCount = opts.filter((o) => o.is_correct).length;
    if (correctCount !== 1) return setErr("يجب تحديد خيار صحيح واحد فقط.");

    setBusy(true);
    try {
      const payload = {
        course_id,
        track_id: isSpecialLms ? null : track_id,
        question_text,
        question_type: "mcq",
        difficulty: form.difficulty,
        feedback_correct: form.feedbackCorrect.trim() || null,
        feedback_wrong: form.feedbackIncorrect.trim() || null,
        status: "active",
        options: opts,
      };
      if (isEdit) {
        await adminApi.updateQuestionApi(id, payload);
      } else {
        await adminApi.createQuestionApi(payload);
      }
      showToast({ type: "success", message: isEdit ? "تم تحديث السؤال." : "تم إنشاء السؤال." });
      await refreshQuestions();
      if (!isEdit && submitMode === "save-add") {
        const f = emptyForm();
        f.course_id = form.course_id;
        f.track_id = isSpecialLms ? "" : form.track_id;
        setForm(f);
      } else {
        navigate(nav("question-bank"));
      }
    } catch (e) {
      setErr(e.message || "تعذر حفظ السؤال.");
    } finally {
      setBusy(false);
    }
  };

  const shellTitle = isEdit ? "تعديل السؤال" : "إضافة سؤال";
  const cardTitle = isEdit ? "تعديل السؤال" : "سؤال جديد";
  const submitText = busy ? "جارٍ الحفظ..." : isEdit ? "حفظ التعديلات" : "حفظ السؤال";

  return (
    <PageShell pageKey={PAGE_KEY} title={shellTitle} subtitle="سؤال اختيار من متعدد مع خيار صحيح واحد فقط.">
      <PageToolbar pageKey={PAGE_KEY}>
        <ToolbarLink pageKey={PAGE_KEY} to={nav("question-bank")}>
          الرجوع إلى بنك الأسئلة
        </ToolbarLink>
      </PageToolbar>

      {loadErr ? <p className="adm-error">{loadErr}</p> : null}
      {err ? <p className="adm-error">{err}</p> : null}

      <form className={`${PAGE_KEY}-editor`} onSubmit={onSubmit}>
        <div className={`${PAGE_KEY}-editor-main`}>
          <h3 className={`${PAGE_KEY}-editor-title`}>{cardTitle}</h3>
          <label className={`${PAGE_KEY}-form-label ${PAGE_KEY}-full`}>
            نص السؤال
            <input
              type="text"
              className={`${PAGE_KEY}-form-control ${PAGE_KEY}-question-input`}
              value={form.text}
              onChange={(e) => setForm((p) => ({ ...p, text: e.target.value }))}
              required
              autoComplete="off"
            />
          </label>
          {["A", "B", "C", "D"].map((letter) => {
            const key = `option${letter}`;
            const isCorrect = form.answer === letter;
            return (
              <label key={letter} className={`${PAGE_KEY}-form-label ${isCorrect ? `${PAGE_KEY}-answer-correct` : ""}`}>
                {`الإجابة ${letter}`}
                <input
                  className={`${PAGE_KEY}-form-control`}
                  value={form[key]}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                />
              </label>
            );
          })}
          <label className={`${PAGE_KEY}-form-label`}>
            تحديد الإجابة الصحيحة
            <select className={`${PAGE_KEY}-form-control`} value={form.answer} onChange={(e) => setForm((p) => ({ ...p, answer: e.target.value }))}>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
            </select>
          </label>
          <label className={`${PAGE_KEY}-form-label`}>
            ملاحظة/شرح للإجابة الصحيحة
            <input className={`${PAGE_KEY}-form-control`} value={form.feedbackCorrect} onChange={(e) => setForm((p) => ({ ...p, feedbackCorrect: e.target.value }))} />
          </label>
          <label className={`${PAGE_KEY}-form-label ${PAGE_KEY}-full`}>
            ملاحظة للإجابة الخاطئة
            <input className={`${PAGE_KEY}-form-control`} value={form.feedbackIncorrect} onChange={(e) => setForm((p) => ({ ...p, feedbackIncorrect: e.target.value }))} />
          </label>
        </div>

        <aside className={`${PAGE_KEY}-editor-side`}>
          <h4>إعدادات السؤال</h4>
          <label className={`${PAGE_KEY}-form-label`}>
            المادة
            <select className={`${PAGE_KEY}-form-control`} value={form.course_id} onChange={(e) => setForm((p) => ({ ...p, course_id: Number(e.target.value) }))}>
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
              <select className={`${PAGE_KEY}-form-control`} value={form.track_id} onChange={(e) => setForm((p) => ({ ...p, track_id: Number(e.target.value) }))}>
                {tracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className={`${PAGE_KEY}-form-label`}>
            مستوى الصعوبة
            <select className={`${PAGE_KEY}-form-control`} value={form.difficulty} onChange={(e) => setForm((p) => ({ ...p, difficulty: e.target.value }))}>
              <option value="easy">سهل</option>
              <option value="medium">متوسط</option>
              <option value="hard">صعب</option>
            </select>
          </label>
          <div className={`${PAGE_KEY}-editor-actions`}>
            <button type="submit" className={`${PAGE_KEY}-form-card-submit`} onClick={() => setSubmitMode("save")}>
              {submitText}
            </button>
            {!isEdit ? (
              <button type="submit" className={`${PAGE_KEY}-secondary-btn`} onClick={() => setSubmitMode("save-add")}>
                حفظ وإضافة غيره
              </button>
            ) : null}
          </div>
        </aside>
      </form>

      {/* Bulk import section */}
      <FormCard
        pageKey={PAGE_KEY}
        title="استيراد الأسئلة من ملف"
        onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const file = formData.get("file");
          const courseId = Number(formData.get("course_id"));
          const trackRaw = formData.get("track_id");
          const trackId = trackRaw === "" || trackRaw == null ? null : Number(trackRaw);
          const difficulty = formData.get("difficulty") || "";
          if (!file || !(file instanceof File)) {
            showToast({ type: "error", message: "اختر ملف CSV أو XLSX أولًا." });
            return;
          }
          if (!courseId || (!isSpecialLms && !trackId)) {
            showToast({ type: "error", message: isSpecialLms ? "اختر المادة للأسئلة المستوردة." : "اختر المادة والمسار للأسئلة المستوردة." });
            return;
          }
          try {
            const result = await adminApi.importQuestionsForCourseTrack({
              course_id: courseId,
              track_id: trackId,
              difficulty: difficulty || undefined,
              status: "active",
              file,
            });
            showToast({
              type: "success",
              message: `تم استيراد ${result.created} سؤال. يوجد ${result.errors.length} صفًا به مشكلات.`,
            });
            if (result.errors?.length) {
              await alertMessage({
                title: "Import problems",
                message: formatImportErrors(result.errors),
                confirmText: "Close",
              });
            }
            await refreshQuestions();
          } catch (e2) {
            showToast({ type: "error", message: e2.message || "فشل الاستيراد." });
          }
        }}
        submitText="استيراد الملف"
      >
        <label className={`${PAGE_KEY}-form-label`}>
          المادة لجميع الأسئلة
          <select className={`${PAGE_KEY}-form-control`} name="course_id" defaultValue={courses[0]?.id ?? ""}>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {!isSpecialLms ? (
          <label className={`${PAGE_KEY}-form-label`}>
            المسار لجميع الأسئلة
            <select className={`${PAGE_KEY}-form-control`} name="track_id" defaultValue={tracks[0]?.id ?? ""}>
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <input type="hidden" name="track_id" value="" />
        )}
        <label className={`${PAGE_KEY}-form-label`}>
          مستوى الصعوبة الافتراضي
          <select className={`${PAGE_KEY}-form-control`} name="difficulty" defaultValue="easy">
            <option value="easy">سهل</option>
            <option value="medium">متوسط</option>
            <option value="hard">صعب</option>
            <option value="">متنوع</option>
          </select>
        </label>
        <label className={`${PAGE_KEY}-form-label`}>
          ملف الأسئلة (csv / xlsx)
          <input className={`${PAGE_KEY}-form-control`} type="file" name="file" accept=".csv,.xlsx,.txt" />
        </label>
      </FormCard>
    </PageShell>
  );
}

export default AddQuestionPage;
