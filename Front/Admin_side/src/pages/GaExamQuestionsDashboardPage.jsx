import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import PageShell from "../components/common/PageShell";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import Panel from "../components/common/Panel";
import DataTable from "../components/common/DataTable";
import { useDialog } from "../components/common/DialogProvider";
import { useToast } from "../components/common/ToastProvider";
import * as adminApi from "../api/adminApi";
import { ga } from "../navigation/adminPaths";
import "../assets/css/ExamsPage.css";
import "../assets/css/GaExamQuestionsDashboardPage.css";

const PAGE_KEY = "pg-exams";

function sortQuestionOptions(opts) {
  return [...(opts || [])].sort((a, b) => (Number(a.sort_order) || Number(a.id) || 0) - (Number(b.sort_order) || Number(b.id) || 0));
}

/** Laravel JSON uses `questions`; tolerate missing or non-array. */
function extractQuestionsFromExam(exam) {
  if (!exam || typeof exam !== "object") return [];
  const raw = exam.questions;
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object" && Array.isArray(raw.data)) return raw.data;
  return [];
}

function optionIsCorrect(o) {
  return Boolean(o?.is_correct) || o?.is_correct === 1;
}

function extractExamScopes(exam) {
  if (!exam || typeof exam !== "object") return [];
  const raw = exam.chapter_scopes ?? exam.chapterScopes;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => ({
      testament_type: s?.testament_type === "new" ? "new" : "old",
      chapter_number: Number(s?.chapter_number),
    }))
    .filter((s) => Number.isInteger(s.chapter_number) && s.chapter_number > 0);
}

function questionMatchesScopes(question, scopes) {
  if (!Array.isArray(scopes) || scopes.length === 0) return true;
  const t = question?.testament_type === "new" ? "new" : "old";
  const ch = Number(question?.chapter_number);
  return scopes.some((s) => s.testament_type === t && Number(s.chapter_number) === ch);
}

export default function GaExamQuestionsDashboardPage() {
  const { examId: routeExamId } = useParams();
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState(() => (routeExamId != null && String(routeExamId) !== "" ? String(routeExamId) : ""));
  const [selectedExam, setSelectedExam] = useState(null);
  const [loadingExam, setLoadingExam] = useState(false);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [qText, setQText] = useState("");
  const [qTestament, setQTestament] = useState("old");
  const [qChapter, setQChapter] = useState(1);
  const [qDifficulty, setQDifficulty] = useState("");
  const [correctOptionIndex, setCorrectOptionIndex] = useState("0");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editQText, setEditQText] = useState("");
  const [editTestament, setEditTestament] = useState("old");
  const [editChapter, setEditChapter] = useState(1);
  const [editDifficulty, setEditDifficulty] = useState("");
  const [editCorrectIdx, setEditCorrectIdx] = useState("0");
  const [editOptions, setEditOptions] = useState(["", "", "", ""]);
  const [editSaving, setEditSaving] = useState(false);
  const [questionBankRows, setQuestionBankRows] = useState([]);
  const { confirm } = useDialog();
  const { showToast } = useToast();

  useEffect(() => {
    let active = true;
    adminApi
      .fetchGaFamilyExamQuestionBankApi({ status: "active" })
      .then((rows) => {
        if (!active) return;
        setQuestionBankRows(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!active) return;
        setQuestionBankRows([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    adminApi
      .fetchGaFamilyExamsAdmin()
      .then((rows) => {
        const data = Array.isArray(rows) ? rows : [];
        setExams(data);
        if (routeExamId) {
          setSelectedExamId(String(routeExamId));
        } else if (data.length > 0) {
          setSelectedExamId(String(data[0].id));
        }
      })
      .catch((e) => setErr(e.message || "Failed to load exams."));
  }, [routeExamId]);

  useEffect(() => {
    if (!selectedExamId) return undefined;
    let cancelled = false;
    setLoadingExam(true);
    setEditingQuestion(null);
    adminApi
      .fetchGaFamilyExamApi(selectedExamId)
      .then((exam) => {
        if (cancelled) return;
        setSelectedExam(exam);
        setErr("");
      })
      .catch((e) => {
        if (!cancelled) setErr(e.message || "تعذر تحميل أسئلة الامتحان.");
      })
      .finally(() => {
        if (!cancelled) setLoadingExam(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedExamId]);

  const questions = useMemo(() => extractQuestionsFromExam(selectedExam), [selectedExam]);
  const examScopes = useMemo(() => extractExamScopes(selectedExam), [selectedExam]);

  const relatedQuestionBankRows = useMemo(() => {
    const max = Math.max(0, Number(selectedExam?.question_count ?? 0));
    const filtered = questionBankRows.filter((q) => questionMatchesScopes(q, examScopes));
    if (!max) return filtered;
    return filtered.slice(0, max);
  }, [questionBankRows, examScopes, selectedExam?.question_count]);

  const chapterOptionsForTestament = useMemo(() => {
    const map = new Map();
    questionBankRows.forEach((q) => {
      if (String(q.testament_type) !== String(qTestament)) return;
      const ch = Number(q.chapter_number);
      if (!Number.isFinite(ch) || ch < 1) return;
      map.set(ch, (map.get(ch) ?? 0) + 1);
    });
    return Array.from(map.keys()).sort((a, b) => a - b);
  }, [questionBankRows, qTestament]);

  const editChapterOptions = useMemo(() => {
    const map = new Map();
    questionBankRows.forEach((q) => {
      if (String(q.testament_type) !== String(editTestament)) return;
      const ch = Number(q.chapter_number);
      if (!Number.isFinite(ch) || ch < 1) return;
      map.set(ch, (map.get(ch) ?? 0) + 1);
    });
    return Array.from(map.keys()).sort((a, b) => a - b);
  }, [questionBankRows, editTestament]);

  useEffect(() => {
    if (chapterOptionsForTestament.length === 0) return;
    const n = Number(qChapter);
    if (!chapterOptionsForTestament.includes(n)) {
      setQChapter(chapterOptionsForTestament[0]);
    }
  }, [chapterOptionsForTestament, qTestament]);

  function updateOption(index, value) {
    setOptions((prev) => prev.map((x, i) => (i === index ? value : x)));
  }

  function updateEditOption(index, value) {
    setEditOptions((prev) => prev.map((x, i) => (i === index ? value : x)));
  }

  function resetQuestionForm() {
    setQText("");
    setQTestament("old");
    setQChapter(1);
    setQDifficulty("");
    setCorrectOptionIndex("0");
    setOptions(["", "", "", ""]);
  }

  function openEdit(row) {
    const sorted = sortQuestionOptions(row.options);
    const texts = sorted.map((o) => o.option_text ?? "");
    const padded = [...texts, "", "", "", ""].slice(0, 4);
    const correctI = Math.max(
      0,
      sorted.findIndex((o) => optionIsCorrect(o)),
    );
    setEditingQuestion(row);
    setEditQText(row.question_text ?? "");
    setEditTestament(row.testament_type === "new" ? "new" : "old");
    setEditChapter(Number(row.chapter_number) || 1);
    setEditDifficulty(row.difficulty ?? "");
    setEditCorrectIdx(String(correctI >= 0 ? correctI : 0));
    setEditOptions(padded);
  }

  function cancelEdit() {
    setEditingQuestion(null);
  }

  async function onSaveEdit(e) {
    e.preventDefault();
    if (!selectedExamId || !editingQuestion) return;
    const trimmed = editOptions.map((x) => x.trim());
    if (!editQText.trim() || trimmed.some((x) => !x)) {
      setErr("يرجى تعبئة نص السؤال وجميع الاختيارات.");
      return;
    }
    setEditSaving(true);
    setErr("");
    try {
      const questionPayload = {
        question_text: editQText.trim(),
        testament_type: editTestament,
        chapter_number: Number(editChapter),
        difficulty: editDifficulty || null,
      };
      const isBankQuestion = editingQuestion._source === "bank";
      if (isBankQuestion) {
        await adminApi.updateGaFamilyExamQuestionBankQuestionApi(editingQuestion.id, questionPayload);
      } else {
        await adminApi.updateGaFamilyExamQuestionApi(selectedExamId, editingQuestion.id, questionPayload);
      }
      const sortedOpts = sortQuestionOptions(editingQuestion.options);
      for (let i = 0; i < trimmed.length; i += 1) {
        const opt = sortedOpts[i];
        if (!opt?.id) continue;
        const optionPayload = {
          option_text: trimmed[i],
          is_correct: i === Number(editCorrectIdx),
          sort_order: opt.sort_order ?? i,
        };
        if (isBankQuestion) {
          await adminApi.updateGaFamilyExamQuestionBankOptionApi(editingQuestion.id, opt.id, optionPayload);
        } else {
          await adminApi.updateGaFamilyExamOptionApi(selectedExamId, editingQuestion.id, opt.id, optionPayload);
        }
      }
      const fresh = await adminApi.fetchGaFamilyExamApi(selectedExamId);
      setSelectedExam(fresh);
      setEditingQuestion(null);
      showToast({ type: "success", message: "تم حفظ تعديلات السؤال." });
    } catch (e2) {
      setErr(e2.message || "تعذر حفظ التعديلات.");
    } finally {
      setEditSaving(false);
    }
  }

  async function onAddQuestion(e) {
    e.preventDefault();
    if (!selectedExamId) return;
    const trimmedOptions = options.map((x) => x.trim());
    if (!qText.trim() || trimmedOptions.some((x) => !x)) {
      setErr("يرجى تعبئة نص السؤال وجميع الاختيارات.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const created = await adminApi.addGaFamilyExamQuestionApi(selectedExamId, {
        question_text: qText.trim(),
        testament_type: qTestament,
        chapter_number: Number(qChapter),
        difficulty: qDifficulty || null,
      });
      for (let i = 0; i < trimmedOptions.length; i += 1) {
        await adminApi.addGaFamilyExamOptionApi(selectedExamId, created.id, {
          option_text: trimmedOptions[i],
          is_correct: i === Number(correctOptionIndex),
        });
      }
      const fresh = await adminApi.fetchGaFamilyExamApi(selectedExamId);
      setSelectedExam(fresh);
      resetQuestionForm();
      showToast({ type: "success", message: "تمت إضافة السؤال بنجاح." });
    } catch (e2) {
      setErr(e2.message || "تعذر إضافة السؤال.");
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteQuestion(question) {
    if (!selectedExamId) return;
    const ok = await confirm({
      title: "حذف سؤال",
      message: "هل تريد حذف هذا السؤال مع جميع الاختيارات المرتبطة به؟",
    });
    if (!ok) return;
    try {
      if (question._source === "bank") {
        await adminApi.deleteGaFamilyExamQuestionBankQuestionApi(question.id);
      } else {
        await adminApi.deleteGaFamilyExamQuestionApi(selectedExamId, question.id);
      }
      const fresh = await adminApi.fetchGaFamilyExamApi(selectedExamId);
      setSelectedExam(fresh);
      showToast({ type: "success", message: "تم حذف السؤال." });
    } catch (e) {
      setErr(e.message || "تعذر حذف السؤال.");
    }
  }

  const showingScopedRelatedRows = questions.length === 0 && relatedQuestionBankRows.length > 0;

  const questionRows = useMemo(
    () =>
      (questions.length > 0 ? questions : relatedQuestionBankRows).map((q) => {
        const opts = Array.isArray(q.options) ? q.options : [];
        const correctText = opts.find((o) => optionIsCorrect(o))?.option_text?.trim() ?? "";
        return {
          ...q,
          options_text: opts.map((o) => `${o.option_text}${optionIsCorrect(o) ? " ✓" : ""}`).join(" | "),
          correct_answer: correctText || "—",
          _source: q?.exam_id ? "exam" : "bank",
        };
      }),
    [questions, relatedQuestionBankRows],
  );

  const columns = [
    { key: "question_text", title: "السؤال" },
    {
      key: "meta",
      title: "العهد/الأصحاح/الصعوبة",
      render: (row) =>
        `${row.testament_type === "old" ? "عهد قديم" : "عهد جديد"} / أصحاح ${row.chapter_number} / ${row.difficulty ?? "بدون"}`,
    },
    { key: "correct_answer", title: "الإجابة الصحيحة" },
    { key: "options_text", title: "جميع الخيارات (✓ عند الصحيح)" },
    {
      key: "actions",
      title: "الإجراءات",
      render: (row) => (
        <>
          <button type="button" className={`${PAGE_KEY}-datatable-btn`} style={{ marginInlineEnd: 8 }} onClick={() => openEdit(row)}>
            تعديل
          </button>
          {row._source === "exam" ? (
            <button type="button" className={`${PAGE_KEY}-datatable-btn adm-delete`} onClick={() => onDeleteQuestion(row)}>
              حذف
            </button>
          ) : null}
        </>
      ),
    },
  ];

  const shellSubtitle = routeExamId ? "إضافة أسئلة لهذا الامتحان وعرضها وتعديلها." : "اختر امتحاناً ثم أضف الأسئلة أو عدّلها.";

  return (
    <PageShell pageKey={PAGE_KEY} title="لوحة أسئلة الامتحانات" subtitle={shellSubtitle}>
      <div id="ga-family-exam-questions-root">
        <div className="ga-feq-toolbar-gap">
          <PageToolbar pageKey={PAGE_KEY}>
            <ToolbarLink pageKey={PAGE_KEY} to={ga("family-exams")} variant="secondary">
              الرجوع لإدارة الامتحانات
            </ToolbarLink>
          </PageToolbar>
        </div>
        {err ? <p className="adm-error">{err}</p> : null}
        {!routeExamId ? (
          <div className="ga-feq-exam-picker adm-card">
            <p style={{ marginTop: 0, fontWeight: 700 }}>اختر الامتحان</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {exams.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  className={`adm-btn ${String(x.id) === String(selectedExamId) ? "adm-btn-primary" : "adm-btn-secondary"}`}
                  onClick={() => setSelectedExamId(String(x.id))}
                >
                  {x.title}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {editingQuestion ? (
        <form onSubmit={onSaveEdit} className="ga-feq-hero-card adm-form-stack">
          {selectedExam?.title ? <div className="ga-feq-exam-badge">{selectedExam.title}</div> : null}
          <h3 className="ga-feq-section-label">تعديل السؤال</h3>
          <label className="adm-label">
            نص السؤال
            <textarea className="adm-textarea" rows={3} value={editQText} onChange={(e) => setEditQText(e.target.value)} required />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(160px, 1fr))", gap: 12 }}>
            <label className="adm-label" style={{ marginBottom: 0 }}>
              العهد
              <select className="adm-select" value={editTestament} onChange={(e) => setEditTestament(e.target.value)}>
                <option value="old">عهد قديم</option>
                <option value="new">عهد جديد</option>
              </select>
            </label>
            <label className="adm-label" style={{ marginBottom: 0 }}>
              الأصحاح
              {editChapterOptions.length > 0 ? (
                <select
                  className="adm-select"
                  value={String(editChapter)}
                  onChange={(e) => setEditChapter(Number(e.target.value))}
                >
                  {editChapterOptions.map((ch) => (
                    <option key={ch} value={String(ch)}>
                      أصحاح {ch}
                    </option>
                  ))}
                </select>
              ) : (
                <input className="adm-input" type="number" min={1} value={editChapter} onChange={(e) => setEditChapter(e.target.value)} />
              )}
            </label>
            <label className="adm-label" style={{ marginBottom: 0 }}>
              الصعوبة
              <select className="adm-select" value={editDifficulty} onChange={(e) => setEditDifficulty(e.target.value)}>
                <option value="">بدون</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
          </div>
          <div className="adm-card adm-form-stack">
            <strong>الاختيارات</strong>
            {editOptions.map((opt, idx) => (
              <label key={idx} className="adm-label">
                الاختيار {idx + 1}
                <input className="adm-input" value={opt} onChange={(e) => updateEditOption(idx, e.target.value)} required />
              </label>
            ))}
            <label className="adm-label">
              الإجابة الصحيحة
              <select className="adm-select" value={editCorrectIdx} onChange={(e) => setEditCorrectIdx(e.target.value)}>
                <option value="0">الاختيار 1</option>
                <option value="1">الاختيار 2</option>
                <option value="2">الاختيار 3</option>
                <option value="3">الاختيار 4</option>
              </select>
            </label>
          </div>
          <div className="ga-feq-form-actions">
            <button type="submit" className="adm-btn adm-btn-primary" disabled={editSaving}>
              {editSaving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
            </button>
            <button type="button" className="adm-btn adm-btn-secondary" disabled={editSaving} onClick={cancelEdit}>
              إلغاء
            </button>
          </div>
        </form>
      ) : (
      <form onSubmit={onAddQuestion} className="ga-feq-hero-card adm-form-stack">
        {routeExamId && selectedExam?.title ? <div className="ga-feq-exam-badge">{selectedExam.title}</div> : null}
        <h3 className="ga-feq-hero-title">إضافة سؤال جديد</h3>
        <label className="adm-label">
          نص السؤال
          <textarea className="adm-textarea" rows={3} value={qText} onChange={(e) => setQText(e.target.value)} required />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(160px, 1fr))", gap: 12 }}>
          <label className="adm-label" style={{ marginBottom: 0 }}>
            العهد
            <select className="adm-select" value={qTestament} onChange={(e) => setQTestament(e.target.value)}>
              <option value="old">عهد قديم</option>
              <option value="new">عهد جديد</option>
            </select>
          </label>
          <label className="adm-label" style={{ marginBottom: 0 }}>
            الأصحاح
            {chapterOptionsForTestament.length > 0 ? (
              <select
                className="adm-select"
                value={String(qChapter)}
                onChange={(e) => setQChapter(Number(e.target.value))}
              >
                {chapterOptionsForTestament.map((ch) => (
                  <option key={ch} value={String(ch)}>
                    أصحاح {ch}
                  </option>
                ))}
              </select>
            ) : (
              <input className="adm-input" type="number" min={1} value={qChapter} onChange={(e) => setQChapter(e.target.value)} />
            )}
          </label>
          <label className="adm-label" style={{ marginBottom: 0 }}>
            الصعوبة
            <select className="adm-select" value={qDifficulty} onChange={(e) => setQDifficulty(e.target.value)}>
              <option value="">بدون</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
        </div>

        <div className="adm-card adm-form-stack">
          <strong>الاختيارات</strong>
          {options.map((opt, idx) => (
            <label key={idx} className="adm-label">
              الاختيار {idx + 1}
              <input className="adm-input" value={opt} onChange={(e) => updateOption(idx, e.target.value)} required />
            </label>
          ))}
          <label className="adm-label">
            الإجابة الصحيحة
            <select className="adm-select" value={correctOptionIndex} onChange={(e) => setCorrectOptionIndex(e.target.value)}>
              <option value="0">الاختيار 1</option>
              <option value="1">الاختيار 2</option>
              <option value="2">الاختيار 3</option>
              <option value="3">الاختيار 4</option>
            </select>
          </label>
        </div>
        <div className="ga-feq-form-actions">
          <button type="submit" className="adm-btn adm-btn-primary" disabled={saving || !selectedExamId}>
            {saving ? "جاري الإضافة..." : "إضافة السؤال"}
          </button>
        </div>
      </form>
      )}
      <div className="ga-feq-list-panel">
        <Panel pageKey={PAGE_KEY}>
          <h3 className="ga-feq-list-heading">قائمة الأسئلة</h3>
          {!loadingExam && showingScopedRelatedRows ? (
            <p className="ga-feq-hint">
              تم عرض أسئلة مرتبطة بالامتحان حسب نطاقه (العهد/الأصحاحات) من بنك الأسئلة.
            </p>
          ) : null}
          {loadingExam ? (
            <p className="adm-muted" style={{ margin: 0 }}>
              جارٍ تحميل الأسئلة...
            </p>
          ) : !selectedExamId ? (
            <p className="adm-muted" style={{ margin: 0 }}>
              اختر امتحاناً من القائمة أعلاه.
            </p>
          ) : questionRows.length === 0 ? (
            <div className="ga-feq-hint">
              <p style={{ margin: 0 }}>لا توجد أسئلة مرتبطة بهذا الامتحان بعد. عبّئ النموذج أعلاه ثم اضغط «إضافة السؤال».</p>
              <details>
                <summary style={{ cursor: "pointer", fontWeight: 700, marginTop: 8 }}>
                  عن بنك الأسئلة والاستيراد
                </summary>
                <p style={{ margin: "0.5rem 0 0" }}>
                  يمكنك أيضاً استيراد ملف من صفحة تعديل الامتحان. الأسئلة المسجّلة في «بنك الأسئلة» فقط (دون ربط بالامتحان)
                  تظهر تحت «عرض أسئلة الامتحانات» وليس في قائمة هذا الامتحان.
                </p>
              </details>
            </div>
          ) : null}
          {!loadingExam && selectedExamId && questionRows.length > 0 ? (
            <DataTable pageKey={PAGE_KEY} columns={columns} rows={questionRows} />
          ) : null}
        </Panel>
      </div>
      </div>
    </PageShell>
  );
}
