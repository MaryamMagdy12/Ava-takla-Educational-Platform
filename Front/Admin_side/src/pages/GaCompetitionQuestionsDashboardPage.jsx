import { useEffect, useState } from "react";
import PageShell from "../components/common/PageShell";
import * as adminApi from "../api/adminApi";

const PAGE_KEY = "pg-ga-competition-questions-dashboard";

export default function GaCompetitionQuestionsDashboardPage() {
  const [parts, setParts] = useState([]);
  const [selectedPartId, setSelectedPartId] = useState("");
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [newTestament, setNewTestament] = useState("old");
  const [newChapter, setNewChapter] = useState(1);
  const [importFile, setImportFile] = useState(null);
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

  async function createQuestion(e) {
    e.preventDefault();
    if (!selectedPartId || !newQuestion.trim()) return;
    try {
      await adminApi.createGaCompetitionBankQuestionApi({
        ga_competition_part_bank_id: Number(selectedPartId),
        question_text: newQuestion.trim(),
        question_type: "mcq",
        testament_type: newTestament,
        chapter_number: Number(newChapter),
      });
      setNewQuestion("");
      const rows = await adminApi.fetchGaCompetitionBankQuestionsApi({ part_id: selectedPartId });
      setQuestions(Array.isArray(rows) ? rows : []);
    } catch (e2) {
      setErr(e2.message || "Failed to create bank question.");
    }
  }

  async function importQuestions(e) {
    e.preventDefault();
    if (!importFile) return;
    try {
      const res = await adminApi.importGaCompetitionBankQuestionsApi(importFile);
      const rows = await adminApi.fetchGaCompetitionBankQuestionsApi({ part_id: selectedPartId });
      setQuestions(Array.isArray(rows) ? rows : []);
      setErr(res.errors?.length ? `Imported ${res.created}, with ${res.errors.length} row errors.` : "");
      setImportFile(null);
    } catch (e2) {
      setErr(e2.message || "Failed to import excel.");
    }
  }

  return (
    <PageShell pageKey={PAGE_KEY} title="لوحة أسئلة المسابقات" subtitle="هذه مكتبة أسئلة مستقلة. أنشئ الأسئلة هنا ثم اخترها عند إنشاء المسابقة.">
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
      <form onSubmit={createQuestion} className="adm-card adm-form-stack" style={{ maxWidth: 560, marginTop: 12 }}>
        <label className="adm-label">
          نص السؤال
          <textarea className="adm-textarea" rows={2} value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} />
        </label>
        <label className="adm-label">
          العهد
          <select className="adm-select" value={newTestament} onChange={(e) => setNewTestament(e.target.value)}>
            <option value="old">old</option>
            <option value="new">new</option>
          </select>
        </label>
        <label className="adm-label">
          الأصحاح
          <input className="adm-input" type="number" min={1} value={newChapter} onChange={(e) => setNewChapter(e.target.value)} />
        </label>
        <button type="submit" className="adm-btn adm-btn-primary">
          إضافة سؤال للـ Bank
        </button>
      </form>
      <form onSubmit={importQuestions} className="adm-card adm-form-stack" style={{ maxWidth: 560, marginTop: 12 }}>
        <label className="adm-label">
          استيراد أسئلة من Excel
          <input
            className="adm-input"
            type="file"
            accept=".xlsx,.csv,.txt,.ods"
            onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <button type="submit" className="adm-btn adm-btn-secondary">
          رفع واستيراد
        </button>
      </form>
      <div style={{ marginTop: 12 }}>
        {questions.map((q) => (
          <article key={q.id} className="adm-card">
            <h3 style={{ marginTop: 0 }}>{q.question_text}</h3>
            <p className="adm-muted">
              part_id: {q.ga_competition_part_bank_id ?? "—"} / {q.testament_type ?? "—"} / chapter {q.chapter_number ?? "—"}
            </p>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
