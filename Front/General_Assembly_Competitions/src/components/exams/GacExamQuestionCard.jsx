const OPTION_LETTERS = ['أ', 'ب', 'ج', 'د', 'ه', 'و', 'ز', 'ح']

/**
 * @param {{
 *   domId?: string
 *   title: string
 *   caption?: string | null
 *   activeIndex: number
 *   totalQuestions: number
 *   options: { id: number | string; option_text: string }[]
 *   selectedOptionId: number | string | null
 *   onSelectOptionId: (id: number | string) => void
 *   isUnanswered: boolean
 *   classes: Record<string, string>
 * }} props
 */
export default function GacExamQuestionCard({
  domId,
  title,
  caption = null,
  activeIndex,
  totalQuestions,
  options,
  selectedOptionId,
  onSelectOptionId,
  isUnanswered,
  classes,
}) {
  const isAnswered = selectedOptionId != null && selectedOptionId !== ''
  return (
    <article id={domId || undefined} className={`${classes.root} ${isUnanswered ? classes.unanswered : ''}`}>
      <div className="gac-exam-attempt__question-head">
        <span className="gac-exam-attempt__question-badge">
          السؤال {activeIndex + 1} من {totalQuestions}
        </span>
        {isAnswered ? (
          <span className="gac-exam-attempt__question-status gac-exam-attempt__question-status--done">
            تمت الإجابة
            <span className="gac-exam-attempt__question-status-num">{activeIndex + 1}</span>
          </span>
        ) : null}
      </div>
      {caption ? <p className={classes.caption}>{caption}</p> : null}
      <h3 className={classes.title}>{title}</h3>
      <div className={classes.options}>
        {(options || []).map((opt, idx) => (
          <button
            key={String(opt.id)}
            type="button"
            onClick={() => onSelectOptionId(opt.id)}
            className={`${classes.option} ${Number(selectedOptionId) === Number(opt.id) ? classes.optionSelected : ''}`}
          >
            <span className={classes.optionInner}>
              <span className={classes.optionLetter} aria-hidden="true">
                {OPTION_LETTERS[idx] ?? idx + 1}
              </span>
              <span className={classes.optionText}>{opt.option_text}</span>
            </span>
          </button>
        ))}
      </div>
    </article>
  )
}
