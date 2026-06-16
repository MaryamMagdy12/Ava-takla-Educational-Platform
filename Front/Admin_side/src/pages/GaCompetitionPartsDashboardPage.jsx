import { useEffect, useMemo, useRef, useState } from "react";
import PageShell from "../components/common/PageShell";
import PageToolbar from "../components/common/PageToolbar";
import Panel from "../components/common/Panel";
import DataTable from "../components/common/DataTable";
import HighlightedText from "../components/common/HighlightedText";
import * as adminApi from "../api/adminApi";
import { useDialog } from "../components/common/DialogProvider";
import { useToast } from "../components/common/ToastProvider";
import useDebouncedValue from "../hooks/useDebouncedValue";
import { useOutletContext } from "react-router-dom";
import "../assets/css/LevelsPage.css";

const PAGE_KEY = "pg-levels";

function truncDescription(s, n = 56) {
  if (s == null || String(s).trim() === "") return "—";
  const t = String(s).trim();
  return t.length <= n ? t : `${t.slice(0, n)}…`;
}

const OPTION_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function sortBankOptions(options) {
  if (!Array.isArray(options)) return [];
  return [...options].sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
}

function difficultyLabel(d) {
  if (d === "easy") return "سهل";
  if (d === "medium") return "متوسط";
  if (d === "hard") return "صعب";
  return "—";
}

function questionTypeLabel(t) {
  if (t === "mcq") return "اختيار من متعدد";
  if (t === "true_false") return "صح أو خطأ";
  return t || "—";
}

function difficultyTagClass(d) {
  if (d === "easy") return "ga-q-view-tag--easy";
  if (d === "medium") return "ga-q-view-tag--medium";
  if (d === "hard") return "ga-q-view-tag--hard";
  return "ga-q-view-tag--muted";
}

export default function GaCompetitionPartsDashboardPage() {
  const { confirm, alertMessage } = useDialog();
  const { showToast } = useToast();
  const { globalSearch } = useOutletContext() || { globalSearch: "" };
  const debouncedGlobalSearch = useDebouncedValue(globalSearch);
  const highlightQueries = [debouncedGlobalSearch];

  const [parts, setParts] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isQuestionsOpen, setIsQuestionsOpen] = useState(false);
  const [questionsPart, setQuestionsPart] = useState(null);
  const [partQuestions, setPartQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [editQuestionText, setEditQuestionText] = useState("");
  const [editTestament, setEditTestament] = useState("old");
  const [editChapter, setEditChapter] = useState(1);
  const [editOptionTexts, setEditOptionTexts] = useState([]);
  const [editCorrectOptionId, setEditCorrectOptionId] = useState("");
  const [editingPartId, setEditingPartId] = useState(null);
  const [editPartTitle, setEditPartTitle] = useState("");
  const [editPartDescription, setEditPartDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const questionCardRefs = useRef({});

  const loadParts = () =>
    adminApi
      .fetchGaCompetitionBankPartsApi()
      .then((rows) => {
        setErr("");
        setParts(Array.isArray(rows) ? rows : []);
      })
      .catch((e) => setErr(e.message || "Failed to load parts bank."));

  useEffect(() => {
    loadParts();
  }, []);

  useEffect(() => {
    if (!editingQuestionId) return;
    const el = questionCardRefs.current[editingQuestionId];
    el?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  }, [editingQuestionId]);

  const filteredParts = useMemo(() => {
    const q = debouncedGlobalSearch.trim().toLowerCase();
    if (!q) return parts;
    return parts.filter(
      (p) =>
        String(p.title ?? "")
          .toLowerCase()
          .includes(q) ||
        String(p.description ?? "")
          .toLowerCase()
          .includes(q) ||
        String(p.sort_order ?? "").includes(q) ||
        String(p.questions_count ?? "").includes(q),
    );
  }, [debouncedGlobalSearch, parts]);

  async function createPart(e) {
    e.preventDefault();
    try {
      setSaving(true);
      await adminApi.createGaCompetitionBankPartApi({
        title: newTitle.trim(),
        description: newDescription.trim() || null,
      });
      setNewTitle("");
      setNewDescription("");
      await loadParts();
      setIsCreateOpen(false);
      showToast({ type: "success", message: "تمت إضافة الجزء." });
    } catch (e2) {
      setErr(e2.message || "Failed to create part.");
    } finally {
      setSaving(false);
    }
  }

  function startEditPart(part) {
    setEditingPartId(part.id);
    setEditPartTitle(part.title ?? "");
    setEditPartDescription(part.description ?? "");
  }

  async function saveEditedPart() {
    if (!editingPartId) return;
    setSaving(true);
    try {
      await adminApi.updateGaCompetitionBankPartApi(editingPartId, {
        title: editPartTitle.trim(),
        description: editPartDescription.trim() || null,
      });
      await loadParts();
      setEditingPartId(null);
      showToast({ type: "success", message: "تم تعديل الجزء." });
    } catch (e) {
      await alertMessage({ title: "تعذر التعديل", message: e.message || "Update failed." });
    } finally {
      setSaving(false);
    }
  }

  async function deletePart(part) {
    const ok = await confirm({
      title: "حذف الجزء",
      message: `هل تريد حذف الجزء "${part.title}" وكل أسئلته؟`,
    });
    if (!ok) return;

    setSaving(true);
    try {
      await adminApi.deleteGaCompetitionBankPartApi(part.id);
      await loadParts();
      if (questionsPart && Number(questionsPart.id) === Number(part.id)) {
        setIsQuestionsOpen(false);
        setQuestionsPart(null);
        setPartQuestions([]);
      }
      showToast({ type: "success", message: "تم حذف الجزء." });
    } catch (e) {
      await alertMessage({ title: "تعذر الحذف", message: e.message || "Delete failed." });
    } finally {
      setSaving(false);
    }
  }

  async function openPartQuestions(part) {
    setEditingQuestionId(null);
    setQuestionsPart(part);
    setIsQuestionsOpen(true);
    setQuestionsLoading(true);
    try {
      const rows = await adminApi.fetchGaCompetitionBankQuestionsApi({ part_id: part.id });
      setPartQuestions(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setErr(e.message || "Failed to load part questions.");
      setPartQuestions([]);
    } finally {
      setQuestionsLoading(false);
    }
  }

  function startEditQuestion(question) {
    const opts = sortBankOptions(question.options);
    const mapped = opts.map((o) => ({
      id: o.id,
      text: o.option_text ?? "",
      is_correct: Boolean(o.is_correct) || Number(o.is_correct) === 1,
    }));
    const correct = opts.find((o) => Boolean(o.is_correct) || Number(o.is_correct) === 1);
    setEditingQuestionId(question.id);
    setEditQuestionText(question.question_text ?? "");
    setEditTestament(question.testament_type ?? "old");
    setEditChapter(Number(question.chapter_number) > 0 ? Number(question.chapter_number) : 1);
    setEditOptionTexts(mapped);
    setEditCorrectOptionId(correct ? String(correct.id) : mapped[0] ? String(mapped[0].id) : "");
  }

  function updateEditOptionText(optionId, text) {
    setEditOptionTexts((prev) => prev.map((o) => (String(o.id) === String(optionId) ? { ...o, text } : o)));
  }

  async function saveEditedQuestion() {
    if (!questionsPart?.id || !editingQuestionId) return;
    setSaving(true);
    try {
      await adminApi.updateGaCompetitionBankQuestionApi(editingQuestionId, {
        question_text: editQuestionText.trim(),
        testament_type: editTestament,
        chapter_number: Number(editChapter),
      });

      for (const opt of editOptionTexts) {
        await adminApi.updateGaCompetitionBankOptionApi(editingQuestionId, opt.id, {
          option_text: String(opt.text || "").trim(),
          is_correct: String(opt.id) === String(editCorrectOptionId),
        });
      }

      const rows = await adminApi.fetchGaCompetitionBankQuestionsApi({ part_id: questionsPart.id });
      setPartQuestions(Array.isArray(rows) ? rows : []);
      setEditingQuestionId(null);
      showToast({ type: "success", message: "تم حفظ السؤال." });
    } catch (e) {
      setErr(e.message || "Failed to update question/options.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteBankQuestion(question) {
    const ok = await confirm({
      title: "حذف السؤال",
      message: `هل تريد حذف هذا السؤال نهائيًا؟`,
    });
    if (!ok) return;
    setSaving(true);
    try {
      await adminApi.deleteGaCompetitionBankQuestionApi(question.id);
      if (questionsPart?.id) {
        const rows = await adminApi.fetchGaCompetitionBankQuestionsApi({ part_id: questionsPart.id });
        setPartQuestions(Array.isArray(rows) ? rows : []);
      }
      setEditingQuestionId(null);
      showToast({ type: "success", message: "تم حذف السؤال." });
      await loadParts();
    } catch (e) {
      await alertMessage({ title: "تعذر الحذف", message: e.message || "Delete failed." });
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    {
      key: "title",
      title: "الجزء / المحور",
      render: (row) => (
        <HighlightedText text={row.title ?? "—"} queries={highlightQueries} highlightClassName={`${PAGE_KEY}-highlight`} />
      ),
    },
    // {
    //   key: "sort_order",
    //   title: "الترتيب",
    //   render: (row) => (
    //     <HighlightedText text={String(row.sort_order ?? 0)} queries={highlightQueries} highlightClassName={`${PAGE_KEY}-highlight`} />
    //   ),
    // },
    {
      key: "questions_count",
      title: "عدد الأسئلة",
      render: (row) => (
        <HighlightedText text={String(row.questions_count ?? 0)} queries={highlightQueries} highlightClassName={`${PAGE_KEY}-highlight`} />
      ),
    },
    {
      key: "description",
      title: "الوصف",
      render: (row) => <span className="adm-muted">{truncDescription(row.description)}</span>,
    },
    {
      key: "status",
      title: "الحالة",
      render: () => "نشطة",
    },
    {
      key: "actions",
      title: "الإجراءات",
      render: (row) => (
        <div className={`${PAGE_KEY}-actions-cell`}>
          <button type="button" className={`${PAGE_KEY}-datatable-btn adm-outline-questions`} onClick={() => openPartQuestions(row)}>
            عرض الأسئلة
          </button>
          <button type="button" className={`${PAGE_KEY}-datatable-btn adm-edit`} onClick={() => startEditPart(row)}>
            تعديل
          </button>
          <button type="button" className={`${PAGE_KEY}-datatable-btn adm-delete`} onClick={() => deletePart(row)} disabled={saving}>
            حذف
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageShell
      pageKey={PAGE_KEY}
      title="أجزاء المسابقة (البنك الخاص بالمسابقة)"
      subtitle="أنشئ الأجزاء في البنك ثم اربطها بالمسابقات عند الإنشاء — نفس شكل جدول المراحل."
    >
      {err ? <p className="adm-error">{err}</p> : null}

      <PageToolbar pageKey={PAGE_KEY}>
        <button
          type="button"
          className={`${PAGE_KEY}-toolbar-link ${PAGE_KEY}-toolbar-link--primary`}
          onClick={() => setIsCreateOpen(true)}
        >
          + إضافة جزء
        </button>
      </PageToolbar>

      <Panel pageKey={PAGE_KEY}>
        <DataTable pageKey={PAGE_KEY} columns={columns} rows={filteredParts} />
      </Panel>

      {isCreateOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "grid",
            placeItems: "center",
            zIndex: 1200,
            padding: 16,
          }}
          onClick={() => setIsCreateOpen(false)}
        >
          <form
            onSubmit={createPart}
            className="adm-card adm-form-stack"
            style={{ width: "min(560px, 100%)", margin: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <h3 style={{ margin: 0 }}>إضافة جزء/محور</h3>
              <button type="button" className="adm-btn adm-btn-secondary" onClick={() => setIsCreateOpen(false)}>
                إغلاق
              </button>
            </div>
            <label className="adm-label">
              اسم الجزء/المحور
              <input className="adm-input" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required />
            </label>
            <label className="adm-label">
              وصف (اختياري)
              <textarea className="adm-textarea" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={3} />
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="adm-btn adm-btn-secondary" type="button" onClick={() => setIsCreateOpen(false)}>
                إلغاء
              </button>
              <button className="adm-btn adm-btn-primary" type="submit" disabled={saving}>
                {saving ? "جارٍ الحفظ..." : "حفظ الجزء"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {editingPartId ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "grid",
            placeItems: "center",
            zIndex: 1200,
            padding: 16,
          }}
          onClick={() => setEditingPartId(null)}
        >
          <div className="adm-card adm-form-stack" style={{ width: "min(560px, 100%)" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>تعديل الجزء</h3>
            <label className="adm-label">
              اسم الجزء
              <input className="adm-input" value={editPartTitle} onChange={(e) => setEditPartTitle(e.target.value)} />
            </label>
            <label className="adm-label">
              الوصف
              <textarea className="adm-textarea" rows={3} value={editPartDescription} onChange={(e) => setEditPartDescription(e.target.value)} />
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" className="adm-btn adm-btn-secondary" onClick={() => setEditingPartId(null)}>
                إلغاء
              </button>
              <button type="button" className="adm-btn adm-btn-primary" onClick={saveEditedPart} disabled={saving}>
                {saving ? "جارٍ الحفظ..." : "حفظ"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isQuestionsOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "grid",
            placeItems: "center",
            zIndex: 1200,
            padding: 16,
          }}
          onClick={() => {
            setEditingQuestionId(null);
            setIsQuestionsOpen(false);
          }}
        >
          <div
            className="adm-card adm-form-stack"
            style={{ width: "min(720px, 100%)", maxHeight: "85vh", overflow: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, direction: "rtl" }}>
              <h3 style={{ margin: 0 }}>أسئلة الجزء: {questionsPart?.title ?? "—"}</h3>
              <button
                type="button"
                className="adm-btn adm-btn-secondary"
                onClick={() => {
                  setEditingQuestionId(null);
                  setIsQuestionsOpen(false);
                }}
              >
                إغلاق
              </button>
            </div>
            {questionsLoading ? <p className="adm-muted">جاري تحميل الأسئلة…</p> : null}
            {!questionsLoading && partQuestions.length === 0 ? <p className="adm-muted">لا توجد أسئلة لهذا الجزء.</p> : null}
            {!questionsLoading &&
              partQuestions.map((q, idx) => {
                const sortedOpts = sortBankOptions(q.options);
                const isEditing = editingQuestionId === q.id;
                return (
                  <article
                    key={q.id}
                    className="ga-q-view-card"
                    ref={(el) => {
                      if (el) questionCardRefs.current[q.id] = el;
                      else delete questionCardRefs.current[q.id];
                    }}
                  >
                    <h4 className="ga-q-view-title">
                      {idx + 1}. {q.question_text}
                    </h4>

                    {sortedOpts.length > 0 ? (
                      sortedOpts.map((o, oi) => {
                        const letter = OPTION_LETTERS[oi] ?? String(oi + 1);
                        const correct = Boolean(o.is_correct) || Number(o.is_correct) === 1;
                        return (
                          <div key={o.id} className={`ga-q-view-row ${correct ? "ga-q-view-row--correct" : ""}`}>
                            <span className="ga-q-view-row-text">
                              {letter}. {o.option_text}
                            </span>
                            {correct ? <span className="ga-q-view-badge">الإجابة الصحيحة</span> : null}
                          </div>
                        );
                      })
                    ) : (
                      <p className="adm-muted">لا توجد خيارات لهذا السؤال.</p>
                    )}

                    <div className="ga-q-view-tags">
                      {q.difficulty ? (
                        <span className={`ga-q-view-tag ${difficultyTagClass(q.difficulty)}`}>{difficultyLabel(q.difficulty)}</span>
                      ) : null}
                      <span className="ga-q-view-tag ga-q-view-tag--muted">{questionTypeLabel(q.question_type)}</span>
                      <span className="ga-q-view-tag ga-q-view-tag--muted">
                        {q.testament_type === "old" ? "عهد قديم" : "عهد جديد"} · أصحاح {q.chapter_number ?? "—"}
                      </span>
                      <span className="ga-q-view-tag ga-q-view-tag--muted">{q.status === "inactive" ? "غير نشط" : "نشط"}</span>
                    </div>

                    {!isEditing ? (
                      <div className="ga-q-view-actions">
                        <button
                          type="button"
                          className={`${PAGE_KEY}-datatable-btn adm-delete`}
                          onClick={() => void deleteBankQuestion(q)}
                          disabled={saving}
                        >
                          حذف
                        </button>
                        <button type="button" className={`${PAGE_KEY}-datatable-btn adm-outline-questions`} onClick={() => startEditQuestion(q)}>
                          تعديل
                        </button>
                      </div>
                    ) : (
                      <div className="ga-q-view-edit-panel adm-form-stack">
                        <strong>تعديل السؤال والاختيارات</strong>
                        <label className="adm-label">
                          نص السؤال
                          <textarea className="adm-textarea" rows={3} value={editQuestionText} onChange={(e) => setEditQuestionText(e.target.value)} />
                        </label>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <label className="adm-label" style={{ marginBottom: 0 }}>
                            العهد
                            <select className="adm-select" value={editTestament} onChange={(e) => setEditTestament(e.target.value)}>
                              <option value="old">عهد قديم</option>
                              <option value="new">عهد جديد</option>
                            </select>
                          </label>
                          <label className="adm-label" style={{ marginBottom: 0 }}>
                            الأصحاح
                            <input
                              className="adm-input"
                              type="number"
                              min={1}
                              value={editChapter}
                              onChange={(e) => setEditChapter(e.target.value === "" ? 1 : Number(e.target.value))}
                            />
                          </label>
                        </div>
                        <div className="adm-card adm-form-stack" style={{ marginTop: 8 }}>
                          <span className="adm-muted">الخيارات</span>
                          {editOptionTexts.map((opt, oix) => (
                            <label key={opt.id} className="adm-label">
                              خيار {OPTION_LETTERS[oix] ?? oix + 1}
                              <input className="adm-input" value={opt.text} onChange={(e) => updateEditOptionText(opt.id, e.target.value)} />
                            </label>
                          ))}
                          {editOptionTexts.length > 0 ? (
                            <label className="adm-label">
                              الإجابة الصحيحة
                              <select className="adm-select" value={editCorrectOptionId} onChange={(e) => setEditCorrectOptionId(e.target.value)}>
                                {editOptionTexts.map((opt, oix) => (
                                  <option key={opt.id} value={String(opt.id)}>
                                    {OPTION_LETTERS[oix] ?? oix + 1}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ) : null}
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                          <button type="button" className="adm-btn adm-btn-secondary" onClick={() => setEditingQuestionId(null)}>
                            إلغاء
                          </button>
                          <button type="button" className="adm-btn adm-btn-primary" onClick={saveEditedQuestion} disabled={saving}>
                            {saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
