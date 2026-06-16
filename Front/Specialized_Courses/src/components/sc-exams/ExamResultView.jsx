export default function ExamResultView({ title, result, classes }) {
  return (
    <section className={classes.section}>
      <div className="pg-exam-attempt__result-shell">
        <h1 className={classes.pageTitle}>
          {title}
          <span className="pg-exam-attempt__result-title-suffix"> — النتيجة</span>
        </h1>
        <div className={classes.summary}>
          <p className={classes.summaryLine}>
            <strong>الدرجة:</strong> {result.score}/{result.total}
          </p>
          <p className={classes.summaryLine}>
            <strong>النسبة:</strong> {result.percentage}%
          </p>
          <p className={classes.summaryLine}>
            <strong>الحالة:</strong> {result.status}
          </p>
        </div>

        <div className={classes.list}>
          {result.details.map((item, idx) => (
            <article key={idx} className={classes.qa}>
              <p className={classes.qaLine}>
                <strong>س:</strong> {item.question}
              </p>
              <p className={classes.qaLine}>
                <strong>إجابتك:</strong>{' '}
                {item.selected === null ? 'لم تتم الإجابة' : item.options[item.selected]}
              </p>
              {result.showCorrectAnswers ? (
                <p className={classes.qaLine}>
                  <strong>الإجابة الصحيحة:</strong>{' '}
                  {item.correct === null ? 'غير متاح' : item.options[item.correct]}
                </p>
              ) : null}
              <p className={`${classes.qaVerdict} ${item.isCorrect ? classes.qaVerdictOk : classes.qaVerdictBad}`}>
                {item.isCorrect ? 'صحيح' : 'غير صحيح'}
              </p>
              {item.explanation ? <p className={classes.qaExplain}>{item.explanation}</p> : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
