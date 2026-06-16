import { useEffect, useMemo, useState } from 'react'
import { Download, Eye, FileText, Search, Video } from 'lucide-react'
import { contentApi, openProtectedStudentMedia } from '../api'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/ui/PageHeader'
import useDebouncedValue from '../hooks/useDebouncedValue'
import '../assets/css/BooksPage.css'

export default function BooksPage() {
  const { student } = useAuth()
  const [books, setBooks] = useState([])
  const [search, setSearch] = useState('')
  const [courseFilter, setCourseFilter] = useState('كل المواد')
  const [typeFilter, setTypeFilter] = useState('كل الأنواع')
  const debouncedSearch = useDebouncedValue(search, 250)

  const courseOptions = useMemo(
    () => [...new Set(books.map((b) => b.course).filter(Boolean))].sort(),
    [books],
  )

  const filtered = useMemo(() => {
    return books.filter((book) => {
      const courseOk = courseFilter === 'كل المواد' || book.course === courseFilter
      const typeOk = typeFilter === 'كل الأنواع' || book.kind === typeFilter
      const searchOk = book.title.toLowerCase().includes(debouncedSearch.toLowerCase())
      return courseOk && typeOk && searchOk
    })
  }, [books, debouncedSearch, courseFilter, typeFilter])

  useEffect(() => {
    contentApi.getBooks(student).then(setBooks)
  }, [student])

  return (
    <section id="pg-books-root">
      <div className="pg-books__shell">
        <div className="pg-books__hero-wrap">
          <PageHeader
            title="المكتبة الرقمية"
            subtitle="تصفح وحمل المذكرات والكتب الدراسية"
            headerClassName="pg-books__hero"
            titleClassName="pg-books__title"
            subtitleClassName="pg-books__subtitle"
          />
          <div className="pg-books__hero-icon" aria-hidden="true">
            <FileText className="pg-books__hero-doc" size={30} strokeWidth={1.75} />
          </div>
        </div>

        <section className="pg-books__toolbar" aria-label="تصفية المكتبة">
          <select className="pg-books__select" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
            <option>كل المواد</option>
            {courseOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select className="pg-books__select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option>كل الأنواع</option>
            <option>PDF</option>
            <option>Video</option>
          </select>
          <div className="pg-books__search-wrap">
            <span className="pg-books__search-icon" aria-hidden="true">
              <Search size={20} strokeWidth={2} />
            </span>
            <input
              className="pg-books__input"
              placeholder="ابحث عن كتاب أو ملزمة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="search"
              aria-label="بحث في المكتبة"
            />
          </div>
        </section>

        <div className="pg-books__list" role="list">
          {filtered.length === 0 ? (
            <p className="pg-books__empty" role="status">
              لا توجد نتائج مطابقة للبحث أو التصفية.
            </p>
          ) : (
            filtered.map((book) => {
              const isVideo = book.kind === 'Video'
              return (
                <article key={book.id} className="pg-books__row" role="listitem">
                  <div className={`pg-books__kind-icon ${isVideo ? 'pg-books__kind-icon--video' : 'pg-books__kind-icon--pdf'}`}>
                    {isVideo ? (
                      <Video className="pg-books__kind-svg" size={22} strokeWidth={2} aria-hidden />
                    ) : (
                      <FileText className="pg-books__kind-svg" size={22} strokeWidth={2} aria-hidden />
                    )}
                  </div>
                  <div className="pg-books__details">
                    <h3 className="pg-books__card-title">{book.title}</h3>
                    <div className="pg-books__meta">
                      <span className="pg-books__chip">{book.course}</span>
                      <span className="pg-books__meta-line">
                        <span className="pg-books__type">{book.kind}</span>
                        {book.sizeLabel ? (
                          <>
                            <span className="pg-books__meta-dot" aria-hidden="true">
                              •
                            </span>
                            <span className="pg-books__size">{book.sizeLabel}</span>
                          </>
                        ) : null}
                        <span className="pg-books__meta-dot" aria-hidden="true">
                          •
                        </span>
                        <span className="pg-books__date">{book.dateLabel}</span>
                      </span>
                    </div>
                  </div>
                  <div className="pg-books__actions">
                    {book.accessUrl ? (
                      <>
                        <button
                          type="button"
                          className="pg-books__icon-btn"
                          aria-label="معاينة"
                          onClick={() => openProtectedStudentMedia(book.accessUrl).catch(() => {})}
                        >
                          <Eye className="pg-books__icon-svg" size={20} strokeWidth={2} aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="pg-books__download"
                          onClick={() => openProtectedStudentMedia(book.accessUrl).catch(() => {})}
                        >
                          <span>تحميل</span>
                          <Download className="pg-books__dl-icon" size={17} strokeWidth={2} aria-hidden />
                        </button>
                      </>
                    ) : (
                      <>
                        <a className="pg-books__icon-btn" href={book.pdfUrl} target="_blank" rel="noreferrer" aria-label="معاينة">
                          <Eye className="pg-books__icon-svg" size={20} strokeWidth={2} aria-hidden />
                        </a>
                        <a className="pg-books__download" href={book.pdfUrl} download>
                          <span>تحميل</span>
                          <Download className="pg-books__dl-icon" size={17} strokeWidth={2} aria-hidden />
                        </a>
                      </>
                    )}
                  </div>
                </article>
              )
            })
          )}
        </div>
      </div>
    </section>
  )
}
