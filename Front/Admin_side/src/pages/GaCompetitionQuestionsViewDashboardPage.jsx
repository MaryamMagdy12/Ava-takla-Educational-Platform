import { useEffect, useState } from "react";
import PageShell from "../components/common/PageShell";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import * as adminApi from "../api/adminApi";
import { useDialog } from "../components/common/DialogProvider";
import { useToast } from "../components/common/ToastProvider";
import { ga } from "../navigation/adminPaths";
import "../assets/css/QuestionBankPage.css";

const PAGE_KEY = "pg-questions";

export default function GaCompetitionQuestionsViewDashboardPage() {
  const { confirm, alertMessage } = useDialog();
  const { showToast } = useToast();
  const [parts, setParts] = useState([]);
  const [selectedPartId, setSelectedPartId] = useState("");
  const [questions, setQuestions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editTestament, setEditTestament] = useState("old");
  const [editChapter, setEditChapter] = useState(1);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    Promise.all([adminApi.fetchGaCompetitionBankPartsApi(), adminApi.fetchGaCompetitionBankQuestionsApi()])
      .then(([pRows, qRows]) => {
        const p = Array.isArray(pRows) ? pRows : [];
        setParts(p);
        if (p.length > 0) setSelectedPartId(String(p[0].id));
        setQuestions(Array.isArray(qRows) ? qRows : []);
      })
      .catch((e) => setErr(e.message || "Failed to load bank questions."));
  }, []);

  useEffect(() => {
    if (!selectedPartId) return;
    adminApi
      .fetchGaCompetitionBankQuestionsApi({ part_id: selectedPartId })
      .then((rows) => setQuestions(Array.isArray(rows) ? rows : []))
      .catch((e) => setErr(e.message || "Failed to load bank questions."));
  }, [selectedPartId]);

  async function reload() {
    const rows = await adminApi.fetchGaCompetitionBankQuestionsApi({ part_id: selectedPartId });
    setQuestions(Array.isArray(rows) ? rows : []);
  }

  function startEdit(q) {
    setEditingId(q.id);
    setEditText(q.question_text || "");
    setEditTestament(q.testament_type || "old");
    setEditChapter(q.chapter_number || 1);
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    try {
      await adminApi.updateGaCompetitionBankQuestionApi(editingId, {
        question_text: editText,
        testament_type: editTestament,
        chapter_number: Number(editChapter),
      });
      setEditingId(null);
      await reload();
      showToast({ type: "success", message: "تم تعديل السؤال." });
    } catch (e) {
      await alertMessage({ title: "تعذر التعديل", message: e.message || "Update failed." });
    } finally {
      setSaving(false);
    }
  }

  async function deleteQuestion(q) {
    const ok = await confirm({ title: "حذف السؤال", message: "هل تريد حذف هذا السؤال من بنك المسابقات؟" });
    if (!ok) return;
    try {
      await adminApi.deleteGaCompetitionBankQuestionApi(q.id);
      await reload();
      showToast({ type: "success", message: "تم حذف السؤال." });
    } catch (e) {
      await alertMessage({ title: "تعذر الحذف", message: e.message || "Delete failed." });
    }
  }

  return (
    <PageShell pageKey={PAGE_KEY} title="عرض أسئلة المسابقات" subtitle="لوحة منفصلة لمراجعة أسئلة بنك المسابقات فقط.">
      <PageToolbar pageKey={PAGE_KEY}>
        <ToolbarLink pageKey={PAGE_KEY} to={ga("competition-questions/add")} variant="primary">
          + إضافة سؤال
        </ToolbarLink>
      </PageToolbar>
      {err ? <p className="adm-error">{err}</p> : null}
      <label className="adm-label" style={{ maxWidth: 420 }}>
        اختر الجزء
        <select className="adm-select" value={selectedPartId} onChange={(e) => setSelectedPartId(e.target.value)}>
          {parts.map((x) => (
            <option key={x.id} value={x.id}>
              {x.title}
            </option>
          ))}
        </select>
      </label>

      <div className={`${PAGE_KEY}-panel`}>
        {questions.length === 0 ? <div className={`${PAGE_KEY}-empty`}>لا توجد أسئلة لهذا الجزء.</div> : null}
        {questions.map((row) => (
          <div key={row.id} className={`${PAGE_KEY}-question-row`}>
            <strong className={`${PAGE_KEY}-question-text`}>{row.question_text}</strong>
            <div className={`${PAGE_KEY}-question-meta`}>
              <span className={`${PAGE_KEY}-tag`}>part:{row.ga_competition_part_bank_id ?? "—"}</span>
              <span className={`${PAGE_KEY}-tag`}>{row.testament_type ?? "—"}</span>
              <span className={`${PAGE_KEY}-tag`}>chapter {row.chapter_number ?? "—"}</span>
            </div>
            <ul className={`${PAGE_KEY}-options`}>
              {(row.options || []).map((o, idx) => (
                <li key={o.id} className={`${PAGE_KEY}-option ${o.is_correct ? `${PAGE_KEY}-option--correct` : ""}`}>
                  <span className={`${PAGE_KEY}-option-label`}>{String.fromCharCode(65 + idx)}.</span>
                  <span className={`${PAGE_KEY}-option-text`}>{o.option_text}</span>
                  {o.is_correct ? <span className={`${PAGE_KEY}-option-badge`}>الإجابة الصحيحة</span> : null}
                </li>
              ))}
            </ul>
            <div className={`${PAGE_KEY}-question-actions`}>
              <button type="button" className={`${PAGE_KEY}-action-btn`} onClick={() => startEdit(row)}>
                تعديل
              </button>
              <button type="button" className={`${PAGE_KEY}-action-btn adm-delete`} onClick={() => deleteQuestion(row)}>
                حذف
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingId ? (
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
          onClick={() => setEditingId(null)}
        >
          <div className="adm-card adm-form-stack" style={{ width: "min(640px, 100%)" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>تعديل السؤال</h3>
            <label className="adm-label">
              نص السؤال
              <textarea className="adm-textarea" rows={3} value={editText} onChange={(e) => setEditText(e.target.value)} />
            </label>
            <label className="adm-label">
              العهد
              <select className="adm-select" value={editTestament} onChange={(e) => setEditTestament(e.target.value)}>
                <option value="old">old</option>
                <option value="new">new</option>
              </select>
            </label>
            <label className="adm-label">
              الأصحاح
              <input className="adm-input" type="number" min={1} value={editChapter} onChange={(e) => setEditChapter(e.target.value)} />
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" className="adm-btn adm-btn-secondary" onClick={() => setEditingId(null)}>
                إلغاء
              </button>
              <button type="button" className="adm-btn adm-btn-primary" onClick={saveEdit} disabled={saving}>
                {saving ? "جارٍ الحفظ..." : "حفظ"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
