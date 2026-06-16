const OPTION_LETTERS = ['أ', 'ب', 'ج', 'د', 'ه', 'و', 'ز', 'ح']

export default function ExamQuestionCard({
  question,
  activeIndex,
  totalQuestions,
  selectedAnswer,
  onSelect,
  isUnanswered,
  classes,
  domId,
}) {
  const isAnswered = selectedAnswer !== null && selectedAnswer !== undefined
  return (
    <article id={domId || undefined} className={`${classes.root} ${isUnanswered ? classes.unanswered : ''}`}>
      <div className="pg-exam-attempt__question-head">
        <span className="pg-exam-attempt__question-badge">
          السؤال {activeIndex + 1} من {totalQuestions}
        </span>
        {isAnswered ? (
          <span className="pg-exam-attempt__question-status pg-exam-attempt__question-status--done">
            تمت الإجابة
            <span className="pg-exam-attempt__question-status-num">{activeIndex + 1}</span>
          </span>
        ) : null}
      </div>
      <h3 className={classes.title}>{question.text}</h3>
      <div className={classes.options}>
        {question.options.map((option, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelect(idx)}
            className={`${classes.option} ${selectedAnswer === idx ? classes.optionSelected : ''}`}
          >
            <span className={classes.optionInner}>
              <span className={classes.optionLetter} aria-hidden="true">
                {OPTION_LETTERS[idx] ?? idx + 1}
              </span>
              <span className={classes.optionText}>{option}</span>
            </span>
          </button>
        ))}
      </div>
    </article>
  )
}
