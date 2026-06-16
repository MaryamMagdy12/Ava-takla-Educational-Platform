/** Arabic labels for raw attempt status strings from the GA APIs. */
export function gaAttemptStatusLabel(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'submitted') return 'تم التسليم'
  if (s === 'expired') return 'منتهي بالوقت'
  if (s === 'in_progress') return 'قيد التنفيذ'
  if (s === 'verified') return 'تم التحقق'
  return status ? String(status) : '—'
}

export const GAC_EXAM_RESULT_VIEW_CLASSES = {
  section: 'gac-exam-attempt__result-section',
  pageTitle: 'gac-exam-attempt__result-title',
  summary: 'gac-exam-attempt__summary',
  summaryLine: 'gac-exam-attempt__summary-line',
  list: 'gac-exam-attempt__qa-list',
  qa: 'gac-exam-attempt__qa',
  qaLine: 'gac-exam-attempt__qa-line',
  qaVerdict: 'gac-exam-attempt__qa-verdict',
  qaVerdictOk: 'gac-exam-attempt__qa-verdict--ok',
  qaVerdictBad: 'gac-exam-attempt__qa-verdict--bad',
  qaExplain: 'gac-exam-attempt__qa-explain',
}

/**
 * Shape expected by {@link GacExamResultView}: mirrors student `mapResultPayload` output
 * plus optional `summaryNote` and `isCorrect: null` in details when verdict is pending.
 */
export function mapCompetitionAttemptResult(apiData) {
  const att = apiData?.attempt || {}
  const released = Boolean(att.results_released)
  const answers = apiData?.answers || []
  const details = answers.map((a) => {
    const opts = [...(a.options || [])]
    const optionTexts = opts.map((o) => o.option_text)
    const correctIdx = released ? opts.findIndex((o) => o.is_correct === true) : -1
    const selectedIdx =
      a.selected_option_id != null && a.selected_option_id !== ''
        ? opts.findIndex((o) => Number(o.id) === Number(a.selected_option_id))
        : -1
    return {
      question: a.question_text,
      selected: selectedIdx >= 0 ? selectedIdx : null,
      correct: correctIdx >= 0 ? correctIdx : null,
      options: optionTexts,
      explanation: '',
      isCorrect: released
        ? a.is_correct === null || a.is_correct === undefined
          ? false
          : Boolean(a.is_correct)
        : null,
    }
  })

  return {
    examTitle: att.competition?.title ?? 'نتيجة المسابقة',
    score: att.score ?? 0,
    total: att.total_questions ?? details.length,
    percentage: Math.round(Number(att.percentage) || 0),
    status: gaAttemptStatusLabel(att.status),
    showCorrectAnswers: released,
    details,
    summaryNote: released ? '' : 'ستُعرض صحة الإجابات بعد اعتماد النتائج من المشرف.',
  }
}

export function mapFamilyExamAttemptResult(apiData) {
  const att = apiData?.attempt || {}
  const show = Boolean(att.show_result_immediately)
  const answers = apiData?.answers || []
  const details = show
    ? answers.map((a) => {
        const opts = [...(a.options || [])]
        const optionTexts = opts.map((o) => o.option_text)
        const correctIdx = opts.findIndex((o) => o.is_correct === true)
        const selectedIdx =
          a.selected_option_id != null && a.selected_option_id !== ''
            ? opts.findIndex((o) => Number(o.id) === Number(a.selected_option_id))
            : -1
        return {
          question: a.question_text,
          selected: selectedIdx >= 0 ? selectedIdx : null,
          correct: correctIdx >= 0 ? correctIdx : null,
          options: optionTexts,
          explanation: (a.feedback || '').trim(),
          isCorrect:
            a.is_correct === null || a.is_correct === undefined ? false : Boolean(a.is_correct),
        }
      })
    : []

  return {
    examTitle: att.exam?.title ?? 'نتيجة الامتحان',
    score: att.score ?? 0,
    total: att.max_score ?? details.length,
    percentage: Math.round(Number(att.percentage) || 0),
    status: gaAttemptStatusLabel(att.status),
    showCorrectAnswers: show,
    details,
    summaryNote: show ? '' : 'سيتم عرض تفاصيل الإجابات بعد السماح من الإدارة.',
  }
}
