import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "../components/common/PageShell";
import Panel from "../components/common/Panel";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import { useAdminData } from "../context/AdminDataContext";
import * as adminApi from "../api/adminApi";
import { useAdminNav } from "../context/AdminNavContext";
import { sp } from "../navigation/adminPaths";
import "../assets/css/CoursesPage.css";
import { useDialog } from "../components/common/DialogProvider";
import { useToast } from "../components/common/ToastProvider";

const PAGE_KEY = "pg-courses";

function courseBelongsToTrack(row, trackFilter, lectures, exams, books) {
  if (trackFilter === "all") return true;
  if (String(row.track_id ?? "") === trackFilter) return true;
  const tid = String(trackFilter);
  return (
    lectures.some((l) => l.courseId === row.id && String(l.trackId ?? "") === tid) ||
    exams.some((e) => e.courseId === row.id && String(e.trackId ?? "") === tid) ||
    books.some((b) => b.courseId === row.id && String(b.trackId ?? "") === tid)
  );
}

function countsForCourse(row, lectures, exams, books) {
  let lec = row.lectures_count;
  let ex = row.exams_count;
  if (lec == null) lec = lectures.filter((l) => l.courseId === row.id).length;
  if (ex == null) ex = exams.filter((e) => e.courseId === row.id).length;
  const bk = books.filter((b) => b.courseId === row.id).length;
  return { lec, ex, bk };
}

function lectureTypeLabel(lectureType) {
  if (lectureType === "video") return "فيديو";
  if (lectureType === "audio") return "صوت";
  return lectureType || "—";
}

function mediaToneClass(id) {
  const t = Number(id) % 4;
  return `${PAGE_KEY}-card-media--tone-${t}`;
}

export default function CoursesPage() {
  const nav = useAdminNav();
  const isSpecialLms = nav === sp;
  const { courses, tracks, lectures, exams, books, refreshCourses } = useAdminData();
  const [search, setSearch] = useState("");
  const [trackFilter, setTrackFilter] = useState("all");
  const [contentModal, setContentModal] = useState(null);
  const { confirm, alertMessage } = useDialog();
  const { showToast } = useToast();

  const tracksMap = useMemo(() => new Map(tracks.map((item) => [String(item.id), item.name])), [tracks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((course) => {
      const matchesQuery =
        !q || course.name.toLowerCase().includes(q) || String(course.description || "").toLowerCase().includes(q);
      const matchesTrack =
        isSpecialLms || courseBelongsToTrack(course, trackFilter, lectures, exams, books);
      return matchesQuery && matchesTrack;
    });
  }, [books, courses, exams, isSpecialLms, lectures, search, trackFilter]);

  const modalLists = useMemo(() => {
    if (!contentModal) return { lectures: [], books: [], exams: [] };
    const cid = contentModal.id;
    return {
      lectures: lectures.filter((l) => Number(l.courseId) === Number(cid)),
      books: books.filter((b) => Number(b.courseId) === Number(cid)),
      exams: exams.filter((e) => Number(e.courseId) === Number(cid)),
    };
  }, [books, contentModal, exams, lectures]);

  useEffect(() => {
    if (!contentModal) return;
    const onKey = (e) => {
      if (e.key === "Escape") setContentModal(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [contentModal]);

  return (
    <PageShell
      pageKey={PAGE_KEY}
      title="إدارة المواد"
      subtitle={
        isSpecialLms
          ? "المواد كتالوج؛ المحتوى (محاضرات، امتحانات، أسئلة) يُربط بالمسار عند إضافته وليس عبر المادة."
          : "استعراض المواد الدراسية على شكل بطاقات، مع تصفية حسب المسار."
      }
    >
      {contentModal ? (
        <div className="dlg-overlay" role="presentation" onClick={() => setContentModal(null)}>
          <div
            className={`dlg-card ${PAGE_KEY}-content-modal`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${PAGE_KEY}-content-modal-title`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`${PAGE_KEY}-content-modal-head`}>
              <h3 id={`${PAGE_KEY}-content-modal-title`} className="dlg-title">
                محتوى المادة: {contentModal.name}
              </h3>
              <button type="button" className={`${PAGE_KEY}-content-modal-close`} onClick={() => setContentModal(null)}>
                إغلاق
              </button>
            </div>
            <div className={`${PAGE_KEY}-content-modal-body`}>
              <section className={`${PAGE_KEY}-content-section`}>
                <h4 className={`${PAGE_KEY}-content-section-title`}>المحاضرات (فيديو / صوت)</h4>
                {modalLists.lectures.length === 0 ? (
                  <p className={`${PAGE_KEY}-content-empty`}>لا توجد محاضرات لهذه المادة.</p>
                ) : (
                  <ul className={`${PAGE_KEY}-content-list`}>
                    {modalLists.lectures.map((l) => (
                      <li key={l.id} className={`${PAGE_KEY}-content-row`}>
                        <span className={`${PAGE_KEY}-content-row-title`}>{l.title}</span>
                        <span className={`${PAGE_KEY}-content-row-meta`}>
                          {lectureTypeLabel(l.lecture_type)} · {l.track}
                          {l.duration_minutes != null ? ` · ${l.duration_minutes} د` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section className={`${PAGE_KEY}-content-section`}>
                <h4 className={`${PAGE_KEY}-content-section-title`}>الكتب والملفات</h4>
                {modalLists.books.length === 0 ? (
                  <p className={`${PAGE_KEY}-content-empty`}>لا توجد كتب لهذه المادة.</p>
                ) : (
                  <ul className={`${PAGE_KEY}-content-list`}>
                    {modalLists.books.map((b) => (
                      <li key={b.id} className={`${PAGE_KEY}-content-row`}>
                        <span className={`${PAGE_KEY}-content-row-title`}>{b.title}</span>
                        <span className={`${PAGE_KEY}-content-row-meta`}>
                          {b.file_type ? String(b.file_type).split("/").pop() : "ملف"} · {b.track}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section className={`${PAGE_KEY}-content-section`}>
                <h4 className={`${PAGE_KEY}-content-section-title`}>الامتحانات</h4>
                {modalLists.exams.length === 0 ? (
                  <p className={`${PAGE_KEY}-content-empty`}>لا توجد امتحانات لهذه المادة.</p>
                ) : (
                  <ul className={`${PAGE_KEY}-content-list`}>
                    {modalLists.exams.map((ex) => (
                      <li key={ex.id} className={`${PAGE_KEY}-content-row`}>
                        <span className={`${PAGE_KEY}-content-row-title`}>{ex.title}</span>
                        <span className={`${PAGE_KEY}-content-row-meta`}>
                          {ex.track} ·{" "}
                          {ex.published ? "منشور" : ex.status === "draft" ? "مسودة" : String(ex.status || "—")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
            <div className={`${PAGE_KEY}-content-modal-foot`}>
              <Link className="dlg-btn dlg-btn--ghost" to={nav("library")} onClick={() => setContentModal(null)}>
                المكتبة
              </Link>
              <Link className="dlg-btn dlg-btn--ghost" to={nav("question-bank")} onClick={() => setContentModal(null)}>
                بنك الأسئلة
              </Link>
              <Link className="dlg-btn" to={nav("exams")} onClick={() => setContentModal(null)}>
                الامتحانات
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <PageToolbar pageKey={PAGE_KEY}>
        <input
          className={`${PAGE_KEY}-toolbar-search`}
          placeholder="ابحث عن مادة..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <ToolbarLink pageKey={PAGE_KEY} to={nav("courses/new")} variant="primary">
          + إضافة مادة
        </ToolbarLink>
      </PageToolbar>

      {!isSpecialLms && tracks.length > 0 ? (
        <div className={`${PAGE_KEY}-filter-bar`}>
          <span className={`${PAGE_KEY}-filter-label`}>المسار</span>
          <div className={`${PAGE_KEY}-filter-pills`} role="group" aria-label="تصفية حسب المسار">
            <button
              type="button"
              className={`${PAGE_KEY}-pill ${trackFilter === "all" ? `${PAGE_KEY}-pill--active` : ""}`}
              onClick={() => setTrackFilter("all")}
            >
              الكل
            </button>
            {tracks.map((track) => (
              <button
                key={track.id}
                type="button"
                className={`${PAGE_KEY}-pill ${trackFilter === String(track.id) ? `${PAGE_KEY}-pill--active` : ""}`}
                onClick={() => setTrackFilter(String(track.id))}
              >
                {track.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <Panel pageKey={PAGE_KEY}>
        {filtered.length === 0 ? (
          <div className={`${PAGE_KEY}-empty`}>لا توجد مواد مطابقة.</div>
        ) : (
          <div className={`${PAGE_KEY}-grid`}>
            {filtered.map((row) => {
              const { lec, ex, bk } = countsForCourse(row, lectures, exams, books);
              const trackName = tracksMap.get(String(row.track_id)) || null;
              const tone = mediaToneClass(row.id);
              const active = row.status === "active";

              return (
                <article key={row.id} className={`${PAGE_KEY}-card`}>
                  <div className={`${PAGE_KEY}-card-media ${tone}`}>
                    <div className={`${PAGE_KEY}-card-icon`} aria-hidden>
                      <span className={`${PAGE_KEY}-card-icon-inner`}>📚</span>
                    </div>
                    <div className={`${PAGE_KEY}-card-badge`} title="المحاضرات والكتب والامتحانات">
                      <span aria-hidden>⏱</span> {lec} مح · {bk} كتاب · {ex} امتح
                    </div>
                  </div>
                  <div className={`${PAGE_KEY}-card-body`}>
                    <div className={`${PAGE_KEY}-card-tags`}>
                      {trackName ? <span className={`${PAGE_KEY}-tag ${PAGE_KEY}-tag--track`}>{trackName}</span> : null}
                      <span className={`${PAGE_KEY}-tag ${active ? `${PAGE_KEY}-tag--ok` : `${PAGE_KEY}-tag--muted`}`}>
                        {active ? "نشطة" : "غير نشطة"}
                      </span>
                    </div>
                    <h3 className={`${PAGE_KEY}-card-title`}>{row.name}</h3>
                    {row.description ? <p className={`${PAGE_KEY}-card-desc`}>{row.description}</p> : null}
                    <div className={`${PAGE_KEY}-card-actions`}>
                      <button
                        type="button"
                        className={`${PAGE_KEY}-card-content`}
                        onClick={() => setContentModal({ id: row.id, name: row.name })}
                      >
                        عرض المحتوى (محاضرات، كتب، امتحانات)
                      </button>
                      <Link className={`${PAGE_KEY}-card-primary`} to={nav(`courses/${row.id}/edit`)}>
                        <span className={`${PAGE_KEY}-card-primary-icon`} aria-hidden>
                          ▶
                        </span>
                        عرض وتعديل المادة
                      </Link>
                      <button
                        type="button"
                        className={`${PAGE_KEY}-card-delete`}
                        onClick={async () => {
                          const ok = await confirm({ title: "حذف المادة", message: `هل تريد حذف المادة "${row.name}"؟` });
                          if (!ok) return;
                          try {
                            await adminApi.deleteCourseApi(row.id);
                            await refreshCourses();
                            showToast({ type: "success", message: "تم حذف المادة." });
                          } catch (e) {
                            await alertMessage({ title: "تعذر الحذف", message: e.message });
                          }
                        }}
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Panel>
    </PageShell>
  );
}
