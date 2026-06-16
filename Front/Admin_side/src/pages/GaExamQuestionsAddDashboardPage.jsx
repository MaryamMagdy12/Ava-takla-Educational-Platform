import { useEffect, useState } from "react";
import PageShell from "../components/common/PageShell";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import FormCard from "../components/common/FormCard";
import { useDialog } from "../components/common/DialogProvider";
import { useToast } from "../components/common/ToastProvider";
import * as adminApi from "../api/adminApi";
import { ga } from "../navigation/adminPaths";
import "../assets/css/AddQuestionPage.css";

const PAGE_KEY = "pg-question-new";

export default function GaExamQuestionsAddDashboardPage() {
  const { confirm } = useDialog();
  const { showToast } = useToast();
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [qText, setQText] = useState("");
  const [qTestament, setQTestament] = useState("old");
  const [qChapter, setQChapter] = useState(1);
  const [qDifficulty, setQDifficulty] = useState("");
  const [correctOptionIndex, setCorrectOptionIndex] = useState("0");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [feedbackCorrect, setFeedbackCorrect] = useState("");
  const [feedbackWrong, setFeedbackWrong] = useState("");
  const [submitMode, setSubmitMode] = useState("save");

  useEffect(() => {
    setErr("");
  }, []);

  const isQuestionSettingsReady = Boolean(qTestament && Number(qChapter) > 0);
  const canImportQuestions = Boolean(isQuestionSettingsReady && importFile && !importing);

  function updateOption(index, value) {
    setOptions((prev) => prev.map((x, i) => (i === index ? value : x)));
  }

  function resetQuestionForm() {
    setQText("");
    setQTestament("old");
    setQChapter(1);
    setQDifficulty("");
    setCorrectOptionIndex("0");
    setOptions(["", "", "", ""]);
    setFeedbackCorrect("");
    setFeedbackWrong("");
  }

  async function onAddQuestion(e) {
    e.preventDefault();
    const trimmedOptions = options.map((x) => x.trim());
    if (!qText.trim() || trimmedOptions.some((x) => !x)) {
      setErr("يرجى تعبئة نص السؤال وجميع الاختيارات.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const created = await adminApi.createGaFamilyExamQuestionBankQuestionApi({
        question_text: qText.trim(),
        testament_type: qTestament,
        chapter_number: Number(qChapter),
        difficulty: qDifficulty || null,
        feedback_correct: feedbackCorrect.trim() || null,
        feedback_wrong: feedbackWrong.trim() || null,
      });
      for (let i = 0; i < trimmedOptions.length; i += 1) {
        await adminApi.createGaFamilyExamQuestionBankOptionApi(created.id, {
          option_text: trimmedOptions[i],
          is_correct: i === Number(correctOptionIndex),
        });
      }
      if (submitMode === "save-add") {
        resetQuestionForm();
      }
      showToast({ type: "success", message: "تمت إضافة السؤال بنجاح." });
    } catch (e2) {
      setErr(e2.message || "تعذر إضافة السؤال.");
    } finally {
      setSaving(false);
    }
  }

  async function onImportQuestions(e) {
    e.preventDefault();
    if (!canImportQuestions) {
      return;
    }
    setErr("");
    const ok = await confirm({
      title: "استيراد أسئلة بنك الامتحان",
      message: "هل تريد تأكيد استيراد ملف Excel إلى بنك أسئلة امتحانات العائلات؟",
    });
    if (!ok) return;
    setImporting(true);
    try {
      const res = await adminApi.importGaFamilyExamQuestionBankQuestionsApi(importFile);
      setImportFile(null);
      showToast({
        type: "success",
        message: res?.errors?.length
          ? `تم استيراد ${res.created ?? 0} سؤال مع ${res.errors.length} أخطاء صفوف.`
          : `تم استيراد ${res?.created ?? 0} سؤال بنجاح.`,
      });
    } catch (e2) {
      setErr(e2.message || "تعذر استيراد ملف الأسئلة.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <PageShell pageKey={PAGE_KEY} title="إضافة أسئلة الامتحانات" subtitle="لوحة منفصلة لإضافة أسئلة امتحانات العائلات.">
      <PageToolbar pageKey={PAGE_KEY}>
        <ToolbarLink pageKey={PAGE_KEY} to={ga("family-exams/questions-view-dashboard")} variant="secondary">
          عرض/تعديل الأسئلة
        </ToolbarLink>
      </PageToolbar>
      {err ? <p className="adm-error">{err}</p> : null}
      <p style={{ marginTop: 0, marginBottom: 12, color: "#666" }}>
        تتم إضافة الأسئلة الآن مباشرة في بنك أسئلة امتحانات العائلات، بدون ربطها بامتحان محدد.
      </p>

      <form className={`${PAGE_KEY}-editor`} onSubmit={onAddQuestion}>
        <fieldset
          disabled={saving}
          style={{ border: "none", margin: 0, padding: 0, minWidth: 0, display: "contents" }}
        >
          <div className={`${PAGE_KEY}-editor-main`}>
            <h3 className={`${PAGE_KEY}-editor-title`}>سؤال جديد</h3>
            <label className={`${PAGE_KEY}-form-label ${PAGE_KEY}-full`}>
              نص السؤال
              <textarea className={`${PAGE_KEY}-form-control`} rows={3} value={qText} onChange={(e) => setQText(e.target.value)} required />
            </label>
            {options.map((opt, idx) => {
              const letter = String.fromCharCode(65 + idx);
              const isCorrect = Number(correctOptionIndex) === idx;
              return (
                <label key={letter} className={`${PAGE_KEY}-form-label ${isCorrect ? `${PAGE_KEY}-answer-correct` : ""}`}>
                  الإجابة {letter}
                  <input className={`${PAGE_KEY}-form-control`} value={opt} onChange={(e) => updateOption(idx, e.target.value)} required />
                </label>
              );
            })}
            <label className={`${PAGE_KEY}-form-label`}>
              تحديد الإجابة الصحيحة
              <select className={`${PAGE_KEY}-form-control`} value={correctOptionIndex} onChange={(e) => setCorrectOptionIndex(e.target.value)}>
                <option value="0">A</option>
                <option value="1">B</option>
                <option value="2">C</option>
                <option value="3">D</option>
              </select>
            </label>
            <label className={`${PAGE_KEY}-form-label`}>
              ملاحظة/شرح للإجابة الصحيحة
              <input className={`${PAGE_KEY}-form-control`} value={feedbackCorrect} onChange={(e) => setFeedbackCorrect(e.target.value)} />
            </label>
            <label className={`${PAGE_KEY}-form-label ${PAGE_KEY}-full`}>
              ملاحظة للإجابة الخاطئة
              <input className={`${PAGE_KEY}-form-control`} value={feedbackWrong} onChange={(e) => setFeedbackWrong(e.target.value)} />
            </label>
          </div>

          <aside className={`${PAGE_KEY}-editor-side`}>
            <h4>إعدادات السؤال</h4>
            <label className={`${PAGE_KEY}-form-label`}>
              العهد
              <select className={`${PAGE_KEY}-form-control`} value={qTestament} onChange={(e) => setQTestament(e.target.value)}>
                <option value="old">عهد قديم</option>
                <option value="new">عهد جديد</option>
              </select>
            </label>
            <label className={`${PAGE_KEY}-form-label`}>
              الأصحاح
              <input className={`${PAGE_KEY}-form-control`} type="number" min={1} value={qChapter} onChange={(e) => setQChapter(e.target.value)} />
            </label>
            <label className={`${PAGE_KEY}-form-label`}>
              مستوى الصعوبة
              <select className={`${PAGE_KEY}-form-control`} value={qDifficulty} onChange={(e) => setQDifficulty(e.target.value)}>
                <option value="">بدون</option>
                <option value="easy">سهل</option>
                <option value="medium">متوسط</option>
                <option value="hard">صعب</option>
              </select>
            </label>
            <div className={`${PAGE_KEY}-editor-actions`}>
              <button type="submit" className={`${PAGE_KEY}-form-card-submit`} disabled={saving} onClick={() => setSubmitMode("save")}>
                {saving ? "جارٍ الحفظ..." : "حفظ السؤال"}
              </button>
              <button type="submit" className={`${PAGE_KEY}-secondary-btn`} disabled={saving} onClick={() => setSubmitMode("save-add")}>
                حفظ وإضافة غيره
              </button>
            </div>
          </aside>
        </fieldset>
      </form>

      <FormCard
        pageKey={PAGE_KEY}
        title="استيراد أسئلة من Excel"
        onSubmit={onImportQuestions}
        submitText={importing ? "جاري الاستيراد..." : "رفع واستيراد"}
        fieldsetDisabled={importing}
        submitDisabled={!canImportQuestions}
      >
        <label className={`${PAGE_KEY}-form-label ${PAGE_KEY}-full`}>
          اختر ملف Excel
          <input
            className={`${PAGE_KEY}-form-control`}
            type="file"
            accept=".xlsx,.csv,.txt,.ods"
            disabled={importing}
            onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {!isQuestionSettingsReady ? <p className="adm-muted">أكمل إعدادات السؤال (العهد + رقم الأصحاح) لتفعيل الاستيراد.</p> : null}
      </FormCard>
    </PageShell>
  );
}
