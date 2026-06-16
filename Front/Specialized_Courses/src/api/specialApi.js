import { apiClient } from './apiClient'

function normalizeExam(e) {
  return {
    id: String(e.id),
    title: e.title,
    durationMin: e.duration_minutes ?? e.durationMin ?? 0,
    type: e.type ?? '',
  }
}

function normalizeCourse(c) {
  return {
    slug: String(c.slug ?? c.id ?? ''),
    title: c.title,
    tagline: c.tagline ?? '',
    summary: c.summary ?? '',
    unitCount: c.unit_count ?? c.unitCount ?? 0,
    booksCount: c.books_count ?? c.booksCount ?? 0,
    lecturesCount: c.lectures_count ?? c.lecturesCount ?? 0,
    examsCount: c.exams_count ?? (Array.isArray(c.exams) ? c.exams.length : 0),
    exams: (c.exams ?? []).map(normalizeExam),
    books: (c.books ?? []).map((b) => ({
      id: String(b.id),
      title: b.title,
    })),
    lectures: (c.lectures ?? []).map((l) => ({
      id: String(l.id),
      title: l.title,
      lectureType: l.lecture_type ?? l.lectureType ?? '',
      filePath: l.file_path ?? l.filePath ?? '',
      durationMinutes: l.duration_minutes ?? l.durationMinutes ?? null,
      lecturerName: String(l.lecturer_name ?? l.lecturerName ?? '').trim(),
    })),
  }
}

/** @returns {Promise<object[]|null>} */
export async function fetchSpecialCourses() {
  try {
    const { data } = await apiClient.get('/special/courses')
    const rows = data?.data
    if (!Array.isArray(rows)) return null
    return rows.map(normalizeCourse)
  } catch {
    return null
  }
}

export async function fetchSpecialCourseById(courseId) {
  try {
    const { data } = await apiClient.get(`/special/courses/${encodeURIComponent(courseId)}`)
    const row = data?.data
    if (!row) return null
    return normalizeCourse(row)
  } catch {
    return null
  }
}

/**
 * Unified session gate — same contract as other SPAs (`GET /auth/me`).
 * @returns {Promise<{ user: object, must_change_password: boolean, kind: string }|null>}
 */
export async function fetchAuthMe() {
  try {
    const { data } = await apiClient.get('/auth/me')
    const block = data?.data
    if (!block || block.kind !== 'special_learner') return null
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

/** @returns {Promise<object|null>} — learner profile only; prefer {@link fetchAuthMe} for bootstrap. */
export async function fetchSpecialMe() {
  const session = await fetchAuthMe()
  return session?.user ?? null
}

/** @returns {Promise<object|null>} */
export async function patchSpecialMe(body) {
  const hasFile = body && typeof body === 'object' && body.profile_picture instanceof File
  if (hasFile) {
    const fd = new FormData()
    if (body.full_name != null) fd.append('full_name', String(body.full_name))
    if (body.phone != null) fd.append('phone', body.phone === null || body.phone === '' ? '' : String(body.phone))
    if (body.address != null) fd.append('address', body.address === null || body.address === '' ? '' : String(body.address))
    if (body.age != null && body.age !== '') fd.append('age', String(body.age))
    if (body.birth_date != null && body.birth_date !== '') fd.append('birth_date', String(body.birth_date))
    fd.append('profile_picture', body.profile_picture)
    const { data } = await apiClient.patch('/special/me', fd)
    return data?.data ?? null
  }
  const { data } = await apiClient.patch('/special/me', body)
  return data?.data ?? null
}

/** @returns {Promise<object[]>} */
export async function fetchAllSpecialQuestionnaires() {
  const items = []
  let page = 1
  let lastPage = 1
  try {
    do {
      const { data } = await apiClient.get('/special/questionnaires', { params: { page } })
      const pag = data?.data
      if (!pag || !Array.isArray(pag.data)) break
      items.push(...pag.data)
      lastPage = Number(pag.last_page) || 1
      page += 1
    } while (page <= lastPage)
  } catch {
    return []
  }
  return items
}

export async function startSpecialQuestionnaire(questionnaireId) {
  const { data } = await apiClient.post(`/special/questionnaires/${questionnaireId}/start`)
  return data?.data
}

export async function resumeSpecialQuestionnaireResponse(responseId) {
  const { data } = await apiClient.get(`/special/questionnaire-responses/${responseId}`)
  return data?.data
}

export async function saveSpecialQuestionnaireAnswers(responseId, answers) {
  await apiClient.patch(`/special/questionnaire-responses/${responseId}/answers`, { answers })
}

export async function submitSpecialQuestionnaire(responseId) {
  await apiClient.post(`/special/questionnaire-responses/${responseId}/submit`)
}
