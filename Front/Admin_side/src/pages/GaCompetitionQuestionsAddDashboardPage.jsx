import { useEffect, useMemo, useState } from "react";
import PageShell from "../components/common/PageShell";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import FormCard from "../components/common/FormCard";
import { useDialog } from "../components/common/DialogProvider";
import { useToast } from "../components/common/ToastProvider";
import * as adminApi from "../api/adminApi";
import { ga } from "../navigation/adminPaths";
import "../assets/css/AddQuestionPage.css";

const PAGE_KEY = "pg-question-new";

export default function GaCompetitionQuestionsAddDashboardPage() {
  const [parts, setParts] = useState([]);
  const [selectedPartId, setSelectedPartId] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [newTestament, setNewTestament] = useState("old");
  const [newChapter, setNewChapter] = useState(1);
  const [option1, setOption1] = useState("");
  const [option2, setOption2] = useState("");
  const [option3, setOption3] = useState("");
  const [option4, setOption4] = useState("");
  const [correctIndex, setCorrectIndex] = useState("1");
  const [importFile, setImportFile] = useState(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [feedbackCorrect, setFeedbackCorrect] = useState("");
  const [feedbackWrong, setFeedbackWrong] = useState("");
  const [submitMode, setSubmitMode] = useState("save");
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const { confirm } = useDialog();
  const { showToast } = useToast();

  useEffect(() => {
    adminApi
      .fetchGaCompetitionBankPartsApi()
      .then((rows) => {
        const p = Array.isArray(rows) ? rows : [];
        setParts(p);
        if (p.length > 0) setSelectedPartId(String(p[0].id));
      })
      .catch((e) => setErr(e.message || "Failed to load parts."));
  }, []);

  const options = useMemo(() => [option1, option2, option3, option4].map((x) => x.trim()), [option1, option2, option3, option4]);
  const isCompetitionCustomizationReady = Boolean(selectedPartId);
  const canImportQuestions = Boolean(isCompetitionCustomizationReady && importFile && !importing);

  async function createQuestion(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    if (!selectedPartId || !newQuestion.trim()) return;

    const nonEmptyOptions = options.filter(Boolean);
    if (nonEmptyOptions.length < 2) {
      setErr("Please enter at least 2 options.");
      return;
    }
    const cIdx = Number(correctIndex) - 1;
    if (!options[cIdx]) {
      setErr("Correct option index must point to a filled option.");
      return;
    }

    setSaving(true);
    try {
      const created = await adminApi.createGaCompetitionBankQuestionApi({
        ga_competition_part_bank_id: Number(selectedPartId),
        question_text: newQuestion.trim(),
        question_type: "mcq",
        testament_type: newTestament,
        chapter_number: Number(newChapter),
      });

      for (let i = 0; i < options.length; i += 1) {
        if (!options[i]) continue;
        await adminApi.createGaCompetitionBankOptionApi(created.id, {
          option_text: options[i],
          is_correct: i === cIdx,
        });
      }

      if (submitMode === "save-add") {
        setNewQuestion("");
        setOption1("");
        setOption2("");
        setOption3("");
        setOption4("");
        setCorrectIndex("1");
        setFeedbackCorrect("");
        setFeedbackWrong("");
      }
      setMsg("تم حفظ السؤال بنجاح.");
      showToast({ type: "success", message: "تمت إضافة السؤال." });
    } catch (e2) {
      setErr(e2.message || "Failed to create bank question.");
    } finally {
      setSaving(false);
    }
  }

  async function importQuestions(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    if (!isCompetitionCustomizationReady || !importFile) return;
    try {
      const ok = await confirm({
        title: "استيراد أسئلة",
        message: "هل تريد تأكيد استيراد ملف الأسئلة؟",
      });
      if (!ok) return;
      setImporting(true);
      const res = await adminApi.importGaCompetitionBankQuestionsApi(importFile);
      setMsg(res.errors?.length ? `Imported ${res.created}, with ${res.errors.length} row errors.` : `Imported ${res.created} rows.`);
      setImportFile(null);
      showToast({ type: "success", message: `تم استيراد ${res.created ?? 0} سؤال.` });
    } catch (e2) {
      setErr(e2.message || "Failed to import excel.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <PageShell
      pageKey={PAGE_KEY}
      title="إضافة أسئلة المسابقات"
      subtitle="لوحة منفصلة لإضافة السؤال مع الخيارات وتحديد الإجابة الصحيحة."
    >
      <PageToolbar pageKey={PAGE_KEY}>
        <ToolbarLink pageKey={PAGE_KEY} to={ga("competition-questions/view")} variant="secondary">
          عرض الأسئلة
        </ToolbarLink>
        <ToolbarLink pageKey={PAGE_KEY} to={ga("competition-parts")} variant="secondary">
          أجزاء المسابقات
        </ToolbarLink>
      </PageToolbar>
      {err ? <p className="adm-error">{err}</p> : null}
      {msg ? <p className="adm-muted">{msg}</p> : null}
      <form className={`${PAGE_KEY}-editor`} onSubmit={createQuestion}>
        <div className={`${PAGE_KEY}-editor-main`}>
          <h3 className={`${PAGE_KEY}-editor-title`}>سؤال جديد</h3>
          <label className={`${PAGE_KEY}-form-label ${PAGE_KEY}-full`}>
            نص السؤال
            <textarea className={`${PAGE_KEY}-form-control`} rows={3} value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} />
          </label>
          {[
            { key: "option1", label: "A", value: option1, setter: setOption1 },
            { key: "option2", label: "B", value: option2, setter: setOption2 },
            { key: "option3", label: "C", value: option3, setter: setOption3 },
            { key: "option4", label: "D", value: option4, setter: setOption4 },
          ].map((item, idx) => {
            const isCorrect = Number(correctIndex) - 1 === idx;
            return (
              <label key={item.key} className={`${PAGE_KEY}-form-label ${isCorrect ? `${PAGE_KEY}-answer-correct` : ""}`}>
                الإجابة {item.label}
                <input className={`${PAGE_KEY}-form-control`} value={item.value} onChange={(e) => item.setter(e.target.value)} />
              </label>
            );
          })}
          <label className={`${PAGE_KEY}-form-label`}>
            تحديد الإجابة الصحيحة
            <select className={`${PAGE_KEY}-form-control`} value={correctIndex} onChange={(e) => setCorrectIndex(e.target.value)}>
              <option value="1">A</option>
              <option value="2">B</option>
              <option value="3">C</option>
              <option value="4">D</option>
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
            الجزء
            <select className={`${PAGE_KEY}-form-control`} value={selectedPartId} onChange={(e) => setSelectedPartId(e.target.value)}>
              {parts.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.title}
                </option>
              ))}
            </select>
          </label>
          <label className={`${PAGE_KEY}-form-label`}>
            العهد
            <select className={`${PAGE_KEY}-form-control`} value={newTestament} onChange={(e) => setNewTestament(e.target.value)}>
              <option value="old">عهد قديم</option>
              <option value="new">عهد جديد</option>
            </select>
          </label>
          <label className={`${PAGE_KEY}-form-label`}>
            الأصحاح
            <input className={`${PAGE_KEY}-form-control`} type="number" min={1} value={newChapter} onChange={(e) => setNewChapter(e.target.value)} />
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
      </form>

      <FormCard
        pageKey={PAGE_KEY}
        title="استيراد أسئلة من Excel"
        onSubmit={importQuestions}
        submitText={importing ? "جاري الاستيراد..." : "رفع واستيراد"}
        fieldsetDisabled={importing}
        submitDisabled={!canImportQuestions}
      >
        <label className={`${PAGE_KEY}-form-label ${PAGE_KEY}-full`}>
          ملف الأسئلة (csv / xlsx)
          <input
            className={`${PAGE_KEY}-form-control`}
            type="file"
            accept=".xlsx,.csv,.txt,.ods"
            disabled={!isCompetitionCustomizationReady || importing}
            onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {!isCompetitionCustomizationReady ? (
          <p className="adm-muted">اختر الجزء أولاً لتفعيل رفع ملف الأسئلة.</p>
        ) : null}
      </FormCard>
    </PageShell>
  );
}
