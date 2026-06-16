import { useEffect, useMemo, useState } from "react";
import PageShell from "../components/common/PageShell";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import { useDialog } from "../components/common/DialogProvider";
import { useToast } from "../components/common/ToastProvider";
import * as adminApi from "../api/adminApi";
import { ga } from "../navigation/adminPaths";
import "../assets/css/QuestionBankPage.css";
import "../assets/css/Dialog.css";

const PAGE_KEY = "pg-questions";

function sortQuestionOptions(opts) {
  return [...(opts || [])].sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
}

export default function GaExamQuestionsViewDashboardPage() {
  const [questions, setQuestions] = useState([]);
  const [selectedTestament, setSelectedTestament] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editQText, setEditQText] = useState("");
  const [editTestament, setEditTestament] = useState("old");
  const [editChapter, setEditChapter] = useState("1");
  const [editDifficulty, setEditDifficulty] = useState("");
  const [editFeedbackCorrect, setEditFeedbackCorrect] = useState("");
  const [editFeedbackWrong, setEditFeedbackWrong] = useState("");
  const [editOptions, setEditOptions] = useState([]);
  const [editCorrectIdx, setEditCorrectIdx] = useState("0");
  const { confirm } = useDialog();
  const { showToast } = useToast();

  useEffect(() => {
    let active = true;
    setLoading(true);
    adminApi
      .fetchGaFamilyExamQuestionBankApi()
      .then((rows) => {
        if (!active) return;
        setQuestions(Array.isArray(rows) ? rows : []);
      })
      .catch((e) => {
        if (!active) return;
        setErr(e.message || "Failed to load question bank.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (editingId == null) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !editSaving) {
        setEditingId(null);
        setEditSaving(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingId, editSaving]);

  const questionsForChapterDropdown = useMemo(() => {
    if (!selectedTestament) return questions;
    return questions.filter((q) => (q.testament_type === "new" ? "new" : "old") === selectedTestament);
  }, [questions, selectedTestament]);

  const chapterOptions = useMemo(() => {
    const set = new Set();
    questionsForChapterDropdown.forEach((q) => {
      const c = Number(q.chapter_number);
      if (Number.isFinite(c) && c > 0) set.add(c);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [questionsForChapterDropdown]);

  useEffect(() => {
    if (!selectedChapter) return;
    const ch = Number(selectedChapter);
    if (!chapterOptions.includes(ch)) setSelectedChapter("");
  }, [selectedTestament, chapterOptions, selectedChapter]);

  const filteredQuestions = useMemo(() => {
    let list = questions;
    if (selectedTestament) {
      list = list.filter((q) => (q.testament_type === "new" ? "new" : "old") === selectedTestament);
    }
    if (selectedChapter) {
      list = list.filter((q) => Number(q.chapter_number) === Number(selectedChapter));
    }
    return list;
  }, [questions, selectedTestament, selectedChapter]);

  const groupedCounts = useMemo(() => {
    const counts = new Map();
    filteredQuestions.forEach((q) => {
      const key = `${q.testament_type}:${q.chapter_number}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([key, count]) => {
        const [testament, chapter] = key.split(":");
        return `${testament === "old" ? "عهد قديم" : "عهد جديد"} - أصحاح ${chapter}: ${count}`;
      })
      .sort();
  }, [filteredQuestions]);

  const groupedSections = useMemo(() => {
    const grouped = new Map();
    filteredQuestions.forEach((q) => {
      const testamentKey = q.testament_type === "old" ? "old" : "new";
      if (!grouped.has(testamentKey)) grouped.set(testamentKey, new Map());
      const chapterMap = grouped.get(testamentKey);
      const chapterKey = Number.isFinite(Number(q.chapter_number)) ? Number(q.chapter_number) : q.chapter_number;
      if (!chapterMap.has(chapterKey)) chapterMap.set(chapterKey, []);
      chapterMap.get(chapterKey).push(q);
    });

    const testamentOrder = ["old", "new"];
    return testamentOrder
      .filter((key) => grouped.has(key))
      .map((testamentKey) => {
        const chapterMap = grouped.get(testamentKey);
        const chapters = Array.from(chapterMap.entries())
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([chapterKey, rows]) => ({
            chapterKey,
            rows,
          }));
        return {
          testamentKey,
          testamentLabel: testamentKey === "old" ? "العهد القديم" : "العهد الجديد",
          chapters,
        };
      });
  }, [filteredQuestions]);

  function beginEditQuestion(row) {
    const sorted = sortQuestionOptions(row.options);
    setEditingId(Number(row.id));
    setEditQText(row.question_text ?? "");
    setEditTestament(row.testament_type === "new" ? "new" : "old");
    setEditChapter(String(row.chapter_number != null ? row.chapter_number : "1"));
    setEditDifficulty(row.difficulty || "");
    setEditFeedbackCorrect(row.feedback_correct ?? "");
    setEditFeedbackWrong(row.feedback_wrong ?? "");
    setEditOptions(sorted.map((o) => ({ id: o.id, text: o.option_text ?? "" })));
    const correctI = sorted.findIndex((o) => o.is_correct);
    setEditCorrectIdx(String(correctI >= 0 ? correctI : 0));
    setErr("");
  }

  function cancelEditQuestion() {
    setEditingId(null);
    setEditSaving(false);
  }

  function updateEditOptionText(index, value) {
    setEditOptions((prev) => prev.map((o, i) => (i === index ? { ...o, text: value } : o)));
  }

  async function saveEditQuestion(questionId) {
    const trimmed = editOptions.map((o) => (o.text || "").trim());
    if (!editQText.trim() || trimmed.some((t) => !t)) {
      setErr("يرجى تعبئة نص السؤال وجميع الاختيارات.");
      return;
    }
    const ch = Number(editChapter);
    if (!Number.isFinite(ch) || ch < 1) {
      setErr("رقم الأصحاح غير صالح.");
      return;
    }
    setEditSaving(true);
    setErr("");
    try {
      await adminApi.updateGaFamilyExamQuestionBankQuestionApi(questionId, {
        question_text: editQText.trim(),
        testament_type: editTestament,
        chapter_number: ch,
        difficulty: editDifficulty || null,
        feedback_correct: editFeedbackCorrect.trim() || null,
        feedback_wrong: editFeedbackWrong.trim() || null,
      });
      const correctIndex = Number(editCorrectIdx);
      for (let i = 0; i < editOptions.length; i += 1) {
        const opt = editOptions[i];
        await adminApi.updateGaFamilyExamQuestionBankOptionApi(questionId, opt.id, {
          option_text: trimmed[i],
          is_correct: i === correctIndex,
          sort_order: i + 1,
        });
      }
      const rows = await adminApi.fetchGaFamilyExamQuestionBankApi();
      setQuestions(Array.isArray(rows) ? rows : []);
      cancelEditQuestion();
      showToast({ type: "success", message: "تم حفظ التعديلات." });
    } catch (e) {
      setErr(e.message || "تعذر حفظ التعديلات.");
    } finally {
      setEditSaving(false);
    }
  }

  async function onDeleteQuestion(question) {
    const ok = await confirm({
      title: "حذف سؤال",
      message: "هل تريد حذف هذا السؤال مع جميع الاختيارات المرتبطة به؟",
    });
    if (!ok) return;

    try {
      await adminApi.deleteGaFamilyExamQuestionBankQuestionApi(question.id);
      setQuestions((prev) => prev.filter((row) => Number(row.id) !== Number(question.id)));
      if (Number(editingId) === Number(question.id)) cancelEditQuestion();
      showToast({ type: "success", message: "تم حذف السؤال." });
    } catch (e) {
      setErr(e.message || "تعذر حذف السؤال.");
    }
  }

  return (
    <PageShell pageKey={PAGE_KEY} title="عرض/تعديل أسئلة الامتحانات" subtitle="مراجعة بنك أسئلة امتحانات العائلات حسب العهد والأصحاح.">
      <PageToolbar pageKey={PAGE_KEY}>
        <ToolbarLink pageKey={PAGE_KEY} to={ga("family-exams/questions-add-dashboard")} variant="primary">
          + إضافة سؤال
        </ToolbarLink>
      </PageToolbar>
      {err ? <p className="adm-error">{err}</p> : null}
      <div className="adm-card" style={{ marginBottom: 12 }}>
        <p style={{ marginTop: 0, marginBottom: 0, fontWeight: 700 }}>بنك أسئلة الامتحانات</p>
        <p style={{ marginBottom: 0, marginTop: 8, color: "#666" }}>
          الأسئلة هنا مستقلة عن إنشاء الامتحان، ويتم السحب منها لاحقاً وفق إعدادات الامتحان.
        </p>
        {groupedCounts.length > 0 ? (
          <p style={{ marginBottom: 0, marginTop: 8 }}><strong>توزيع الأسئلة:</strong> {groupedCounts.join(" | ")}</p>
        ) : null}
      </div>
      <div className="adm-card" style={{ marginBottom: 12, maxWidth: 720 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <label className="adm-label" style={{ marginBottom: 0 }}>
            فلترة حسب العهد
            <select className="adm-select" value={selectedTestament} onChange={(e) => setSelectedTestament(e.target.value)}>
              <option value="">كل العهدين</option>
              <option value="old">عهد قديم</option>
              <option value="new">عهد جديد</option>
            </select>
          </label>
          <label className="adm-label" style={{ marginBottom: 0 }}>
            فلترة حسب الأصحاح
            <select className="adm-select" value={selectedChapter} onChange={(e) => setSelectedChapter(e.target.value)}>
              <option value="">كل الأصحاحات</option>
              {chapterOptions.map((chapter) => (
                <option key={chapter} value={String(chapter)}>
                  أصحاح {chapter}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className={`${PAGE_KEY}-panel`}>
        {loading ? <div className={`${PAGE_KEY}-empty`}>جاري تحميل الأسئلة...</div> : null}
        {!loading && filteredQuestions.length === 0 ? (
          <div className={`${PAGE_KEY}-empty`}>
            {questions.length === 0
              ? "لا توجد أسئلة متاحة في بنك الأسئلة حالياً."
              : "لا توجد أسئلة مطابقة للعهد والأصحاح المحددين."}
          </div>
        ) : null}
        {!loading
          ? groupedSections.map((testamentSection) => (
              <section key={testamentSection.testamentKey} className={`${PAGE_KEY}-group`}>
                <h3 className={`${PAGE_KEY}-group-title`}>{testamentSection.testamentLabel}</h3>
                {testamentSection.chapters.map((chapterSection) => (
                  <div key={`${testamentSection.testamentKey}:${chapterSection.chapterKey}`} className={`${PAGE_KEY}-chapter`}>
                    <h4 className={`${PAGE_KEY}-chapter-title`}>أصحاح {chapterSection.chapterKey}</h4>
                    {chapterSection.rows.map((row) => {
                      const sortedOpts = sortQuestionOptions(row.options);
                      return (
                        <div key={row.id} className={`${PAGE_KEY}-question-row`}>
                          <strong className={`${PAGE_KEY}-question-text`}>{row.question_text}</strong>
                          <div className={`${PAGE_KEY}-question-meta`}>
                            <span className={`${PAGE_KEY}-tag`}>{row.testament_type === "old" ? "عهد قديم" : "عهد جديد"}</span>
                            <span className={`${PAGE_KEY}-tag`}>أصحاح {row.chapter_number}</span>
                            <span className={`${PAGE_KEY}-tag ${PAGE_KEY}-tag--${row.difficulty || "medium"}`}>
                              {row.difficulty || "بدون"}
                            </span>
                          </div>
                          <ul className={`${PAGE_KEY}-options`}>
                            {sortedOpts.map((o, idx) => (
                              <li key={o.id} className={`${PAGE_KEY}-option ${o.is_correct ? `${PAGE_KEY}-option--correct` : ""}`}>
                                <span className={`${PAGE_KEY}-option-label`}>{String.fromCharCode(65 + idx)}.</span>
                                <span className={`${PAGE_KEY}-option-text`}>{o.option_text}</span>
                                {o.is_correct ? <span className={`${PAGE_KEY}-option-badge`}>الإجابة الصحيحة</span> : null}
                              </li>
                            ))}
                          </ul>
                          <div className={`${PAGE_KEY}-question-actions`} style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10 }}>
                            <button type="button" className={`${PAGE_KEY}-action-btn adm-btn adm-btn-secondary`} onClick={() => beginEditQuestion(row)}>
                              تعديل
                            </button>
                            <button type="button" className={`${PAGE_KEY}-action-btn adm-delete`} onClick={() => onDeleteQuestion(row)}>
                              حذف
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </section>
            ))
          : null}
      </div>

      {editingId != null ? (
        <div
          className="dlg-overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !editSaving) cancelEditQuestion();
          }}
        >
          <div className={`dlg-card ${PAGE_KEY}-edit-modal`} role="dialog" aria-modal="true" aria-labelledby={`${PAGE_KEY}-edit-title`} onMouseDown={(e) => e.stopPropagation()}>
            <h3 id={`${PAGE_KEY}-edit-title`} className="dlg-title">
              تعديل السؤال
            </h3>
            <div className="adm-form-stack" style={{ marginTop: 0 }}>
              <label className="adm-label">
                نص السؤال
                <textarea className="adm-textarea" rows={3} value={editQText} onChange={(e) => setEditQText(e.target.value)} />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(120px, 1fr))", gap: 12 }}>
                <label className="adm-label" style={{ marginBottom: 0 }}>
                  العهد
                  <select className="adm-select" value={editTestament} onChange={(e) => setEditTestament(e.target.value)}>
                    <option value="old">عهد قديم</option>
                    <option value="new">عهد جديد</option>
                  </select>
                </label>
                <label className="adm-label" style={{ marginBottom: 0 }}>
                  الأصحاح
                  <input className="adm-input" type="number" min={1} value={editChapter} onChange={(e) => setEditChapter(e.target.value)} />
                </label>
                <label className="adm-label" style={{ marginBottom: 0 }}>
                  الصعوبة
                  <select className="adm-select" value={editDifficulty} onChange={(e) => setEditDifficulty(e.target.value)}>
                    <option value="">بدون</option>
                    <option value="easy">easy</option>
                    <option value="medium">medium</option>
                    <option value="hard">hard</option>
                  </select>
                </label>
              </div>
              <label className="adm-label">
                تعليق عند الإجابة الصحيحة (اختياري)
                <input className="adm-input" value={editFeedbackCorrect} onChange={(e) => setEditFeedbackCorrect(e.target.value)} />
              </label>
              <label className="adm-label">
                تعليق عند الإجابة الخاطئة (اختياري)
                <input className="adm-input" value={editFeedbackWrong} onChange={(e) => setEditFeedbackWrong(e.target.value)} />
              </label>
              <strong>الاختيارات</strong>
              {editOptions.map((o, idx) => (
                <label key={o.id} className="adm-label">
                  الاختيار {idx + 1}
                  <input className="adm-input" value={o.text} onChange={(e) => updateEditOptionText(idx, e.target.value)} />
                </label>
              ))}
              <label className="adm-label">
                الإجابة الصحيحة
                <select className="adm-select" value={editCorrectIdx} onChange={(e) => setEditCorrectIdx(e.target.value)}>
                  {editOptions.map((_, idx) => (
                    <option key={String(idx)} value={String(idx)}>
                      الاختيار {idx + 1}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="dlg-actions" style={{ flexWrap: "wrap", justifyContent: "flex-start", gap: 10 }}>
              <button type="button" className="dlg-btn" disabled={editSaving} onClick={() => saveEditQuestion(editingId)}>
                {editSaving ? "جاري الحفظ…" : "حفظ"}
              </button>
              <button type="button" className="dlg-btn dlg-btn--ghost" disabled={editSaving} onClick={cancelEditQuestion}>
                إلغاء
              </button>
              <button type="button" className="adm-delete" style={{ borderRadius: 9999, padding: "10px 22px", fontWeight: 700 }} disabled={editSaving} onClick={() => onDeleteQuestion({ id: editingId })}>
                حذف
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
