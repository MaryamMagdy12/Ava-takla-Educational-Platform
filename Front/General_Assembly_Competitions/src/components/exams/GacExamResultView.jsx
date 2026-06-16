export default function GacExamResultView({ title, result, classes }) {
  return (
    <section className={classes.section}>
      <div className="gac-exam-attempt__result-shell">
        <h1 className={classes.pageTitle}>
          {title}
          <span className="gac-exam-attempt__result-title-suffix"> — النتيجة</span>
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
          {result.summaryNote ? (
            <p className="gac-exam-attempt__summary-note">{result.summaryNote}</p>
          ) : null}
        </div>

        <div className={classes.list}>
          {(result.details || []).map((item, idx) => (
            <article key={idx} className={classes.qa}>
              <p className={classes.qaLine}>
                <strong>س:</strong> {item.question}
              </p>
              <p className={classes.qaLine}>
                <strong>إجابتك:</strong>{' '}
                {item.selected === null || item.selected === undefined
                  ? 'لم تتم الإجابة'
                  : item.options[item.selected]}
              </p>
              {result.showCorrectAnswers ? (
                <p className={classes.qaLine}>
                  <strong>الإجابة الصحيحة:</strong>{' '}
                  {item.correct === null || item.correct === undefined
                    ? 'غير متاح'
                    : item.options[item.correct]}
                </p>
              ) : null}
              {item.isCorrect == null ? (
                <p className="gac-exam-attempt__qa-verdict gac-exam-attempt__qa-verdict--pending">
                  بانتظار اعتماد النتيجة
                </p>
              ) : (
                <p
                  className={`${classes.qaVerdict} ${item.isCorrect ? classes.qaVerdictOk : classes.qaVerdictBad}`}
                >
                  {item.isCorrect ? 'صحيح' : 'غير صحيح'}
                </p>
              )}
              {item.explanation ? <p className={classes.qaExplain}>{item.explanation}</p> : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
