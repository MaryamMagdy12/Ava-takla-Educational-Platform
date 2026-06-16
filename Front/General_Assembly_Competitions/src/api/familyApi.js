import { apiClient } from './apiClient'

/**
 * Canonical session from `GET /auth/me` (Bearer family token).
 * @returns {Promise<{ kind: string, user: object, must_change_password: boolean } | null>}
 */
export async function fetchFamilyAuthMe() {
  try {
    const { data } = await apiClient.get('/auth/me')
    const block = data?.data
    if (!block || block.kind !== 'ga_family') return null
    return {
      kind: block.kind,
      user: block.user ?? null,
      must_change_password: Boolean(block.must_change_password),
    }
  } catch (e) {
    if (e?.status === 401) {
      return null
    }
    throw e
  }
}

function normalizeCourse(c) {
  return {
    id: String(c.id),
    title: c.title,
    summary: c.summary ?? '',
    durationLabel: c.duration_label ?? c.durationLabel ?? '',
    level: c.level ?? '',
  }
}

export async function fetchGaCatalogCourses() {
  try {
    const { data } = await apiClient.get('/ga/catalog/courses')
    const rows = data?.data
    if (!Array.isArray(rows)) return []
    return rows.map(normalizeCourse)
  } catch {
    return null
  }
}

/** Published rows from admin «ga_lectures» (status published). */
export async function fetchGaCatalogPublishedLectures() {
  try {
    const { data } = await apiClient.get('/ga/catalog/published-lectures')
    const rows = data?.data
    if (!Array.isArray(rows)) return []
    return rows.map((row) => {
      const fileUrl = row.video_file_url ? String(row.video_file_url) : ''
      const extUrl = row.video_url ? String(row.video_url) : ''
      const playUrl = fileUrl || extUrl
      return {
        id: `ga-lecture-${row.id}`,
        title: row.title,
        summary: row.summary ?? '',
        durationLabel: row.duration_label ?? row.durationLabel ?? '—',
        level: 'محاضرة',
        actionUrl: playUrl || null,
        videoFileUrl: fileUrl || null,
        videoExternalUrl: extUrl || null,
      }
    })
  } catch {
    return null
  }
}

/** Total published competitions in the current live window (family API). */
export async function fetchFamilyCompetitionsTotal() {
  try {
    const { data } = await apiClient.get('/family/competitions', { params: { page: 1 } })
    const pag = data?.data
    if (!pag) return 0
    const total = Number(pag.total)
    if (Number.isFinite(total)) return total
    return Array.isArray(pag.data) ? pag.data.length : 0
  } catch {
    return 0
  }
}

export async function fetchAllFamilyCompetitions() {
  const all = []
  let page = 1
  let lastPage = 1
  do {
    const { data } = await apiClient.get('/family/competitions', { params: { page } })
    const pag = data?.data
    if (!pag?.data) break
    all.push(...pag.data)
    lastPage = pag.last_page ?? 1
    page += 1
  } while (page <= lastPage)
  return all
}

function formatWindow(startsAt, endsAt) {
  try {
    const s = new Date(startsAt)
    const e = new Date(endsAt)
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return ''
    return `${s.toLocaleDateString('ar-EG')} — ${e.toLocaleDateString('ar-EG')}`
  } catch {
    return ''
  }
}

export function formatArDate(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return '—'
  }
}

export function formatArDateTime(iso) {
  if (!iso) return null
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    return d.toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return null
  }
}

function competitionDurationText(c) {
  const h = c.max_attempt_duration_hours
  if (h == null || !Number.isFinite(Number(h)) || Number(h) <= 0) return '—'
  const n = Number(h)
  const minutes = Math.round(n * 60)
  return minutes > 0 ? `${minutes} دقيقة` : '—'
}

/** List row: published competitions in the live window (family index). */
export function gaCompetitionStateFromRow(c) {
  const att = c.attempt
  if (att?.status === 'submitted') return 'Submitted'
  if (att?.status === 'expired') return 'Expired'
  if (att?.status === 'in_progress') return 'In Progress'
  return 'Available'
}

export function mapCompetitionRow(c) {
  const att = c.attempt
  const state = gaCompetitionStateFromRow(c)
  const graded = att && (att.status === 'submitted' || att.status === 'expired')
  return {
    id: `comp-${c.id}`,
    competitionId: c.id,
    title: c.title,
    course: 'مسابقات الجمعية العامة',
    courseTitle: 'مسابقات الجمعية العامة',
    windowLabel: formatWindow(c.starts_at, c.ends_at),
    questionsCount: att?.total_questions ?? '—',
    mode: 'مسابقة',
    attempt: att,
    state,
    durationText: competitionDurationText(c),
    endsAtLabel: formatArDateTime(c.ends_at),
    whenText: formatArDate(c.starts_at),
    attemptScore: graded && att.score != null ? Number(att.score) : null,
    attemptTotal: graded && att.total_questions != null ? Number(att.total_questions) : null,
  }
}

export async function postFamilyLogin(family_login_id, password) {
  const { data } = await apiClient.post('/auth/family/login', { family_login_id, password })
  if (!data?.data?.token) throw new Error('Invalid login response.')
  return data.data
}

export async function postFamilyChangePassword(current_password, new_password, new_password_confirmation) {
  await apiClient.post('/family/change-password', {
    current_password,
    new_password,
    new_password_confirmation,
  })
}

export async function startCompetition(competitionId) {
  const { data } = await apiClient.post(`/family/competitions/${competitionId}/start`)
  return data.data
}

export async function resumeAttempt(attemptId) {
  const { data } = await apiClient.get(`/family/competition-attempts/${attemptId}`)
  return data.data
}

export async function submitAttempt(attemptId, answers) {
  const { data } = await apiClient.post(`/family/competition-attempts/${attemptId}/submit`, {
    answers,
  })
  return data.data
}

export async function fetchAttemptResult(attemptId) {
  const { data } = await apiClient.get(`/family/competition-attempts/${attemptId}/result`)
  return data.data
}

export async function fetchAllFamilyExams() {
  const all = []
  let page = 1
  let lastPage = 1
  do {
    const { data } = await apiClient.get('/family/exams', { params: { page } })
    const pag = data?.data
    if (!pag?.data) break
    all.push(...pag.data)
    lastPage = pag.last_page ?? 1
    page += 1
  } while (page <= lastPage)
  return all
}

function gaExamStateFromRow(row) {
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

export function mapFamilyExamRow(row) {
  const att = row.attempt
  const graded = att && (att.status === 'submitted' || att.status === 'expired')
  return {
    ...row,
    course: 'امتحانات العائلات',
    state: gaExamStateFromRow(row),
    durationText: row.duration_minutes != null ? `${row.duration_minutes} دقيقة` : '—',
    durationMinutes: row.duration_minutes,
    endsAtLabel: formatArDateTime(row.available_to),
    whenText: formatArDate(row.available_from),
    attemptScore: graded ? att.score ?? 0 : null,
    attemptTotal: graded ? att.max_score ?? row.question_count ?? 0 : null,
    attemptPercentage: graded && att.percentage != null ? Math.round(Number(att.percentage)) : null,
  }
}

export async function startFamilyExam(examId) {
  const { data } = await apiClient.post(`/family/exams/${examId}/start`)
  return data.data
}

export async function fetchFamilyExamAttempt(examId) {
  try {
    const { data } = await apiClient.get(`/family/exams/${examId}/attempt`)
    return data.data
  } catch (e) {
    if (e.status === 404) return null
    throw e
  }
}

export async function resumeFamilyExamAttempt(attemptId) {
  const { data } = await apiClient.get(`/family/exam-attempts/${attemptId}`)
  return data.data
}

export async function submitFamilyExamAttempt(attemptId, answers) {
  const { data } = await apiClient.post(`/family/exam-attempts/${attemptId}/submit`, { answers })
  return data.data
}

export async function fetchFamilyExamResult(attemptId) {
  const { data } = await apiClient.get(`/family/exam-attempts/${attemptId}/result`)
  return data.data
}

export async function fetchAllFamilyQuestionnaires() {
  const all = []
  let page = 1
  let lastPage = 1
  do {
    const { data } = await apiClient.get('/family/questionnaires', { params: { page } })
    const pag = data?.data
    if (!pag?.data) break
    all.push(...pag.data)
    lastPage = pag.last_page ?? 1
    page += 1
  } while (page <= lastPage)
  return all
}

export async function startFamilyQuestionnaire(questionnaireId) {
  const { data } = await apiClient.post(`/family/questionnaires/${questionnaireId}/start`)
  return data.data
}

export async function resumeFamilyQuestionnaireResponse(responseId) {
  const { data } = await apiClient.get(`/family/questionnaire-responses/${responseId}`)
  return data.data
}

export async function saveFamilyQuestionnaireAnswers(responseId, answers) {
  await apiClient.patch(`/family/questionnaire-responses/${responseId}/answers`, { answers })
}

export async function submitFamilyQuestionnaireResponse(responseId) {
  const { data } = await apiClient.post(`/family/questionnaire-responses/${responseId}/submit`)
  return data.data
}
