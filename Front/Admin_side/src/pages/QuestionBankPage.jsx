import { useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import HighlightedText from "../components/common/HighlightedText";
import PageShell from "../components/common/PageShell";
import Panel from "../components/common/Panel";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import { useAdminData } from "../context/AdminDataContext";
import useDebouncedValue from "../hooks/useDebouncedValue";
import * as adminApi from "../api/adminApi";
import { useAdminNav } from "../context/AdminNavContext";
import { sp } from "../navigation/adminPaths";
import "../assets/css/QuestionBankPage.css";
import { useDialog } from "../components/common/DialogProvider";
import { useToast } from "../components/common/ToastProvider";

const PAGE_KEY = "pg-questions";

function translateDifficulty(value) {
  if (value === "easy") return "سهل";
  if (value === "medium") return "متوسط";
  if (value === "hard") return "صعب";
  return value || "—";
}

function translateQuestionType(value) {
  if (value === "mcq") return "اختيار من متعدد";
  return value || "—";
}

function QuestionBankPage() {
  const nav = useAdminNav();
  const isSpecialLms = nav === sp;
  const { questions, courses, refreshQuestions } = useAdminData();
  const { confirm, alertMessage } = useDialog();
  const { showToast } = useToast();
  const { globalSearch } = useOutletContext();
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const debouncedGlobalSearch = useDebouncedValue(globalSearch);
  const highlightQueries = [debouncedSearch, debouncedGlobalSearch];

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      const localQuery = debouncedSearch.trim().toLowerCase();
      const sharedQuery = debouncedGlobalSearch.trim().toLowerCase();
      const localOptionBlob = (q.options ?? []).map((o) => o.text).join(" ").toLowerCase();
      const matchesSearch =
        !localQuery || q.text.toLowerCase().includes(localQuery) || localOptionBlob.includes(localQuery);
      const optionBlob = (q.options ?? []).map((o) => o.text).join(" ").toLowerCase();
      const matchesShared =
        !sharedQuery ||
        q.text.toLowerCase().includes(sharedQuery) ||
        optionBlob.includes(sharedQuery) ||
        String(q.course || "").toLowerCase().includes(sharedQuery) ||
        String(q.track || "").toLowerCase().includes(sharedQuery) ||
        String(q.question_type || "").toLowerCase().includes(sharedQuery) ||
        String(q.difficulty || "").toLowerCase().includes(sharedQuery);
      const matchesCourse = !courseFilter || q.courseId === Number(courseFilter);
      const matchesDifficulty = !difficultyFilter || q.difficulty === difficultyFilter;
      return matchesSearch && matchesShared && matchesCourse && matchesDifficulty;
    });
  }, [questions, debouncedSearch, debouncedGlobalSearch, courseFilter, difficultyFilter]);

  return (
    <PageShell
      pageKey={PAGE_KEY}
      title="بنك الأسئلة"
      subtitle="الأسئلة المحمّلة من النظام مع إمكانية التصفية حسب المادة ومستوى الصعوبة."
    >
      <PageToolbar pageKey={PAGE_KEY}>
        <input
          className={`${PAGE_KEY}-toolbar-search`}
          placeholder="ابحث في الأسئلة..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={`${PAGE_KEY}-toolbar-select`}
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
        >
          <option value="">جميع المواد</option>
          {courses.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className={`${PAGE_KEY}-toolbar-select`}
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
        >
          <option value="">كل المستويات</option>
          <option value="easy">سهل</option>
          <option value="medium">متوسط</option>
          <option value="hard">صعب</option>
        </select>
        <ToolbarLink pageKey={PAGE_KEY} to={nav("add-question")} variant="primary">
          + إضافة سؤال
        </ToolbarLink>
      </PageToolbar>

      <Panel pageKey={PAGE_KEY}>
        {filtered.length === 0 ? (
          <div className={`${PAGE_KEY}-empty`}>لا توجد أسئلة حاليًا. استخدم صفحة إضافة سؤال لإنشاء سؤال جديد.</div>
        ) : (
          filtered.map((q) => (
            <div key={q.id} className={`${PAGE_KEY}-question-row`}>
              <HighlightedText
                text={q.text}
                className={`${PAGE_KEY}-question-text`}
                queries={highlightQueries}
                highlightClassName={`${PAGE_KEY}-highlight`}
              />
              {q.options?.length ? (
                <ul className={`${PAGE_KEY}-options`}>
                  {q.options.map((opt) => (
                    <li
                      key={opt.id}
                      className={
                        opt.isCorrect
                          ? `${PAGE_KEY}-option ${PAGE_KEY}-option--correct`
                          : `${PAGE_KEY}-option`
                      }
                    >
                      <span className={`${PAGE_KEY}-option-label`}>{opt.label}.</span>
                      <HighlightedText
                        text={opt.text}
                        className={`${PAGE_KEY}-option-text`}
                        queries={highlightQueries}
                        highlightClassName={`${PAGE_KEY}-highlight`}
                      />
                      {opt.isCorrect ? (
                        <span className={`${PAGE_KEY}-option-badge`}>الإجابة الصحيحة</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className={`${PAGE_KEY}-question-meta`}>
                <span className={`${PAGE_KEY}-tag ${PAGE_KEY}-tag--${q.difficulty}`}>{translateDifficulty(q.difficulty)}</span>
                <span className={`${PAGE_KEY}-tag`}>
                  <HighlightedText text={q.course} queries={highlightQueries} highlightClassName={`${PAGE_KEY}-highlight`} />
                </span>
                {!isSpecialLms ? (
                  <span className={`${PAGE_KEY}-tag`}>
                    <HighlightedText text={q.track} queries={highlightQueries} highlightClassName={`${PAGE_KEY}-highlight`} />
                  </span>
                ) : null}
                <span className={`${PAGE_KEY}-tag`}>{translateQuestionType(q.question_type)}</span>
                <span className={`${PAGE_KEY}-question-actions`}>
                  <Link className={`${PAGE_KEY}-action-btn`} to={nav(`add-question/${q.id}`)}>
                    تعديل
                  </Link>
                  <button
                    type="button"
                    className={`${PAGE_KEY}-action-btn adm-delete`}
                    onClick={async () => {
                      const ok = await confirm({ title: "حذف السؤال", message: "هل تريد حذف هذا السؤال؟" });
                      if (!ok) return;
                      try {
                        await adminApi.deleteQuestionApi(q.id);
                        await refreshQuestions();
                        showToast({ type: "success", message: "تم حذف السؤال." });
                      } catch (e) {
                        await alertMessage({ title: "تعذر الحذف", message: e.message });
                      }
                    }}
                  >
                    حذف
                  </button>
                </span>
              </div>
            </div>
          ))
        )}
      </Panel>
    </PageShell>
  );
}

export default QuestionBankPage;
