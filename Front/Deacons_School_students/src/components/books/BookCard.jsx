import highlightMatch from '../../utils/highlightMatch'

export default function BookCard({ book, classes, searchQuery }) {
  return (
    <article className={classes.root}>
      <span className={classes.chip}>{book.course}</span>
      <h3 className={classes.title}>{highlightMatch(book.title, searchQuery, classes.highlight)}</h3>
      <p className={classes.author}>{book.author}</p>
      <p className={classes.pages}>{book.pages} صفحة</p>
      <div className={classes.actions}>
        <a className={classes.linkSecondary} href={book.pdfUrl} target="_blank" rel="noreferrer">
          عرض الملف
        </a>
        <a className={classes.linkPrimary} href={book.pdfUrl} download>
          تنزيل
        </a>
      </div>
    </article>
  )
}
