import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageShell from "../components/common/PageShell";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import { useToast } from "../components/common/ToastProvider";
import * as adminApi from "../api/adminApi";
import { ga } from "../navigation/adminPaths";
import "../assets/css/CreateExamPage.css";

const PAGE_KEY = "pg-ga-competition-editor";

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

function displayPeriodAr(startLocal, endLocal) {
  if (!startLocal && !endLocal) return "—";
  try {
    const a = new Date(startLocal);
    const b = new Date(endLocal);
    if (!Number.isNaN(a.getTime()) && !Number.isNaN(b.getTime())) {
      return `${a.toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" })} ← ${b.toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" })}`;
    }
  } catch {
    /* ignore */
  }
  return `${startLocal || "—"} ← ${endLocal || "—"}`;
}

function syncBankPartIdsFromTopics(topicList, bankPartList) {
  if (!Array.isArray(topicList) || !Array.isArray(bankPartList)) return [];
  const titles = new Set(topicList.map((t) => (t.title || "").trim()));
  return bankPartList.filter((p) => titles.has((p.title || "").trim())).map((p) => String(p.id));
}

export default function GaCompetitionEditorPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(!isNew);
  const [creationStep, setCreationStep] = useState(1);
  const [err, setErr] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [durationHours, setDurationHours] = useState("");
  const [status, setStatus] = useState("draft");
  const [questions, setQuestions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [rules, setRules] = useState([]);
  const [bankParts, setBankParts] = useState([]);
  const [bankQuestions, setBankQuestions] = useState([]);
  const [selectedBankPartIds, setSelectedBankPartIds] = useState([]);
  const [partRuleConfigs, setPartRuleConfigs] = useState({});
  const [ruleTopicId, setRuleTopicId] = useState("");
  const [ruleTestamentType, setRuleTestamentType] = useState("old");
  const [ruleChapterNumber, setRuleChapterNumber] = useState("");
  const [ruleDifficulty, setRuleDifficulty] = useState("");
  const [ruleCount, setRuleCount] = useState(1);
  const [editExistingSection, setEditExistingSection] = useState(null);
  const partsImportRef = useRef(null);
  const rulesEditRef = useRef(null);

  const makeRuleRow = (testament = "old") => ({
    id: `${Date.now()}-${Math.random()}`,
    testament_type: testament,
    chapter_number: "",
    question_count: 1,
  });

  async function loadCompetition(competitionId) {
    const [c, partBank, questionBank] = await Promise.all([
      adminApi.fetchGaCompetitionApi(competitionId),
      adminApi.fetchGaCompetitionBankPartsApi(),
      adminApi.fetchGaCompetitionBankQuestionsApi(),
    ]);
    setTitle(c.title ?? "");
    setDescription(c.description ?? "");
    setStartsAt(toLocalInputValue(c.starts_at));
    setEndsAt(toLocalInputValue(c.ends_at));
    setDurationHours(c.max_attempt_duration_hours != null ? String(c.max_attempt_duration_hours) : "");
    setStatus(c.status ?? "draft");
    setQuestions(Array.isArray(c.questions) ? c.questions : []);
    setTopics(Array.isArray(c.topics) ? c.topics : []);
    setRules(Array.isArray(c.question_rules) ? c.question_rules : []);
    const bankArr = Array.isArray(partBank) ? partBank : [];
    setBankParts(bankArr);
    setBankQuestions(Array.isArray(questionBank) ? questionBank : []);
    const topicArr = Array.isArray(c.topics) ? c.topics : [];
    setSelectedBankPartIds(syncBankPartIdsFromTopics(topicArr, bankArr));
    setErr("");
  }

  useEffect(() => {
    if (isNew) {
      Promise.all([adminApi.fetchGaCompetitionBankPartsApi(), adminApi.fetchGaCompetitionBankQuestionsApi()])
        .then(([partsRows, questionRows]) => {
          setBankParts(Array.isArray(partsRows) ? partsRows : []);
          setBankQuestions(Array.isArray(questionRows) ? questionRows : []);
        })
        .catch((e) => setErr(e.message || "فشل تحميل بنك الأجزاء"));
      return;
    }
    setLoading(true);
    loadCompetition(id)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  useEffect(() => {
    if (isNew || !editExistingSection) return;
    const ref = editExistingSection === "parts" ? partsImportRef : editExistingSection === "rules" ? rulesEditRef : null;
    if (!ref) return;
    const t = window.setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
    return () => window.clearTimeout(t);
  }, [isNew, editExistingSection]);

  const selectedParts = bankParts.filter((p) => selectedBankPartIds.includes(String(p.id)));

  function togglePart(partId, checked) {
    const key = String(partId);
    setSelectedBankPartIds((prev) => {
      if (checked) {
        return prev.includes(key) ? prev : [...prev, key];
      }

      return prev.filter((x) => x !== key);
    });
    setPartRuleConfigs((prev) => {
      const next = { ...prev };
      if (checked) {
        if (!next[key]) {
          next[key] = {
            testaments: { old: true, new: false },
            rows: [makeRuleRow("old")],
          };
        }
      } else {
        delete next[key];
      }

      return next;
    });
  }

  function toggleTestament(partId, testament, checked) {
    const key = String(partId);
    setPartRuleConfigs((prev) => {
      const base = prev[key] ?? { testaments: { old: false, new: false }, rows: [] };
      const next = {
        ...prev,
        [key]: {
          ...base,
          testaments: { ...base.testaments, [testament]: checked },
          rows: [...(base.rows || [])],
        },
      };
      if (checked) {
        const hasRow = next[key].rows.some((r) => r.testament_type === testament);
        if (!hasRow) next[key].rows.push(makeRuleRow(testament));
      } else {
        next[key].rows = next[key].rows.filter((r) => r.testament_type !== testament);
      }

      return next;
    });
  }

  function addPartRow(partId, testament) {
    const key = String(partId);
    setPartRuleConfigs((prev) => {
      const base = prev[key] ?? { testaments: { old: false, new: false }, rows: [] };

      return {
        ...prev,
        [key]: {
          ...base,
          rows: [...(base.rows || []), makeRuleRow(testament)],
        },
      };
    });
  }

  function updatePartRow(partId, rowId, field, value) {
    const key = String(partId);
    setPartRuleConfigs((prev) => {
      const base = prev[key];
      if (!base) return prev;

      return {
        ...prev,
        [key]: {
          ...base,
          rows: base.rows.map((r) => (r.id === rowId ? { ...r, [field]: value } : r)),
        },
      };
    });
  }

  function removePartRow(partId, rowId) {
    const key = String(partId);
    setPartRuleConfigs((prev) => {
      const base = prev[key];
      if (!base) return prev;

      return {
        ...prev,
        [key]: {
          ...base,
          rows: base.rows.filter((r) => r.id !== rowId),
        },
      };
    });
  }

  function getChapterStats(partId, testamentType) {
    const map = new Map();
    for (const q of bankQuestions) {
      if (Number(q.ga_competition_part_bank_id) !== Number(partId)) continue;
      if (String(q.testament_type) !== String(testamentType)) continue;
      const chapter = Number(q.chapter_number);
      if (!chapter) continue;
      map.set(chapter, (map.get(chapter) || 0) + 1);
    }

    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([chapter, count]) => ({ chapter, count }));
  }

  function getChapterStatsFromCompetition(topicId, testamentType) {
    if (!topicId) return [];
    const map = new Map();
    for (const q of questions) {
      if (String(q.ga_competition_topic_id) !== String(topicId)) continue;
      if (String(q.testament_type) !== String(testamentType)) continue;
      const st = q.status;
      if (!(st == null || st === "" || st === "active")) continue;
      const chapter = Number(q.chapter_number);
      if (!chapter) continue;
      map.set(chapter, (map.get(chapter) || 0) + 1);
    }

    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([chapter, count]) => ({ chapter, count }));
  }

  function mergeRuleChapterRows(bankRows, compRows) {
    const byCh = new Map();
    for (const { chapter, count } of bankRows) {
      byCh.set(chapter, { chapter, bank: count, comp: 0 });
    }
    for (const { chapter, count } of compRows) {
      const prev = byCh.get(chapter) || { chapter, bank: 0, comp: 0 };
      prev.comp = count;
      byCh.set(chapter, prev);
    }

    return Array.from(byCh.values()).sort((a, b) => a.chapter - b.chapter);
  }

  function bankPartIdForTopicId(topicId) {
    const topic = topics.find((t) => String(t.id) === String(topicId));
    if (!topic) return null;
    const title = (topic.title || "").trim();
    const part = bankParts.find((p) => (p.title || "").trim() === title);
    return part != null ? Number(part.id) : null;
  }

  const ruleFormChapterOptions = useMemo(() => {
    if (!ruleTopicId) return [];
    const partId = bankPartIdForTopicId(ruleTopicId);
    const bankRows = partId != null ? getChapterStats(partId, ruleTestamentType) : [];
    const compRows = getChapterStatsFromCompetition(ruleTopicId, ruleTestamentType);
    return mergeRuleChapterRows(bankRows, compRows);
  }, [ruleTopicId, ruleTestamentType, topics, bankParts, bankQuestions, questions]);

  const lockedBankPartIds = useMemo(() => new Set(syncBankPartIdsFromTopics(topics, bankParts)), [topics, bankParts]);

  const isStep1Complete = selectedBankPartIds.length > 0;
  const isBasicStepComplete = title.trim() !== "" && startsAt !== "" && endsAt !== "";
  const selectedPartIdsSet = new Set(selectedBankPartIds.map((x) => String(x)));
  const creationRules = [];
  for (const partId of selectedBankPartIds) {
    const cfg = partRuleConfigs[String(partId)];
    if (!cfg) continue;
    const rows = Array.isArray(cfg.rows) ? cfg.rows : [];
    for (const row of rows) {
      const chapterNumber = Number(row.chapter_number);
      const questionCount = Number(row.question_count);
      if (!row.testament_type || !chapterNumber || !questionCount) continue;
      creationRules.push({
        partId: Number(partId),
        testament_type: row.testament_type,
        chapter_number: chapterNumber,
        question_count: questionCount,
      });
    }
  }
  const isStep2Complete = creationRules.length > 0;
  const canCreateCompetition = isBasicStepComplete && isStep1Complete && isStep2Complete;

  async function saveCompetition(e) {
    e.preventDefault();
    setErr("");
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      starts_at: fromLocalInputValue(startsAt),
      ends_at: fromLocalInputValue(endsAt),
      status,
    };
    if (durationHours !== "") payload.max_attempt_duration_hours = Number(durationHours);
    try {
      if (isNew) {
        if (!isStep1Complete) {
          setErr("اختر جزءًا واحدًا على الأقل قبل إنشاء المسابقة.");
          return;
        }
        if (!isStep2Complete) {
          setErr("أضف قواعد سحب صحيحة (العهد + الأصحاح + عدد الأسئلة) لكل جزء مختار.");
          return;
        }

        const c = await adminApi.createGaCompetitionApi(payload);
        const importResult = await adminApi.importGaBankPartsIntoCompetitionApi(
          c.id,
          selectedBankPartIds.map((x) => Number(x)),
        );
        const topicMap = importResult?.topic_map || {};
        for (const rule of creationRules) {
          const topicId = topicMap[String(rule.partId)];
          if (!topicId) continue;
          await adminApi.addGaCompetitionRuleApi(c.id, {
            ga_competition_topic_id: Number(topicId),
            testament_type: rule.testament_type,
            chapter_number: rule.chapter_number,
            question_count: rule.question_count,
            difficulty: null,
          });
        }
        navigate(ga("competitions"), { replace: true });
      } else {
        await adminApi.updateGaCompetitionApi(id, payload);
        await loadCompetition(id);
      }
    } catch (e) {
      setErr(e.message || "فشل الحفظ");
    }
  }

  async function importFromBank(e) {
    e.preventDefault();
    if (isNew) return;
    const lockedIds = new Set(syncBankPartIdsFromTopics(topics, bankParts));
    const newlyPicked = selectedBankPartIds.filter((pid) => !lockedIds.has(String(pid)));
    if (newlyPicked.length === 0) {
      setErr("اختر جزءًا جديدًا من البنك لم يُضف للمسابقة بعد (الأجزاء المضافة مسبقًا مُعلّمة ولا تحتاج إعادة استيراد).");
      showToast({ type: "info", message: "لم يُحدد جزء جديد للاستيراد." });
      return;
    }
    setErr("");
    try {
      await adminApi.importGaBankPartsIntoCompetitionApi(
        id,
        newlyPicked.map((x) => Number(x)),
      );
      await loadCompetition(id);
      showToast({ type: "success", message: "تم استيراد الأجزاء والأسئلة المحددة." });
    } catch (e2) {
      setErr(e2.message || "فشل استيراد الأسئلة من بنك المسابقات");
    }
  }

  function openExistingPartsPanel() {
    setEditExistingSection("parts");
  }

  function openExistingRulesPanel() {
    setEditExistingSection("rules");
  }

  async function addRule(e) {
    e.preventDefault();
    if (isNew || !ruleTopicId || !ruleCount) return;
    try {
      await adminApi.addGaCompetitionRuleApi(id, {
        ga_competition_topic_id: Number(ruleTopicId),
        testament_type: ruleTestamentType,
        chapter_number: ruleChapterNumber === "" ? null : Number(ruleChapterNumber),
        question_count: Number(ruleCount),
        difficulty: ruleDifficulty || null,
      });
      await loadCompetition(id);
    } catch (e2) {
      setErr(e2.message || "فشل إضافة قاعدة السحب");
    }
  }

  async function deleteRule(ruleId) {
    try {
      await adminApi.deleteGaCompetitionRuleApi(id, ruleId);
      await loadCompetition(id);
    } catch (e) {
      setErr(e.message || "فشل حذف القاعدة");
    }
  }

  return (
    <PageShell
      pageKey={PAGE_KEY}
      title={isNew ? "مسابقة جديدة" : "تحرير المسابقة"}
      subtitle="النافذة الزمنية يجب أن تكون بين يومين وخمسة أيام. أنشئ المحاور أولاً، ثم أضف الأسئلة وقواعد السحب حسب العهد/الأصحاح."
    >
      <PageToolbar pageKey={PAGE_KEY}>
        <ToolbarLink pageKey={PAGE_KEY} to={ga("competitions")}>
          العودة للمسابقات
        </ToolbarLink>
      </PageToolbar>
      {err ? <p className="adm-error">{err}</p> : null}
      {loading ? <p className="adm-muted">جاري التحميل…</p> : null}

      {isNew && !loading ? (
        <section style={{ marginTop: 24 }}>
          <div className="adm-card" style={{ maxWidth: 760, marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="adm-btn adm-btn-secondary" onClick={() => setCreationStep(1)}>
              1) بيانات المسابقة
            </button>
            <button type="button" className="adm-btn adm-btn-secondary" onClick={() => setCreationStep(2)} disabled={!isBasicStepComplete}>
              2) الأجزاء
            </button>
            <button type="button" className="adm-btn adm-btn-secondary" onClick={() => setCreationStep(3)} disabled={!isStep1Complete}>
              3) العهد/الأصحاح/عدد الأسئلة
            </button>
            <button type="button" className="adm-btn adm-btn-secondary" onClick={() => setCreationStep(4)} disabled={!isStep2Complete}>
              4) مراجعة المسابقة قبل الإنشاء
            </button>
          </div>

          {creationStep === 1 ? (
            <>
              <h3 className="adm-section-title">1) بيانات المسابقة</h3>
              <div className="adm-card adm-form-stack" style={{ maxWidth: 560, marginBottom: "1.5rem" }}>
                <label className="adm-label">
                  العنوان
                  <input className="adm-input" required value={title} onChange={(e) => setTitle(e.target.value)} />
                </label>
                <label className="adm-label">
                  الوصف
                  <textarea className="adm-textarea" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                </label>
                <label className="adm-label">
                  بداية المسابقة
                  <input className="adm-input" required type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
                </label>
                <label className="adm-label">
                  نهاية المسابقة
                  <input className="adm-input" required type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
                </label>
                <label className="adm-label">
                  مدة المحاولة بالساعات (اختياري)
                  <input className="adm-input" type="number" min={1} max={720} value={durationHours} onChange={(e) => setDurationHours(e.target.value)} />
                </label>
                <label className="adm-label">
                  الحالة
                  <select className="adm-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="draft">مسودة</option>
                    <option value="published">منشورة</option>
                    <option value="closed">مغلقة</option>
                  </select>
                </label>
              </div>
              <div className="adm-form-actions" style={{ maxWidth: 560 }}>
                <button type="button" className="adm-btn adm-btn-primary" disabled={!isBasicStepComplete} onClick={() => setCreationStep(2)}>
                  التالي
                </button>
              </div>
            </>
          ) : null}

          {creationStep === 2 ? (
            <>
              <h3 className="adm-section-title">2) اختر الأجزاء </h3>
              <div className="adm-card adm-form-stack" style={{ maxWidth: 720, marginBottom: 20 }}>
                {bankParts.map((part) => (
                  <label
                    key={part.id}
                    className="adm-label"
                    style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}
                  >
                    <span>{part.title}</span>
                    <input
                      type="checkbox"
                      checked={selectedBankPartIds.includes(String(part.id))}
                      onChange={(e) => togglePart(part.id, e.target.checked)}
                    />
                  </label>
                ))}
              </div>
              <div className="adm-form-actions" style={{ maxWidth: 720 }}>
                <button type="button" className="adm-btn adm-btn-secondary" onClick={() => setCreationStep(1)}>
                  السابق
                </button>
                <button type="button" className="adm-btn adm-btn-primary" disabled={!isStep1Complete} onClick={() => setCreationStep(3)}>
                  التالي
                </button>
              </div>
            </>
          ) : null}

          {creationStep === 3 ? (
            <>
              <h3 className="adm-section-title">3) لكل جزء: اختر العهد + الأصحاحات + عدد الأسئلة</h3>
              {selectedParts.map((part) => {
                if (!selectedPartIdsSet.has(String(part.id))) return null;
                const cfg = partRuleConfigs[String(part.id)] ?? { testaments: { old: false, new: false }, rows: [] };
                const rows = Array.isArray(cfg.rows) ? cfg.rows : [];

                return (
                  <div key={part.id} className="adm-card adm-form-stack" style={{ maxWidth: 760, marginBottom: 16 }}>
                    <h4 style={{ margin: 0 }}>{part.title}</h4>
                    <div style={{ display: "flex", gap: 16 }}>
                      <label className="adm-label" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={Boolean(cfg.testaments?.old)}
                          onChange={(e) => toggleTestament(part.id, "old", e.target.checked)}
                        />
                        عهد قديم
                      </label>
                      <label className="adm-label" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={Boolean(cfg.testaments?.new)}
                          onChange={(e) => toggleTestament(part.id, "new", e.target.checked)}
                        />
                        عهد جديد
                      </label>
                    </div>

                    {["old", "new"].map((testament) => {
                      if (!cfg.testaments?.[testament]) return null;
                      const testamentRows = rows.filter((r) => r.testament_type === testament);
                      const chapterStats = getChapterStats(part.id, testament);

                      return (
                        <div key={testament} className="adm-card adm-form-stack" style={{ border: "1px dashed #d9bf67" }}>
                          <h5 style={{ margin: 0 }}>{testament === "old" ? "عهد قديم" : "عهد جديد"}</h5>
                          {chapterStats.length > 0 ? (
                            <p className="adm-muted" style={{ margin: 0 }}>
                              المتاح في قاعدة البيانات:{" "}
                              {chapterStats.map((x) => `أصحاح ${x.chapter} (${x.count} سؤال)`).join(" ، ")}
                            </p>
                          ) : (
                            <p className="adm-muted" style={{ margin: 0 }}>
                              لا توجد أسئلة مخزنة لهذا الجزء/العهد في قاعدة البيانات بعد.
                            </p>
                          )}
                          {testamentRows.map((row) => (
                            <div key={row.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end" }}>
                              <label className="adm-label" style={{ marginBottom: 0 }}>
                                الأصحاح
                                <input
                                  className="adm-input"
                                  type="number"
                                  min={1}
                                  value={row.chapter_number}
                                  onChange={(e) => updatePartRow(part.id, row.id, "chapter_number", e.target.value)}
                                  list={`chapters-${part.id}-${testament}`}
                                />
                                <datalist id={`chapters-${part.id}-${testament}`}>
                                  {chapterStats.map((x) => (
                                    <option key={`${part.id}-${testament}-${x.chapter}`} value={x.chapter} />
                                  ))}
                                </datalist>
                              </label>
                              <label className="adm-label" style={{ marginBottom: 0 }}>
                                عدد الأسئلة
                                <input
                                  className="adm-input"
                                  type="number"
                                  min={1}
                                  value={row.question_count}
                                  onChange={(e) => updatePartRow(part.id, row.id, "question_count", e.target.value)}
                                />
                              </label>
                              <button type="button" className="adm-btn adm-btn-secondary" onClick={() => removePartRow(part.id, row.id)}>
                                حذف
                              </button>
                            </div>
                          ))}
                          <div className="adm-form-actions">
                            <button type="button" className="adm-btn adm-btn-secondary" onClick={() => addPartRow(part.id, testament)}>
                              + إضافة أصحاح
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              <div className="adm-form-actions" style={{ maxWidth: 760 }}>
                <button type="button" className="adm-btn adm-btn-secondary" onClick={() => setCreationStep(2)}>
                  السابق
                </button>
                <button type="button" className="adm-btn adm-btn-primary" disabled={!isStep2Complete} onClick={() => setCreationStep(4)}>
                  التالي
                </button>
              </div>
            </>
          ) : null}

          {creationStep === 4 ? (
            <>
              <h3 className="adm-section-title">4) مراجعة المسابقة قبل الإنشاء</h3>
              <div className="adm-card adm-form-stack" style={{ maxWidth: 760, marginBottom: 16 }}>
                <p style={{ margin: 0 }}><strong>العنوان:</strong> {title || "—"}</p>
                <p style={{ margin: 0 }}><strong>الوصف:</strong> {description || "—"}</p>
                <p style={{ margin: 0 }}><strong>الفترة:</strong> {startsAt || "—"} → {endsAt || "—"}</p>
                <p style={{ margin: 0 }}><strong>عدد الأجزاء المختارة:</strong> {selectedParts.length}</p>
                {/* <p style={{ margin: 0 }}><strong>عدد قواعد السحب:</strong> {creationRules.length}</p> */}
                {selectedParts.map((part) => {
                  const cfg = partRuleConfigs[String(part.id)] ?? { rows: [] };
                  const rows = Array.isArray(cfg.rows) ? cfg.rows : [];
                  return (
                    <div key={part.id} className="adm-card" style={{ marginTop: 8 }}>
                      <strong>{part.title}</strong>
                      <ul style={{ margin: "8px 0 0", paddingInlineStart: "1.2rem" }}>
                        {rows.map((row) => (
                          <li key={row.id}>
                            {row.testament_type === "old" ? "عهد قديم" : "عهد جديد"} - أصحاح {row.chapter_number} - {row.question_count} سؤال
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
              <form onSubmit={saveCompetition} className="adm-card adm-form-stack" style={{ maxWidth: 560, marginBottom: "1.5rem" }}>
                <div className="adm-form-actions">
                  <button type="button" className="adm-btn adm-btn-secondary" onClick={() => setCreationStep(3)}>
                    السابق
                  </button>
                  <button type="submit" className="adm-btn adm-btn-primary" disabled={!canCreateCompetition}>
                    إنشاء ثم متابعة التحرير
                  </button>
                </div>
              </form>
            </>
          ) : null}

          {creationStep === 2 && !isBasicStepComplete ? (
            <div className="adm-card" style={{ maxWidth: 760 }}>
              <p className="adm-muted" style={{ margin: 0 }}>
                الخطوة 2 ستظهر بعد إكمال بيانات المسابقة في الخطوة 1.
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {!isNew && !loading ? (
        <section className="ga-comp-existing-root" style={{ marginTop: 24 }}>
          <h3 className="adm-section-title">مراجعة المسابقة</h3>

          <div className="ga-comp-review-hero adm-form-stack">
            <div className="ga-comp-review-meta">
              <div className="ga-comp-review-row">
                <span className="ga-comp-review-label">العنوان</span>
                <strong className="ga-comp-review-value">{title || "—"}</strong>
              </div>
              <div className="ga-comp-review-row">
                <span className="ga-comp-review-label">الوصف</span>
                <span className="ga-comp-review-value">{description?.trim() ? description : "—"}</span>
              </div>
              <div className="ga-comp-review-row">
                <span className="ga-comp-review-label">الفترة</span>
                <span className="ga-comp-review-value">{displayPeriodAr(startsAt, endsAt)}</span>
              </div>
              <div className="ga-comp-review-row">
                <span className="ga-comp-review-label">مدة المحاولة (ساعات)</span>
                <span className="ga-comp-review-value">{durationHours || "غير محددة"}</span>
              </div>
              <div className="ga-comp-review-row">
                <span className="ga-comp-review-label">الحالة</span>
                <span className="ga-comp-review-pill">{status}</span>
              </div>
              <div className="ga-comp-review-row">
                <span className="ga-comp-review-label">عدد الأجزاء الحالية</span>
                <strong className="ga-comp-review-value">{topics.length}</strong>
              </div>
              <div className="ga-comp-review-row">
                <span className="ga-comp-review-label">عدد قواعد السحب</span>
                <strong className="ga-comp-review-value">{rules.length}</strong>
              </div>
              <div className="ga-comp-review-row">
                <span className="ga-comp-review-label">عدد أسئلة المسابقة</span>
                <strong className="ga-comp-review-value">{questions.length}</strong>
              </div>
            </div>

            <div className="ga-comp-review-parts-nest">
              <p className="ga-comp-review-parts-title">تفاصيل الأجزاء</p>
              {topics.length ? (
                <ul className="ga-comp-review-parts-ul">
                  {topics.map((t) => {
                    const topicRules = rules.filter((r) => String(r.ga_competition_topic_id) === String(t.id));
                    return (
                      <li key={t.id} className="ga-comp-review-part-li">
                        <strong>{t.title}</strong>
                        <span className="ga-comp-review-part-meta"> — قواعد: {topicRules.length}</span>
                        {topicRules.length ? (
                          <ul className="ga-comp-review-rules-ul">
                            {topicRules.map((r) => (
                              <li key={r.id}>
                                {r.testament_type === "old" ? "عهد قديم" : "عهد جديد"} / أصحاح {r.chapter_number ?? "—"} / {r.question_count}{" "}
                                سؤال
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="adm-muted" style={{ margin: 0 }}>
                  لا توجد أجزاء مضافة بعد.
                </p>
              )}
            </div>
          </div>

          <div className="ga-comp-toggle-row">
            <button
              type="button"
              className={`ga-comp-toggle-btn${editExistingSection === "parts" ? " is-active" : ""}`}
              onClick={openExistingPartsPanel}
            >
              اضافة الأجزاء
            </button>
            <button
              type="button"
              className={`ga-comp-toggle-btn${editExistingSection === "rules" ? " is-active" : ""}`}
              onClick={openExistingRulesPanel}
            >
  تعديل المسابقة
            </button>
          </div>

          {editExistingSection === "parts" ? (
            <form ref={partsImportRef} onSubmit={importFromBank} className="ga-comp-import-box adm-form-stack">
              <h4 className="ga-comp-import-heading">استيراد أجزاء وأسئلة من بنك المسابقات</h4>
              <p className="adm-muted" style={{ margin: 0 }}>
                الأجزاء المربوطة بالمسابقة مُعلّمة ولا يمكن إلغاؤها من هنا. اختر أجزاءًا إضافية ثم اضغط استيراد.
              </p>
              <div className="ga-comp-bank-checklist">
                {bankParts.map((p) => {
                  const key = String(p.id);
                  const locked = lockedBankPartIds.has(key);
                  const checked = selectedBankPartIds.includes(key);
                  return (
                    <label key={p.id} className={`ga-comp-bank-item${locked ? " is-locked" : ""}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={locked}
                        onChange={(e) => {
                          if (locked) return;
                          setSelectedBankPartIds((prev) => {
                            if (e.target.checked) return prev.includes(key) ? prev : [...prev, key];
                            return prev.filter((x) => x !== key);
                          });
                        }}
                      />
                      <span className="ga-comp-bank-item-text">{p.title}</span>
                      {locked ? <span className="ga-comp-bank-badge">مضاف للمسابقة</span> : null}
                    </label>
                  );
                })}
              </div>
              <div className="adm-form-actions" style={{ justifyContent: "flex-end" }}>
                <button type="submit" className="adm-btn adm-btn-primary">
                  استيراد المحدد للمسابقة
                </button>
              </div>
            </form>
          ) : null}

          {editExistingSection === "rules" ? (
            <>
              <form ref={rulesEditRef} onSubmit={addRule} className="ga-comp-import-box adm-form-stack" style={{ marginBottom: 20 }}>
                <label className="adm-label">
                  المحور
                  <select
                    className="adm-select"
                    value={ruleTopicId}
                    onChange={(e) => {
                      setRuleTopicId(e.target.value);
                      setRuleChapterNumber("");
                    }}
                    required
                  >
                    <option value="">اختر محورًا</option>
                    {topics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="adm-label">
                  العهد
                  <select
                    className="adm-select"
                    value={ruleTestamentType}
                    onChange={(e) => {
                      setRuleTestamentType(e.target.value);
                      setRuleChapterNumber("");
                    }}
                  >
                    <option value="old">عهد قديم</option>
                    <option value="new">عهد جديد</option>
                  </select>
                </label>
                <label className="adm-label">
                  الأصحاح
                  <select
                    className="adm-select"
                    value={ruleChapterNumber}
                    onChange={(e) => setRuleChapterNumber(e.target.value)}
                    disabled={!ruleTopicId}
                  >
                    <option value="">أي أصحاح (اختياري — حسب التوفر عند السحب)</option>
                    {ruleFormChapterOptions.map((x) => {
                      const bits = [];
                      if (x.comp > 0) bits.push(`${x.comp} في المسابقة`);
                      if (x.bank > 0) bits.push(`${x.bank} في البنك`);
                      const suffix = bits.length ? bits.join("، ") : "0";
                      return (
                        <option key={x.chapter} value={String(x.chapter)}>
                          أصحاح {x.chapter} ({suffix})
                        </option>
                      );
                    })}
                  </select>
                </label>
                {ruleTopicId && ruleFormChapterOptions.length === 0 ? (
                  <p className="adm-muted" style={{ margin: 0 }}>
                    لا توجد أسئلة بهذا العهد مع رقم أصحاح في أسئلة المسابقة أو في بنك الأسئلة لهذا المحور بعد.
                  </p>
                ) : null}
                {ruleTopicId && bankPartIdForTopicId(ruleTopicId) == null && ruleFormChapterOptions.length > 0 ? (
                  <p className="adm-muted" style={{ margin: 0 }}>
                    الأصحاح تُعرض من أسئلة المسابقة المحفوظة (عنوان المحور لا يطابق جزءًا في بنك الأجزاء).
                  </p>
                ) : null}
                <label className="adm-label">
                  عدد الأسئلة
                  <input className="adm-input" type="number" min={1} value={ruleCount} onChange={(e) => setRuleCount(e.target.value)} />
                </label>
                <div className="adm-form-actions">
                  <button type="submit" className="adm-btn adm-btn-primary">
                    إضافة قاعدة
                  </button>
                </div>
              </form>
              <div className="adm-card" style={{ maxWidth: 760 }}>
                <ul style={{ margin: 0, paddingInlineStart: "1.2rem" }}>
                  {rules.map((r) => (
                    <li key={r.id} style={{ marginBottom: 8 }}>
                      topic:{r.ga_competition_topic_id} / {r.testament_type} / chapter:{r.chapter_number ?? "any"} / count:{r.question_count}
                      <button
                        type="button"
                        className="adm-btn adm-btn-secondary"
                        style={{ marginInlineStart: 8 }}
                        onClick={() => deleteRule(r.id)}
                      >
                        حذف
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : null}
        </section>
      ) : null}
    </PageShell>
  );
}
