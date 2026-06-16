import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import HighlightedText from "../components/common/HighlightedText";
import PageShell from "../components/common/PageShell";
import Panel from "../components/common/Panel";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import { useAdminData } from "../context/AdminDataContext";
import useDebouncedValue from "../hooks/useDebouncedValue";
import "../assets/css/LibraryPage.css";
import { useAdminNav } from "../context/AdminNavContext";
import { sp } from "../navigation/adminPaths";
import { API_BASE } from "../api/config";
import * as adminApi from "../api/adminApi";
import { useDialog } from "../components/common/DialogProvider";
import { useToast } from "../components/common/ToastProvider";

const PAGE_KEY = "pg-library";

function storagePublicUrl(filePath) {
  if (!filePath) return "";
  const origin = API_BASE.replace(/\/api\/?$/i, "");
  const p = String(filePath).replace(/^\//, "");
  return `${origin}/storage/${p}`;
}

function LibraryPage() {
  const nav = useAdminNav();
  const isSpecialLms = nav === sp;
  const { books, lectures, refreshBooks, refreshLectures } = useAdminData();
  const { confirm, alertMessage } = useDialog();
  const { showToast } = useToast();
  const [busyDeleteId, setBusyDeleteId] = useState(null);
  const [lectureTypeFilter, setLectureTypeFilter] = useState("all");
  const { globalSearch } = useOutletContext();
  const debouncedGlobalSearch = useDebouncedValue(globalSearch);
  const highlightQueries = [debouncedGlobalSearch];

  const deleteBook = async (b) => {
    const ok = await confirm({
      title: "حذف الكتاب",
      message: `هل تريد حذف «${b.title}»؟ لا يمكن التراجع عن هذا الإجراء.`,
    });
    if (!ok) return;
    setBusyDeleteId(`book-${b.id}`);
    try {
      await adminApi.deleteBookApi(b.id);
      await refreshBooks();
      showToast({ type: "success", message: "تم حذف الكتاب." });
    } catch (e) {
      await alertMessage({ title: "تعذر الحذف", message: e.message || "حدث خطأ." });
    } finally {
      setBusyDeleteId(null);
    }
  };

  const deleteLecture = async (l) => {
    const ok = await confirm({
      title: "حذف المحاضرة",
      message: `هل تريد حذف «${l.title}»؟ لا يمكن التراجع عن هذا الإجراء.`,
    });
    if (!ok) return;
    setBusyDeleteId(`lecture-${l.id}`);
    try {
      await adminApi.deleteLectureApi(l.id);
      await refreshLectures();
      showToast({ type: "success", message: "تم حذف المحاضرة." });
    } catch (e) {
      await alertMessage({ title: "تعذر الحذف", message: e.message || "حدث خطأ." });
    } finally {
      setBusyDeleteId(null);
    }
  };

  const filteredBooks = useMemo(() => {
    const query = debouncedGlobalSearch.trim().toLowerCase();
    if (!query) return books;
    return books.filter(
      (book) =>
        book.title.toLowerCase().includes(query) ||
        String(book.course || "").toLowerCase().includes(query) ||
        String(book.track || "").toLowerCase().includes(query) ||
        String(book.status || "").toLowerCase().includes(query) ||
        String(book.file_type || "").toLowerCase().includes(query),
    );
  }, [books, debouncedGlobalSearch]);

  const filteredLectures = useMemo(() => {
    const query = debouncedGlobalSearch.trim().toLowerCase();
    if (!query) return lectures;
    return lectures.filter(
      (lecture) =>
        lecture.title.toLowerCase().includes(query) ||
        String(lecture.course || "").toLowerCase().includes(query) ||
        String(lecture.track || "").toLowerCase().includes(query) ||
        String(lecture.status || "").toLowerCase().includes(query) ||
        String(lecture.lecture_type || "").toLowerCase().includes(query),
    );
  }, [debouncedGlobalSearch, lectures]);

  const lecturesByType = useMemo(() => {
    if (lectureTypeFilter === "all") return filteredLectures;
    return filteredLectures.filter((l) => l.lecture_type === lectureTypeFilter);
  }, [filteredLectures, lectureTypeFilter]);

  return (
    <PageShell
      pageKey={PAGE_KEY}
      title="الكتب والمحاضرات"
      subtitle="استعرض المحتوى المرفوع، وأضف الكتب أو المحاضرات من الصفحات المخصصة لذلك."
    >
      <PageToolbar pageKey={PAGE_KEY}>
        <ToolbarLink pageKey={PAGE_KEY} to={nav("library/books/new")}>
          + إضافة كتاب
        </ToolbarLink>
        <ToolbarLink pageKey={PAGE_KEY} to={nav("library/lectures/new")}>
          + إضافة محاضرة
        </ToolbarLink>
      </PageToolbar>

      <Panel pageKey={PAGE_KEY} variant="books">
        <h3 className={`${PAGE_KEY}-section-title`}>الكتب</h3>
        {filteredBooks.length === 0 ? (
          <div className={`${PAGE_KEY}-empty`}>لا توجد كتب حتى الآن.</div>
        ) : (
          filteredBooks.map((b) => {
            const fileUrl = storagePublicUrl(b.file_path);
            const downloadName = `${String(b.title || "book").replace(/[\\/:*?"<>|]+/g, "_").slice(0, 120)}`;
            return (
              <div key={b.id} className={`${PAGE_KEY}-list-row`}>
                <div className={`${PAGE_KEY}-list-row-main`}>
                  <HighlightedText
                    text={b.title}
                    className={`${PAGE_KEY}-list-title`}
                    queries={highlightQueries}
                    highlightClassName={`${PAGE_KEY}-highlight`}
                  />
                  <span className={`${PAGE_KEY}-list-meta`}>
                    {" "}
                    —{" "}
                    <HighlightedText text={b.course} queries={highlightQueries} highlightClassName={`${PAGE_KEY}-highlight`} />
                    {!isSpecialLms ? (
                      <>
                        {" · "}
                        <HighlightedText text={b.track} queries={highlightQueries} highlightClassName={`${PAGE_KEY}-highlight`} />
                      </>
                    ) : null}
                  </span>
                </div>
                <div className={`${PAGE_KEY}-row-actions`}>
                  {fileUrl ? (
                    <>
                      <a className={`${PAGE_KEY}-action-link`} href={fileUrl} target="_blank" rel="noopener noreferrer">
                        عرض
                      </a>
                      <a className={`${PAGE_KEY}-action-link`} href={fileUrl} download={downloadName}>
                        تحميل
                      </a>
                    </>
                  ) : null}
                  <button
                    type="button"
                    className={`${PAGE_KEY}-action-btn ${PAGE_KEY}-action-btn--danger`}
                    disabled={busyDeleteId === `book-${b.id}`}
                    onClick={() => deleteBook(b)}
                  >
                    {busyDeleteId === `book-${b.id}` ? "…" : "حذف"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </Panel>

      <Panel pageKey={PAGE_KEY} variant="lectures">
        <h3 className={`${PAGE_KEY}-section-title`}>المحاضرات</h3>
        {filteredLectures.length === 0 ? (
          <div className={`${PAGE_KEY}-empty`}>لا توجد محاضرات حتى الآن.</div>
        ) : (
          <>
            <div className={`${PAGE_KEY}-lecture-filter`}>
              <span className={`${PAGE_KEY}-lecture-filter-label`}>نوع المحاضرة</span>
              <div className={`${PAGE_KEY}-lecture-pills`} role="group" aria-label="تصفية نوع المحاضرة">
                <button
                  type="button"
                  className={`${PAGE_KEY}-lecture-pill ${lectureTypeFilter === "all" ? `${PAGE_KEY}-lecture-pill--active` : ""}`}
                  onClick={() => setLectureTypeFilter("all")}
                >
                  الكل
                </button>
                <button
                  type="button"
                  className={`${PAGE_KEY}-lecture-pill ${lectureTypeFilter === "video" ? `${PAGE_KEY}-lecture-pill--active` : ""}`}
                  onClick={() => setLectureTypeFilter("video")}
                >
                  فيديو
                </button>
                <button
                  type="button"
                  className={`${PAGE_KEY}-lecture-pill ${lectureTypeFilter === "audio" ? `${PAGE_KEY}-lecture-pill--active` : ""}`}
                  onClick={() => setLectureTypeFilter("audio")}
                >
                  صوت
                </button>
              </div>
            </div>
            {lecturesByType.length === 0 ? (
              <div className={`${PAGE_KEY}-empty`}>لا توجد محاضرات في هذا النوع.</div>
            ) : (
              <div className={`${PAGE_KEY}-lecture-grid`}>
                {lecturesByType.map((l) => {
                  const fileUrl = storagePublicUrl(l.file_path);
                  const downloadName = `${String(l.title || "lecture").replace(/[\\/:*?"<>|]+/g, "_").slice(0, 120)}`;
                  const isVideo = l.lecture_type === "video";
                  const dur = l.duration_minutes != null ? `${l.duration_minutes} د` : "—";
                  const mediaClass = isVideo ? `${PAGE_KEY}-lecture-media--video` : `${PAGE_KEY}-lecture-media--audio`;
                  const playLabel = isVideo ? "تشغيل المحاضرة" : "تشغيل الصوت";

                  return (
                    <article key={l.id} className={`${PAGE_KEY}-lecture-card`}>
                      <div className={`${PAGE_KEY}-lecture-media ${mediaClass}`}>
                        <div className={`${PAGE_KEY}-lecture-icon`} aria-hidden>
                          {isVideo ? (
                            <span className={`${PAGE_KEY}-lecture-icon-play`}>▶</span>
                          ) : (
                            <span className={`${PAGE_KEY}-lecture-icon-audio`}>♪</span>
                          )}
                        </div>
                        <div className={`${PAGE_KEY}-lecture-duration`}>
                          <span aria-hidden>⏱</span> {dur}
                        </div>
                      </div>
                      <div className={`${PAGE_KEY}-lecture-body`}>
                        <div className={`${PAGE_KEY}-lecture-tags`}>
                          <span className={`${PAGE_KEY}-lecture-tag ${PAGE_KEY}-lecture-tag--course`}>
                            <HighlightedText
                              text={l.course || "—"}
                              queries={highlightQueries}
                              highlightClassName={`${PAGE_KEY}-highlight`}
                            />
                          </span>
                          <span
                            className={`${PAGE_KEY}-lecture-tag ${isVideo ? `${PAGE_KEY}-lecture-tag--video` : `${PAGE_KEY}-lecture-tag--audio`}`}
                          >
                            {isVideo ? "فيديو" : "صوت"}
                          </span>
                        </div>
                        <h4 className={`${PAGE_KEY}-lecture-title`}>
                          <HighlightedText
                            text={l.title}
                            queries={highlightQueries}
                            highlightClassName={`${PAGE_KEY}-highlight`}
                          />
                        </h4>
                        {!isSpecialLms ? (
                          <p className={`${PAGE_KEY}-lecture-track`}>
                            <HighlightedText text={l.track} queries={highlightQueries} highlightClassName={`${PAGE_KEY}-highlight`} />
                          </p>
                        ) : null}
                        <div className={`${PAGE_KEY}-lecture-actions`}>
                          {fileUrl ? (
                            <a className={`${PAGE_KEY}-lecture-play`} href={fileUrl} target="_blank" rel="noopener noreferrer">
                              <span className={`${PAGE_KEY}-lecture-play-icon`} aria-hidden>
                                ▶
                              </span>
                              {playLabel}
                            </a>
                          ) : (
                            <span className={`${PAGE_KEY}-lecture-play ${PAGE_KEY}-lecture-play--disabled`}>لا يوجد ملف</span>
                          )}
                          {fileUrl ? (
                            <a className={`${PAGE_KEY}-lecture-secondary`} href={fileUrl} download={downloadName}>
                              تحميل
                            </a>
                          ) : null}
                          <button
                            type="button"
                            className={`${PAGE_KEY}-lecture-delete`}
                            disabled={busyDeleteId === `lecture-${l.id}`}
                            onClick={() => deleteLecture(l)}
                          >
                            {busyDeleteId === `lecture-${l.id}` ? "…" : "حذف"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </Panel>
    </PageShell>
  );
}

export default LibraryPage;
