import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import PageShell from "../components/common/PageShell";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import * as adminApi from "../api/adminApi";
import { useAdminNav } from "../context/AdminNavContext";
import { useAdminData } from "../context/AdminDataContext";
import { useQuestionnaireScope } from "../hooks/useQuestionnaireScope";
import { ga } from "../navigation/adminPaths";

const PAGE_KEY = "pg-questionnaire-editor";

function toLocalInputValue(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

function fromLocalInputValue(s) {
  if (!s) return "";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export default function QuestionnaireEditorPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const editStep = searchParams.get("step") === "questions" ? "questions" : "meta";

  const nav = useAdminNav();
  const scope = useQuestionnaireScope();
  const { levels } = useAdminData();

  const [loading, setLoading] = useState(!isNew);
  const [err, setErr] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [levelId, setLevelId] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableTo, setAvailableTo] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [status, setStatus] = useState("draft");
  const [questions, setQuestions] = useState([]);
  const [qBody, setQBody] = useState("");
  const [qType, setQType] = useState("mcq");
  const [optForms, setOptForms] = useState({});
  const [publishBusy, setPublishBusy] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [editQBody, setEditQBody] = useState("");
  const [editQType, setEditQType] = useState("mcq");
  const [editQOrder, setEditQOrder] = useState("");
  const [optionDrafts, setOptionDrafts] = useState({});

  const listPath = nav("questionnaires");
  const backTo = scope === "general_assembly" ? ga() : nav();

  const setEditStep = useCallback(
    (step) => {
      if (step === "questions") {
        setSearchParams({ step: "questions" });
      } else {
        setSearchParams({});
      }
    },
    [setSearchParams],
  );

  const reloadQuestionnaire = useCallback(async () => {
    if (isNew || !id) return;
    const fresh = await adminApi.fetchQuestionnaireAdmin(scope, id);
    setTitle(fresh.title ?? "");
    setDescription(fresh.description ?? "");
    setLevelId(fresh.level_id != null ? String(fresh.level_id) : "");
    setAvailableFrom(toLocalInputValue(fresh.available_from));
    setAvailableTo(toLocalInputValue(fresh.available_to));
    setDurationMin(fresh.response_duration_minutes != null ? String(fresh.response_duration_minutes) : "");
    setStatus(fresh.status ?? "draft");
    setQuestions(Array.isArray(fresh.questions) ? fresh.questions : []);
  }, [id, isNew, scope]);

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    setErr("");
    reloadQuestionnaire()
      .catch((e) => setErr(e.message || "تعذّر التحميل"))
      .finally(() => setLoading(false));
  }, [id, isNew, scope, reloadQuestionnaire]);

  async function saveMeta(e) {
    e.preventDefault();
    setErr("");
    const from = fromLocalInputValue(availableFrom);
    const to = fromLocalInputValue(availableTo);
    if (!from || !to) {
      setErr("حدد تاريخي البدء والانتهاء.");
      return;
    }
    const body = {
      title: title.trim(),
      description: description.trim() || null,
      available_from: from,
      available_to: to,
    };
    if (!isNew) {
      body.status = status;
    }
    if (scope === "student") {
      body.level_id = levelId ? Number(levelId) : null;
      if (!body.level_id) {
        setErr("اختر المرحلة.");
        return;
      }
    }
    if (durationMin !== "") body.response_duration_minutes = Number(durationMin);
    try {
      if (isNew) {
        const q = await adminApi.createQuestionnaireAdmin(scope, body);
        navigate(`${nav(`questionnaires/${q.id}/edit`)}?step=questions`, { replace: true });
      } else {
        await adminApi.updateQuestionnaireAdmin(scope, id, body);
        await reloadQuestionnaire();
      }
    } catch (e) {
      setErr(e.message || "فشل الحفظ");
    }
  }

  async function addQuestion(e) {
    e.preventDefault();
    if (isNew || !qBody.trim()) return;
    setErr("");
    try {
      await adminApi.addQuestionnaireQuestionAdmin(scope, id, { body: qBody.trim(), type: qType });
      setQBody("");
      await reloadQuestionnaire();
    } catch (e) {
      setErr(e.message || "فشل إضافة السؤال");
    }
  }

  async function addOption(questionId, e) {
    e.preventDefault();
    const f = optForms[questionId] || { text: "" };
    if (!f.text?.trim()) return;
    setErr("");
    try {
      await adminApi.addQuestionnaireOptionAdmin(scope, id, questionId, {
        option_text: f.text.trim(),
      });
      setOptForms((prev) => ({ ...prev, [questionId]: { text: "" } }));
      await reloadQuestionnaire();
    } catch (e) {
      setErr(e.message || "فشل إضافة الخيار");
    }
  }

  function startEditQuestion(q) {
    setEditingQuestionId(q.id);
    setEditQBody(q.body ?? "");
    setEditQType(q.type ?? "mcq");
    setEditQOrder(q.order_no != null ? String(q.order_no) : "0");
  }

  function cancelEditQuestion() {
    setEditingQuestionId(null);
    setEditQBody("");
    setEditQType("mcq");
    setEditQOrder("");
  }

  async function saveEditedQuestion(questionId) {
    setErr("");
    try {
      await adminApi.updateQuestionnaireQuestionAdmin(scope, id, questionId, {
        body: editQBody.trim(),
        type: editQType,
        order_no: editQOrder === "" ? undefined : Number(editQOrder),
      });
      cancelEditQuestion();
      await reloadQuestionnaire();
    } catch (e) {
      setErr(e.message || "فشل حفظ السؤال");
    }
  }

  async function saveOptionRow(questionId, optionId, fallbackText) {
    const key = String(optionId);
    const text = (optionDrafts[key] ?? fallbackText ?? "").trim();
    if (!text) {
      setErr("نص الخيار مطلوب.");
      return;
    }
    setErr("");
    try {
      await adminApi.updateQuestionnaireOptionAdmin(scope, id, questionId, optionId, { option_text: text });
      setOptionDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      await reloadQuestionnaire();
    } catch (e) {
      setErr(e.message || "فشل حفظ الخيار");
    }
  }

  async function removeQuestionnaire() {
    if (!window.confirm("حذف هذا الاستبيان نهائيًا؟")) return;
    setErr("");
    try {
      await adminApi.deleteQuestionnaireAdmin(scope, id);
      navigate(listPath);
    } catch (e) {
      setErr(e.message || "فشل الحذف");
    }
  }

  function returnToQuestionnaireList() {
    navigate(listPath);
  }

  async function publishQuestionnaire() {
    if (isNew) return;
    setErr("");
    setPublishBusy(true);
    try {
      await adminApi.updateQuestionnaireAdmin(scope, id, { status: "published" });
      navigate(listPath);
    } catch (e) {
      setErr(e.message || "فشل نشر الاستبيان");
    } finally {
      setPublishBusy(false);
    }
  }

  const pageTitle = isNew ? "استبيان جديد" : "تحرير الاستبيان";
  const showMetaPanel = isNew || (!isNew && editStep === "meta");
  const showQuestionsPanel = !isNew && editStep === "questions";

  return (
    <PageShell pageKey={PAGE_KEY} title={pageTitle} subtitle="الخطوة 1: البيانات العامة — الخطوة 2: الأسئلة والخيارات.">
      <PageToolbar pageKey={PAGE_KEY}>
        <ToolbarLink pageKey={PAGE_KEY} to={listPath}>
          كل الاستبيانات
        </ToolbarLink>
        <ToolbarLink pageKey={PAGE_KEY} to={backTo}>
          لوحة التحكم
        </ToolbarLink>
      </PageToolbar>
      {err ? <p className="adm-error">{err}</p> : null}
      {loading ? <p className="adm-muted">جاري التحميل…</p> : null}

      {!loading && !isNew ? (
        <nav
          className="adm-card"
          style={{
            maxWidth: 720,
            margin: "1rem auto",
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "center",
            alignItems: "center",
          }}
          aria-label="خطوات التحرير"
        >
          <button
            type="button"
            className={editStep === "meta" ? "adm-btn adm-btn-primary" : "adm-btn adm-btn-secondary"}
            onClick={() => setEditStep("meta")}
          >
            1. بيانات الاستبيان
          </button>
          <button
            type="button"
            className={editStep === "questions" ? "adm-btn adm-btn-primary" : "adm-btn adm-btn-secondary"}
            onClick={() => setEditStep("questions")}
          >
            2. الأسئلة والخيارات
          </button>
        </nav>
      ) : null}

      {!loading && showMetaPanel ? (
        <form className="adm-card adm-form-stack" onSubmit={saveMeta} style={{ maxWidth: 560, margin: isNew ? "3rem auto" : "0 auto 1.5rem" }}>
          <h3 className="adm-section-title">{isNew ? "بيانات الاستبيان" : "تعديل بيانات الاستبيان"}</h3>
          <label className="adm-label">
            العنوان
            <input className="adm-input" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="adm-label">
            الوصف
            <textarea className="adm-textarea" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </label>
          {scope === "student" ? (
            <label className="adm-label">
              المرحلة
              <select className="adm-select" required value={levelId} onChange={(e) => setLevelId(e.target.value)}>
                <option value="">— اختر —</option>
                {levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="adm-label">
            متاح من
            <input className="adm-input" required type="datetime-local" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} />
          </label>
          <label className="adm-label">
            متاح حتى
            <input className="adm-input" required type="datetime-local" value={availableTo} onChange={(e) => setAvailableTo(e.target.value)} />
          </label>
          <label className="adm-label">
            مدة الإجابة بالدقائق (اختياري)
            <input className="adm-input" type="number" min={1} value={durationMin} onChange={(e) => setDurationMin(e.target.value)} />
          </label>
          {!isNew ? (
            <label className="adm-label">
              الحالة
              <select className="adm-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="draft">مسودة</option>
                <option value="published">منشور</option>
                <option value="closed">مغلق</option>
              </select>
            </label>
          ) : (
            <p className="adm-muted" style={{ margin: 0 }}>
              يُنشأ الاستبيان كـ <strong>مسودة</strong>. بعد إضافة الأسئلة يمكنك <strong>نشر الاستبيان</strong> من أسفل صفحة
              الأسئلة أو من قائمة الاستبيانات.
            </p>
          )}
          <div className="adm-form-actions">
            <button type="submit" className="adm-btn adm-btn-primary">
              {isNew ? "تكملة لإضافة الأسئلة" : "حفظ البيانات"}
            </button>
            {!isNew && editStep === "meta" ? (
              <button type="button" className="adm-btn adm-btn-secondary" onClick={() => setEditStep("questions")}>
                الانتقال إلى الأسئلة
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      {!loading && showQuestionsPanel ? (
        <section style={{ marginTop: 8 }}>
          <h3 className="adm-section-title">أسئلة الاستبيان</h3>
          <form className="adm-card adm-form-stack" onSubmit={addQuestion} style={{ maxWidth: 560, margin: "0 auto" }}>
            <label className="adm-label">
              نص السؤال
              <textarea className="adm-textarea" required value={qBody} onChange={(e) => setQBody(e.target.value)} rows={2} />
            </label>
            <label className="adm-label">
              النوع
              <select className="adm-select" value={qType} onChange={(e) => setQType(e.target.value)}>
                <option value="mcq">اختيار من متعدد</option>
                <option value="true_false">صح / خطأ</option>
                <option value="text">إجابة نصية</option>
              </select>
            </label>
            <div className="adm-form-actions">
              <button type="submit" className="adm-btn adm-btn-primary">
                إضافة سؤال
              </button>
            </div>
          </form>

          {questions.map((q) => (
            <div key={q.id} className="adm-card" style={{ maxWidth: 560, margin: "2rem auto 0 auto" }}>
              {editingQuestionId === q.id ? (
                <div className="adm-form-stack">
                  <label className="adm-label">
                    نص السؤال
                    <textarea className="adm-textarea" rows={3} value={editQBody} onChange={(e) => setEditQBody(e.target.value)} />
                  </label>
                  <label className="adm-label">
                    النوع
                    <select className="adm-select" value={editQType} onChange={(e) => setEditQType(e.target.value)}>
                      <option value="mcq">اختيار من متعدد</option>
                      <option value="true_false">صح / خطأ</option>
                      <option value="text">إجابة نصية</option>
                    </select>
                  </label>
                  <label className="adm-label">
                    ترتيب العرض
                    <input className="adm-input" type="number" min={0} value={editQOrder} onChange={(e) => setEditQOrder(e.target.value)} />
                  </label>
                  <div className="adm-form-actions">
                    <button type="button" className="adm-btn adm-btn-primary" onClick={() => void saveEditedQuestion(q.id)}>
                      حفظ السؤال
                    </button>
                    <button type="button" className="adm-btn adm-btn-secondary" onClick={cancelEditQuestion}>
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p style={{ margin: "0 0 8px", fontWeight: 700 }}>{q.body}</p>
                  <p className="adm-muted" style={{ margin: "0 0 8px" }}>
                    النوع: {q.type} — ترتيب: {q.order_no}
                  </p>
                  <button type="button" className="adm-btn adm-btn-secondary" style={{ marginBottom: 10 }} onClick={() => startEditQuestion(q)}>
                    تحرير السؤال
                  </button>
                </>
              )}
              <ul style={{ margin: "0 0 10px", paddingInlineStart: "1.2rem" }}>
                {(q.options || []).map((o) => (
                  <li key={o.id} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                      <input
                        className="adm-input"
                        style={{ flex: "1 1 220px", minWidth: 0 }}
                        value={optionDrafts[String(o.id)] ?? o.option_text}
                        onChange={(e) =>
                          setOptionDrafts((prev) => ({
                            ...prev,
                            [String(o.id)]: e.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="adm-btn adm-btn-secondary"
                        onClick={() => void saveOptionRow(q.id, o.id, o.option_text)}
                      >
                        حفظ الخيار
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              {q.type === "mcq" || q.type === "true_false" ? (
                <form className="adm-form-stack" style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end" }} onSubmit={(e) => addOption(q.id, e)}>
                  <label className="adm-label" style={{ flex: "1 1 200px" }}>
                    خيار جديد
                    <input
                      className="adm-input"
                      value={optForms[q.id]?.text ?? ""}
                      onChange={(e) =>
                        setOptForms((prev) => ({
                          ...prev,
                          [q.id]: { ...prev[q.id], text: e.target.value },
                        }))
                      }
                    />
                  </label>
                  <button type="submit" className="adm-btn adm-btn-secondary">
                    إضافة خيار
                  </button>
                </form>
              ) : null}
            </div>
          ))}

          <div className="adm-form-actions" style={{ marginTop: 16, justifyContent: "center", flexWrap: "wrap", gap: 10 }}>
            <button type="button" className="adm-btn adm-btn-secondary" onClick={() => setEditStep("meta")}>
              العودة لبيانات الاستبيان
            </button>
            <button type="button" className="adm-btn adm-btn-primary" onClick={returnToQuestionnaireList}>
              العودة لقائمة الاستبيانات
            </button>
            <button type="button" className="adm-btn adm-btn-secondary" disabled={publishBusy} onClick={() => void publishQuestionnaire()}>
              {publishBusy ? "جاري النشر…" : "نشر الاستبيان"}
            </button>
            <button type="button" className="adm-btn adm-btn-danger" onClick={removeQuestionnaire}>
              حذف الاستبيان
            </button>
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}
