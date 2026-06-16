import { API_ORIGIN } from './config'
import { resolveLearnerPhotoFromUser } from '../utils/learnerDisplay'
import { studentClient, sessionToken } from './axiosClient'

const SESSION_KEY = 'academy-session-v1'

const readJson = (key, fallback) => {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

const writeJson = (key, value) => sessionStorage.setItem(key, JSON.stringify(value))

function storageUrl(filePath) {
  if (!filePath) return '#'
  const p = String(filePath).replace(/^\//, '')
  return `${API_ORIGIN}/storage/${p}`
}

/**
 * Opens LMS media that requires Bearer auth (private disk) or redirects for external URLs.
 * @param {string | null | undefined} accessUrl — `/student/.../view` or absolute http(s)
 */
export async function openProtectedStudentMedia(accessUrl) {
  if (!accessUrl || accessUrl === '#') return
  if (/^https?:\/\//i.test(String(accessUrl))) {
    window.open(String(accessUrl), '_blank', 'noopener,noreferrer')
    return
  }
  const path = String(accessUrl).startsWith('/') ? String(accessUrl) : `/${accessUrl}`
  const { data } = await studentClient.get(path, { responseType: 'blob' })
  const blobUrl = URL.createObjectURL(data)
  window.open(blobUrl, '_blank', 'noopener,noreferrer')
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 120000)
}

export function mapUserToStudent(user) {
  if (!user) return null
  return {
    id: user.id,
    studentUniqueId: user.student_unique_id,
    name: user.full_name,
    level: user.level?.name ?? '—',
    curriculumTrack: user.track?.name ?? '—',
    status: user.status === 'active' ? 'نشط' : 'غير نشط',
    photoUrl: resolveLearnerPhotoFromUser(user),
    parentName: user.parent_name?.trim() || '',
    parentPhone: user.parent_phone?.trim() || '',
    parentEmail: user.parent_email?.trim() || '',
  }
}

async function paginateAll(path) {
  const items = []
  let page = 1
  let lastPage = 1
  const sep = path.includes('?') ? '&' : '?'
  do {
    const { data: body } = await studentClient.get(`${path}${sep}page=${page}`)
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

/** Laravel / MySQL often sends `YYYY-MM-DD HH:mm:ss`, which is not reliably parsed by `Date` in all browsers. */
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

/** Short Arabic label for upcoming exam start (e.g. غداً ٧:٠٠ م). */
function formatArabicUpcoming(ts) {
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return '—'
  const now = new Date()
  const diffDays = Math.round((startOfDay(d) - startOfDay(now)) / 86400000)
  const timeStr = d.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' })
  if (diffDays === 0) return `اليوم ${timeStr}`
  if (diffDays === 1) return `غدًا ${timeStr}`
  if (diffDays === 2) return `بعد غد ${timeStr}`
  return d.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })
}

function examFinishedDateLabel(row) {
  const end = row.available_to ? new Date(row.available_to) : null
  if (end && !Number.isNaN(end.getTime())) {
    return end.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  return '—'
}

/** End of availability window (تاريخ + وقت) for display next to duration. */
function formatWindowEndAr(value) {
  if (value == null || value === '') return null
  const ts = parseServerDateTime(value)
  if (!Number.isFinite(ts)) return null
  return new Date(ts).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })
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

function bookKindFromRow(b) {
  const mime = (b.file_type || '').toLowerCase()
  const path = (b.file_path || b.access_url || '').toLowerCase()
  if (mime.includes('pdf') || path.endsWith('.pdf')) return 'PDF'
  if (mime.startsWith('video/') || path.endsWith('.mp4') || path.endsWith('.webm')) return 'Video'
  if (mime.startsWith('audio/')) return 'صوت'
  return 'PDF'
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
    // Keep API order (matches shuffled display order during the attempt)
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

export const authApi = {
  async login(studentUniqueId, password) {
    const { data: body } = await studentClient.post(
      '/auth/student/login',
      { student_unique_id: studentUniqueId.trim(), password },
      { skipAuth: true },
    )
    const data = body.data
    const session = {
      token: data.token,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 1000 * 60 * 60 * 8,
      student: mapUserToStudent(data.user),
      mustChangePassword: Boolean(data.must_change_password),
    }
    writeJson(SESSION_KEY, session)
    return session
  },

  async changePassword(_studentId, currentPassword, newPassword) {
    await studentClient.post('/student/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
      new_password_confirmation: newPassword,
    })
    const session = readJson(SESSION_KEY, null)
    if (session) {
      session.mustChangePassword = false
      writeJson(SESSION_KEY, session)
    }
    return true
  },

  getSession() {
    const session = readJson(SESSION_KEY, null)
    if (!session) return null
    if (Date.now() > session.expiresAt) {
      sessionStorage.removeItem(SESSION_KEY)
      return null
    }
    return session
  },

  /** Validates bearer token with backend (`GET /auth/me`). */
  async fetchMe() {
    const prev = readJson(SESSION_KEY, null)
    const token = prev?.token ?? sessionToken()
    if (!token) return null
    const { data: body } = await studentClient.get('/auth/me')
    const d = body.data
    if (d.kind !== 'student') {
      throw new Error('Invalid session role.')
    }
    const session = {
      token,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 1000 * 60 * 115,
      student: mapUserToStudent(d.user),
      mustChangePassword: Boolean(d.must_change_password),
    }
    writeJson(SESSION_KEY, session)
    return session
  },

  async logout() {
    try {
      if (sessionToken()) await studentClient.post('/auth/logout')
    } catch {
      /* still clear local session */
    } finally {
      sessionStorage.removeItem(SESSION_KEY)
    }
  },
}

export const contentApi = {
  async getDashboard(_student) {
    const { data: body } = await studentClient.get('/student/dashboard')
    const d = body.data
    return {
      upcomingExams: d.available_exams ?? 0,
      booksCount: d.available_books ?? 0,
      lecturesCount: d.available_lectures ?? 0,
    }
  },

  async getExamHistory(_student, page = 1, perPage = 10) {
    const { data: body } = await studentClient.get('/student/dashboard/exam-history', {
      params: { page, per_page: perPage },
    })
    const block = body.data || {}
    return {
      rows: (block.data || []).map((row) => ({
        id: row.id,
        examId: row.exam?.id ?? null,
        title: row.exam?.title ?? 'الامتحان',
        course: row.exam?.course ?? 'المقرر',
        score: row.score ?? 0,
        totalQuestions: row.total_questions ?? 0,
        percentage: Math.round(Number(row.percentage) || 0),
        canViewAnswers:
          Boolean(row.exam?.show_correct_answers_after_submit) &&
          (row.status === 'submitted' || row.status === 'expired'),
        status:
          row.status === 'submitted'
            ? 'تم التسليم'
            : row.status === 'expired'
              ? 'انتهى الوقت'
              : row.status === 'in_progress'
                ? 'قيد التنفيذ'
                : row.status,
        submittedAt: row.submitted_at
          ? new Date(row.submitted_at).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })
          : '—',
      })),
      page: block.current_page ?? 1,
      lastPage: block.last_page ?? 1,
      total: block.total ?? 0,
    }
  },

  async getExamResultByAttempt(_student, attemptId) {
    if (!attemptId) return null
    const { data: resultBody } = await studentClient.get(`/student/attempts/${attemptId}/result`)
    return mapResultPayload(resultBody.data)
  },

  async getExams(_student) {
    const rows = await paginateAll('/student/exams')
    return rows.map((row) => {
      const att = row.attempt
      const graded =
        att && (att.status === 'submitted' || att.status === 'expired')
      const state = examStateFromRow(row)
      const lines = buildExamAvailabilityLines(row, state)
      return {
        id: row.id,
        title: row.title,
        course: row.course ?? 'المقرر',
        durationMinutes: row.duration_minutes,
        questionCount: row.question_count,
        windowLabel: formatWindow(row.available_from, row.available_to),
        windowStartHour: 0,
        windowEndHour: 0,
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

  async startExam(_student, examId) {
    const { data: body } = await studentClient.post(`/student/exams/${examId}/start`)
    return mapResumePayload(body.data)
  },

  async getExamAttempt(_student, examId) {
    try {
      const { data: body } = await studentClient.get(`/student/exams/${examId}/attempt`)
      return mapResumePayload(body.data)
    } catch (e) {
      if (e.status === 404) return null
      throw e
    }
  },

  async submitExam(_student, examOrId, answers) {
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

    await studentClient.post(`/student/attempts/${attemptId}/submit`, payload)

    const { data: resultBody } = await studentClient.get(`/student/attempts/${attemptId}/result`)
    return mapResultPayload(resultBody.data)
  },

  async getExamResult(_student, examId) {
    let attemptId
    try {
      const { data: body } = await studentClient.get(`/student/exams/${examId}/attempt`)
      const st = body.data?.attempt?.status
      attemptId = body.data?.attempt?.id
      if (!attemptId || (st !== 'submitted' && st !== 'expired')) return null
    } catch (e) {
      if (e.status === 404) return null
      throw e
    }

    const { data: resultBody } = await studentClient.get(`/student/attempts/${attemptId}/result`)
    return mapResultPayload(resultBody.data)
  },

  async getBooks(_student) {
    const rows = await paginateAll('/student/books')
    return rows.map((b) => {
      const kind = bookKindFromRow(b)
      const created = b.created_at ? new Date(b.created_at) : null
      const dateLabel =
        created && !Number.isNaN(created.getTime())
          ? created.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })
          : '—'
      const mb = b.file_size_mb
      return {
        id: b.id,
        title: b.title,
        course: b.course?.name ?? 'المقرر',
        author: 'غير محدد',
        pages: '—',
        accessUrl: b.access_url || null,
        pdfUrl: b.access_url ? '#' : storageUrl(b.file_path),
        kind,
        dateLabel,
        sizeLabel: typeof mb === 'number' ? `${Number(mb).toLocaleString('ar-EG', { maximumFractionDigits: 1 })} MB` : null,
      }
    })
  },

  async getLectures(_student) {
    const rows = await paginateAll('/student/lectures')
    return rows.map((lec) => {
      const dm = lec.duration_minutes
      const created = lec.created_at ? new Date(lec.created_at) : null
      const createdIso = lec.created_at ?? null
      const completed = Boolean(
        lec.watched_at ?? lec.completed_at ?? lec.is_completed ?? lec.student_completed ?? false,
      )
      return {
        id: lec.id,
        title: lec.title,
        course: lec.course?.name ?? 'المقرر',
        type: lec.lecture_type === 'video' ? 'video' : 'audio',
        duration: Number.isFinite(dm) && dm > 0 ? `${dm} دقيقة` : '—',
        accessUrl: lec.access_url || null,
        url:
          lec.access_url && /^https?:\/\//i.test(lec.access_url)
            ? lec.access_url
            : lec.access_url && !/^https?:\/\//i.test(lec.access_url)
              ? '#'
              : storageUrl(lec.file_path),
        lecturerName: lec.lecturer_name?.trim() || '',
        createdAt: createdIso,
        completed,
        isNew:
          !completed &&
          created &&
          !Number.isNaN(created.getTime()) &&
          Date.now() - created.getTime() < 7 * 86400000,
      }
    })
  },

  /** Questionnaires (level-scoped, separate from exams). */
  async getQuestionnaires(_student) {
    return paginateAll('/student/questionnaires')
  },

  async startQuestionnaire(_student, questionnaireId) {
    const { data: body } = await studentClient.post(`/student/questionnaires/${questionnaireId}/start`)
    return body.data
  },

  async getQuestionnaireResponse(_student, responseId) {
    const { data: body } = await studentClient.get(`/student/questionnaire-responses/${responseId}`)
    return body.data
  },

  async saveQuestionnaireAnswers(_student, responseId, answers) {
    await studentClient.patch(`/student/questionnaire-responses/${responseId}/answers`, { answers })
  },

  async submitQuestionnaire(_student, responseId) {
    const { data: body } = await studentClient.post(`/student/questionnaire-responses/${responseId}/submit`)
    return body.data
  },
}
