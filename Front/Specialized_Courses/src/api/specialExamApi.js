import { apiClient } from './apiClient.js'

async function paginateAllExams() {
  const items = []
  let page = 1
  let lastPage = 1
  do {
    const { data: body } = await apiClient.get('/special/exams', { params: { page } })
    const block = body?.data
    if (!block?.data) break
    items.push(...block.data)
    lastPage = block.last_page ?? 1
    page += 1
  } while (page <= lastPage)
  return items
}

function formatWindow(from, to) {
  try {
    const a = new Date(from)
    const b = new Date(to)
    const opts = { dateStyle: 'short', timeStyle: 'short' }
    return `${a.toLocaleString('ar-EG', opts)} – ${b.toLocaleString('ar-EG', opts)}`
  } catch {
    return ''
  }
}

function parseServerDateTime(value) {
  if (value == null || value === '') return NaN
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const s = String(value).trim()
  const withT = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s) ? s.replace(' ', 'T') : s
  const t = new Date(withT).getTime()
  return Number.isFinite(t) ? t : NaN
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function formatArabicUpcoming(ts) {
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return '—'
  const now = new Date()
  const diffDays = Math.round((startOfDay(d) - startOfDay(now)) / 86400000)
  const timeStr = d.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' })
  if (diffDays === 0) return `اليوم ${timeStr}`
  if (diffDays === 1) return `غدًا ${timeStr}`
  if (diffDays === 2) return `بعد غد ${timeStr}`
  return d.toLocaleDateString('ar-EG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function examFinishedDateLabel(row) {
  try {
    const t = row.available_to ? new Date(row.available_to) : null
    if (t && !Number.isNaN(t.getTime())) {
      return `انتهى ${t.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}`
    }
  } catch {
    // ignore
  }
  return 'انتهى'
}

function formatWindowEndAr(value) {
  if (!value) return ''
  try {
    const t = new Date(value)
    if (Number.isNaN(t.getTime())) return ''
    return t.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return ''
  }
}

function examStateFromRow(row) {
  const att = row.attempt
  const now = Date.now()
  const from = new Date(row.available_from).getTime()
  const to = new Date(row.available_to).getTime()
  if (att?.status === 'submitted') return 'Submitted'
  if (att?.status === 'expired') return 'Expired'
  if (att?.status === 'in_progress') return 'In Progress'
  if (Number.isNaN(from) || Number.isNaN(to)) return 'Upcoming'
  if (now < from) return 'Upcoming'
  if (now > to) return 'Expired'
  return 'Available'
}

function buildExamAvailabilityLines(row, state) {
  const dm = row.duration_minutes
  const durationText = Number.isFinite(dm) ? `${dm} دقيقة` : '—'
  if (state === 'Available' || state === 'In Progress') {
    return { durationText, whenText: 'متاح الآن' }
  }
  if (state === 'Upcoming') {
    const from = parseServerDateTime(row.available_from)
    const whenText = Number.isFinite(from) ? formatArabicUpcoming(from) : examFinishedDateLabel(row)
    return { durationText, whenText }
  }
  return { durationText, whenText: examFinishedDateLabel(row) }
}

function resolveAllowedEndMs(data, attempt, examMeta) {
  const remaining = Number(data.remaining_seconds)
  if (Number.isFinite(remaining) && remaining >= 0) {
    return Date.now() + Math.round(remaining) * 1000
  }
  const parsed = parseServerDateTime(attempt?.allowed_end_time)
  if (Number.isFinite(parsed)) {
    return parsed
  }
  const dm = Number(examMeta?.duration_minutes)
  if (Number.isFinite(dm) && dm > 0) {
    return Date.now() + dm * 60 * 1000
  }
  return Date.now() + 60 * 60 * 1000
}

function mapResumePayload(data) {
  const attempt = data.attempt
  const examMeta = data.exam
  const questions = (data.questions || []).map((aq) => {
    const q = aq.question
    const opts = q?.options ?? []
    return {
      id: q.id,
      text: q.question_text,
      options: opts.map((o) => o.option_text),
      _optionIds: opts.map((o) => o.id),
    }
  })
  const allowedEndTime = resolveAllowedEndMs(data, attempt, examMeta)
  return {
    exam: {
      id: examMeta?.id,
      title: examMeta?.title ?? 'الامتحان',
      durationMinutes: examMeta?.duration_minutes,
      questions,
      _attemptId: attempt.id,
    },
    allowedEndTime,
  }
}

function mapResultPayload(apiData) {
  const { attempt, answers } = apiData
  const showCorrectAnswers = Boolean(attempt?.exam?.show_correct_answers_after_submit)
  const examTitle = attempt.exam?.title ?? 'الامتحان'
  let status = 'راسب'
  if (attempt.is_passed === true) status = 'ناجح'
  else if (attempt.is_passed === false) status = 'راسب'
  else status = (Number(attempt.percentage) || 0) >= 60 ? 'ناجح' : 'راسب'

  const details = (answers || []).map((a) => {
    const opts = [...(a.options ?? [])]
    const optionTexts = opts.map((o) => o.option_text)
    const correctIdx = showCorrectAnswers ? opts.findIndex((o) => o.is_correct === true) : -1
    const selectedIdx = a.selected_option_id ? opts.findIndex((o) => o.id === a.selected_option_id) : -1
    return {
      question: a.question_text,
      selected: selectedIdx >= 0 ? selectedIdx : null,
      correct: correctIdx >= 0 ? correctIdx : null,
      options: optionTexts,
      explanation: a.feedback || '',
      isCorrect: Boolean(a.is_correct),
    }
  })

  return {
    examTitle,
    score: attempt.score ?? 0,
    total: attempt.total_questions ?? details.length,
    percentage: Math.round(Number(attempt.percentage) || 0),
    status,
    showCorrectAnswers,
    details,
  }
}

export const specialExamApi = {
  async getExams() {
    const rows = await paginateAllExams()
    return rows.map((row) => {
      const att = row.attempt
      const graded = att && (att.status === 'submitted' || att.status === 'expired')
      const state = examStateFromRow(row)
      const lines = buildExamAvailabilityLines(row, state)
      return {
        id: row.id,
        title: row.title,
        course: row.course ?? 'المقرر',
        durationMinutes: row.duration_minutes,
        questionCount: row.question_count,
        windowLabel: formatWindow(row.available_from, row.available_to),
        availableFrom: row.available_from,
        availableTo: row.available_to,
        endsAtLabel: formatWindowEndAr(row.available_to),
        durationText: lines.durationText,
        whenText: lines.whenText,
        state,
        attemptScore: graded ? att.score ?? 0 : null,
        attemptTotal: graded ? att.total_questions ?? row.question_count ?? 0 : null,
        attemptPercentage:
          graded && att.percentage != null ? Math.round(Number(att.percentage)) : null,
        attemptPassed: graded ? att.is_passed : null,
      }
    })
  },

  async getExamResultByAttempt(attemptId) {
    if (!attemptId) return null
    const { data: resultBody } = await apiClient.get(`/special/attempts/${attemptId}/result`)
    return mapResultPayload(resultBody.data)
  },

  async getExamResult(_user, examId) {
    let attemptId
    try {
      const { data: body } = await apiClient.get(`/special/exams/${examId}/attempt`)
      const st = body.data?.attempt?.status
      attemptId = body.data?.attempt?.id
      if (!attemptId || (st !== 'submitted' && st !== 'expired')) return null
    } catch (e) {
      if (e.status === 404) return null
      throw e
    }
    const { data: resultBody } = await apiClient.get(`/special/attempts/${attemptId}/result`)
    return mapResultPayload(resultBody.data)
  },

  async startExam(_user, examId) {
    const { data: body } = await apiClient.post(`/special/exams/${examId}/start`)
    return mapResumePayload(body.data)
  },

  async getExamAttempt(_user, examId) {
    try {
      const { data: body } = await apiClient.get(`/special/exams/${examId}/attempt`)
      return mapResumePayload(body.data)
    } catch (e) {
      if (e.status === 404) return null
      throw e
    }
  },

  async submitExam(_user, examOrId, answers) {
    const exam = typeof examOrId === 'object' ? examOrId : null
    if (!exam?._attemptId) throw new Error('حالة الامتحان غير صالحة')
    const attemptId = exam._attemptId
    if (!attemptId) throw new Error('لا توجد محاولة نشطة')

    const payload = {
      answers: exam.questions.map((q, i) => ({
        question_id: q.id,
        selected_option_id:
          answers[i] === null || answers[i] === undefined
            ? null
            : q._optionIds?.[answers[i]] ?? null,
      })),
    }

    await apiClient.post(`/special/attempts/${attemptId}/submit`, payload)

    const { data: resultBody } = await apiClient.get(`/special/attempts/${attemptId}/result`)
    return mapResultPayload(resultBody.data)
  },
}

/** @returns {Promise<number>} count of published special exams (for dashboard). */
export async function fetchSpecialExamsCount() {
  try {
    const rows = await paginateAllExams()
    return rows.length
  } catch {
    return 0
  }
}
