import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageShell from "../components/common/PageShell";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import { useDialog } from "../components/common/DialogProvider";
import { useToast } from "../components/common/ToastProvider";
import * as adminApi from "../api/adminApi";
import { ga } from "../navigation/adminPaths";
import "../assets/css/CreateExamPage.css";

const PAGE_KEY = "pg-exam-new";

export default function GaFamilyExamEditorPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { confirm } = useDialog();
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableTo, setAvailableTo] = useState("");
  const [status, setStatus] = useState("draft");
  const [showImmediate, setShowImmediate] = useState(true);
  const [scopeTestament, setScopeTestament] = useState("old");
  const [scopeChapterInput, setScopeChapterInput] = useState("");
  const [scopeQuestionCountInput, setScopeQuestionCountInput] = useState("1");
  const [chapterScopes, setChapterScopes] = useState([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [questionBankRows, setQuestionBankRows] = useState([]);
  const [importFile, setImportFile] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isNew) return;
    adminApi
      .fetchGaFamilyExamApi(id)
      .then((x) => {
        setTitle(x.title ?? "");
        setDescription(x.description ?? "");
        setDurationMinutes(x.duration_minutes ?? 60);
        setAvailableFrom((x.available_from ?? "").slice(0, 16));
        setAvailableTo((x.available_to ?? "").slice(0, 16));
        setStatus(x.status ?? "draft");
        setShowImmediate(Boolean(x.show_result_immediately ?? true));
        setChapterScopes(
          Array.isArray(x.chapter_scopes)
            ? x.chapter_scopes
                .map((scope) => ({
                  testament_type: scope?.testament_type === "new" ? "new" : "old",
                  chapter_number: Number(scope?.chapter_number),
                  question_count: Math.max(0, Number(scope?.question_count ?? 0)),
                }))
                .filter((scope) => Number.isInteger(scope.chapter_number) && scope.chapter_number > 0)
            : [],
        );
        setQuestionCount(Math.max(0, Number(x.question_count ?? 0)));
      })
      .catch((e) => setErr(e.message || "Failed to load exam."));
  }, [id, isNew]);

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

  const availableChapterOptions = useMemo(() => {
    const map = new Map();
    questionBankRows.forEach((q) => {
      if (String(q.testament_type) !== String(scopeTestament)) return;
      const chapter = Number(q.chapter_number);
      if (!Number.isFinite(chapter) || chapter < 1) return;
      map.set(chapter, (map.get(chapter) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([chapter, count]) => ({ chapter, count }));
  }, [questionBankRows, scopeTestament]);

  const availablePoolCountByScope = useMemo(() => {
    if (!Array.isArray(questionBankRows) || questionBankRows.length === 0) return 0;
    if (!Array.isArray(chapterScopes) || chapterScopes.length === 0) return questionBankRows.length;
    const scopeSet = new Set(chapterScopes.map((s) => `${s.testament_type}:${Number(s.chapter_number)}`));
    return questionBankRows.filter((q) => scopeSet.has(`${q.testament_type}:${Number(q.chapter_number)}`)).length;
  }, [questionBankRows, chapterScopes]);

  const scopedQuestionCount = useMemo(
    () => chapterScopes.reduce((sum, scope) => sum + Math.max(0, Number(scope.question_count ?? 0)), 0),
    [chapterScopes],
  );

  const hasScopedChapters = chapterScopes.length > 0;
  const effectiveQuestionCount = hasScopedChapters ? scopedQuestionCount : Math.max(0, Number(questionCount || 0));

  async function onSave(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      duration_minutes: Number(durationMinutes),
      available_from: new Date(availableFrom).toISOString(),
      available_to: new Date(availableTo).toISOString(),
      status,
      show_result_immediately: showImmediate,
      question_count: effectiveQuestionCount,
      chapter_scopes: chapterScopes.map((scope) => ({
        testament_type: scope.testament_type,
        chapter_number: Number(scope.chapter_number),
        question_count: Math.max(0, Number(scope.question_count ?? 0)),
      })),
    };
    try {
      if (isNew) {
        await adminApi.createGaFamilyExamApi(payload);
        showToast({ type: "success", message: "تم إنشاء الامتحان." });
        navigate(ga("family-exams"), { replace: true });
      } else {
        await adminApi.updateGaFamilyExamApi(id, payload);
        showToast({ type: "success", message: "تم حفظ التعديلات." });
      }
    } catch (e2) {
      setErr(e2.message || "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  function addChapterScope() {
    const chapter = Number(scopeChapterInput);
    const scopeQuestionCount = Number(scopeQuestionCountInput);
    if (!Number.isInteger(chapter) || chapter < 1) {
      setErr("يرجى إدخال رقم أصحاح صحيح.");
      return;
    }
    if (!Number.isInteger(scopeQuestionCount) || scopeQuestionCount < 0) {
      setErr("يرجى إدخال عدد أسئلة صحيح لكل أصحاح.");
      return;
    }

    const key = `${scopeTestament}:${chapter}`;
    const exists = chapterScopes.some((x) => `${x.testament_type}:${x.chapter_number}` === key);
    if (exists) {
      setErr("هذا الأصحاح مضاف بالفعل ضمن نطاق الامتحان.");
      return;
    }

    setChapterScopes((prev) =>
      [...prev, { testament_type: scopeTestament, chapter_number: chapter, question_count: scopeQuestionCount }].sort((a, b) => {
        if (a.testament_type === b.testament_type) return a.chapter_number - b.chapter_number;
        return a.testament_type.localeCompare(b.testament_type);
      }),
    );
    setScopeChapterInput("");
    setScopeQuestionCountInput("1");
    setErr("");
  }

  function removeChapterScope(scope) {
    const key = `${scope.testament_type}:${scope.chapter_number}`;
    setChapterScopes((prev) => prev.filter((x) => `${x.testament_type}:${x.chapter_number}` !== key));
  }

  function updateChapterScopeCount(scope, value) {
    const key = `${scope.testament_type}:${scope.chapter_number}`;
    const numericValue = Math.max(0, Number(value));
    setChapterScopes((prev) =>
      prev.map((x) => {
        const candidateKey = `${x.testament_type}:${x.chapter_number}`;
        if (candidateKey !== key) return x;
        return { ...x, question_count: Number.isFinite(numericValue) ? numericValue : 0 };
      }),
    );
  }

  async function onImportQuestions(e) {
    e.preventDefault();
    if (isNew || !importFile) return;
    try {
      const ok = await confirm({
        title: "استيراد أسئلة الامتحان",
        message: "هل تريد تأكيد استيراد الأسئلة من الملف؟ سيتم إضافة الأسئلة إلى هذا الامتحان.",
      });
      if (!ok) return;
      const res = await adminApi.importGaFamilyExamQuestionsApi(id, importFile);
      if (res.errors?.length) {
        setErr(`Imported ${res.created}, with ${res.errors.length} row errors.`);
      } else {
        setErr("");
        showToast({ type: "success", message: `تم استيراد ${res.created ?? 0} سؤال.` });
      }
      setImportFile(null);
    } catch (e2) {
      setErr(e2.message || "Import failed.");
    }
  }

  return (
    <PageShell
      pageKey={PAGE_KEY}
      title={isNew ? "إضافة امتحان عائلات" : "تعديل امتحان العائلات"}
      subtitle="نفس هيكل إدارة امتحانات الطلاب مع إعدادات مخصصة للعائلات."
    >
      <PageToolbar pageKey={PAGE_KEY}>
        <ToolbarLink pageKey={PAGE_KEY} to={ga("family-exams")}>
          العودة للقائمة
        </ToolbarLink>
      </PageToolbar>
      {err ? <p className="adm-error">{err}</p> : null}
      <form className={`${PAGE_KEY}-exam-layout`} onSubmit={onSave}>
        <section className={`${PAGE_KEY}-exam-main`}>
          <h3 className={`${PAGE_KEY}-exam-title`}>{isNew ? "امتحان عائلات جديد" : "تعديل الامتحان"}</h3>
          <div className={`${PAGE_KEY}-form-card-grid`}>
            <label className={`${PAGE_KEY}-form-label`}>
              عنوان الامتحان
              <input className={`${PAGE_KEY}-form-control`} value={title} onChange={(e) => setTitle(e.target.value)} required />
            </label>
            <label className={`${PAGE_KEY}-form-label`} style={{ gridColumn: "1 / -1" }}>
              الوصف
              <textarea className={`${PAGE_KEY}-form-control`} value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </label>
            <label className={`${PAGE_KEY}-form-label`}>
              عدد الأسئلة
              <input
                className={`${PAGE_KEY}-form-control`}
                type="number"
                min={0}
                value={effectiveQuestionCount}
                onChange={(e) => setQuestionCount(e.target.value)}
                readOnly={hasScopedChapters}
              />
            </label>
            <label className={`${PAGE_KEY}-form-label`}>
              عدد أسئلة بنك الامتحان حسب النطاق
              <input className={`${PAGE_KEY}-form-control`} type="number" min={0} value={availablePoolCountByScope} readOnly />
            </label>
            <label className={`${PAGE_KEY}-form-label`}>
              مدة الامتحان بالدقائق
              <input
                className={`${PAGE_KEY}-form-control`}
                type="number"
                min={1}
                max={720}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
              />
            </label>
            <label className={`${PAGE_KEY}-form-label`}>
              متاح من
              <input className={`${PAGE_KEY}-form-control`} type="datetime-local" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} required />
            </label>
            <label className={`${PAGE_KEY}-form-label`}>
              متاح إلى
              <input className={`${PAGE_KEY}-form-control`} type="datetime-local" value={availableTo} onChange={(e) => setAvailableTo(e.target.value)} required />
            </label>
            <label className={`${PAGE_KEY}-form-label`}>
              الحالة
              <select className={`${PAGE_KEY}-form-control`} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="draft">مسودة</option>
                <option value="published">منشور</option>
                <option value="closed">مغلق</option>
              </select>
            </label>
            <label className={`${PAGE_KEY}-form-label`} style={{ gridColumn: "1 / -1" }}>
              <input type="checkbox" checked={showImmediate} onChange={(e) => setShowImmediate(e.target.checked)} style={{ marginInlineEnd: 8 }} />
              إظهار النتيجة والإجابات مباشرة بعد التسليم
            </label>
            <div className={`${PAGE_KEY}-form-label`} style={{ gridColumn: "1 / -1" }}>
              <span style={{ display: "block", marginBottom: 8, fontWeight: 700 }}>نطاق الأصحاحات للامتحان</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8 }}>
                <select className={`${PAGE_KEY}-form-control`} value={scopeTestament} onChange={(e) => setScopeTestament(e.target.value)}>
                  <option value="old">عهد قديم</option>
                  <option value="new">عهد جديد</option>
                </select>
                <select
                  className={`${PAGE_KEY}-form-control`}
                  value={scopeChapterInput}
                  onChange={(e) => setScopeChapterInput(e.target.value)}
                >
                  <option value="">رقم الأصحاح</option>
                  {availableChapterOptions.map((x) => (
                    <option key={`${scopeTestament}-${x.chapter}`} value={String(x.chapter)}>
                      أصحاح {x.chapter} ({x.count} سؤال)
                    </option>
                  ))}
                </select>
                <input
                  className={`${PAGE_KEY}-form-control`}
                  type="number"
                  min={0}
                  value={scopeQuestionCountInput}
                  onChange={(e) => setScopeQuestionCountInput(e.target.value)}
                  placeholder="عدد الأسئلة"
                />
                <button type="button" className={`${PAGE_KEY}-form-card-submit`} onClick={addChapterScope}>
                  إضافة
                </button>
              </div>
              <p className="adm-muted" style={{ marginTop: 6, marginBottom: 0 }}>
                الأصحاحات الظاهرة يتم جلبها مباشرة من قاعدة البيانات حسب العهد المختار.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {chapterScopes.length === 0 ? (
                  <span style={{ color: "#7a7a7a" }}>بدون تحديد: سيتم اعتماد جميع أسئلة الامتحان المتاحة.</span>
                ) : (
                  chapterScopes.map((scope) => (
                    <div
                      key={`${scope.testament_type}-${scope.chapter_number}`}
                      style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                    >
                      <span className="adm-btn adm-btn-secondary" style={{ cursor: "default" }}>
                        {scope.testament_type === "old" ? "عهد قديم" : "عهد جديد"} - أصحاح {scope.chapter_number}
                      </span>
                      <input
                        className={`${PAGE_KEY}-form-control`}
                        style={{ width: 110 }}
                        type="number"
                        min={0}
                        value={Math.max(0, Number(scope.question_count ?? 0))}
                        onChange={(e) => updateChapterScopeCount(scope, e.target.value)}
                        title="عدد الأسئلة لهذا الأصحاح"
                      />
                      <button type="button" className="adm-btn adm-btn-secondary" onClick={() => removeChapterScope(scope)}>
                        حذف
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
        <aside className={`${PAGE_KEY}-exam-summary`}>
          <h4>ملخص الامتحان</h4>
          <p>المدة: {durationMinutes || 0} دقيقة</p>
          <p>من: {availableFrom || "—"}</p>
          <p>إلى: {availableTo || "—"}</p>
          <p>الحالة: {status}</p>
          <p>نطاق الأصحاحات: {chapterScopes.length > 0 ? chapterScopes.length : "غير محدد"}</p>
          <button type="submit" className={`${PAGE_KEY}-form-card-submit`} disabled={busy}>
            {busy ? "جارٍ الحفظ..." : isNew ? "إنشاء الامتحان" : "حفظ التعديلات"}
          </button>
        </aside>
      </form>
      {!isNew ? (
        <form onSubmit={onImportQuestions} className="adm-card adm-form-stack" style={{ maxWidth: 560, marginTop: 16 }}>
          <label className="adm-label">
            رفع ملف Excel لأسئلة هذا الامتحان
            <input
              className="adm-input"
              type="file"
              accept=".xlsx,.csv,.txt,.ods"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <button className="adm-btn adm-btn-secondary" type="submit">
            استيراد الأسئلة
          </button>
        </form>
      ) : null}
    </PageShell>
  );
}
