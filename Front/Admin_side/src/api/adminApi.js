import { adminClient, fetchAllPages } from "./axiosClient";

/** Validates bearer token and returns role + user (replaces separate profile + interfaces bootstrap). */
export async function fetchAuthMe() {
  const { data } = await adminClient.get("/auth/me");
  const block = data?.data;
  if (!block || block.kind !== "admin") {
    const e = new Error("Session invalid.");
    e.status = 401;
    throw e;
  }
  return block;
}

/** LMS API prefix: `/admin` (deacons) or `/admin/special-lms` (special). */
let adminLmsBase = "/admin";

export function setAdminLmsBase(base) {
  const s = String(base || "/admin").trim().replace(/\/+$/, "");
  adminLmsBase = s || "/admin";
}

export function getAdminLmsBase() {
  return adminLmsBase;
}

function lms(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${getAdminLmsBase()}${p}`;
}

/** @param {"student"|"special"|"general_assembly"} scope */
export function questionnairesAdminListPath(scope) {
  if (scope === "general_assembly") return "/admin/general-assembly/questionnaires";
  if (scope === "special") return "/admin/special-lms/questionnaires";
  return "/admin/questionnaires";
}

const GA_LECTURES_PATH = "/admin/general-assembly/lectures";

export async function fetchGaLectures() {
  return fetchAllPages(GA_LECTURES_PATH);
}

/**
 * Create GA lecture. Pass `video` as a `File` for upload (multipart), or omit and send JSON fields only.
 * @param {(percent: number | null) => void} [onUploadProgress]
 * @param {AbortSignal} [signal]
 */
export async function createGaLectureApi(body, onUploadProgress, signal) {
  const hasFile = body && typeof body === "object" && body.video instanceof File;
  if (hasFile) {
    const fd = new FormData();
    fd.append("title", String(body.title ?? "").trim());
    if (body.summary != null && String(body.summary).trim() !== "") {
      fd.append("summary", String(body.summary).trim());
    }
    if (body.video_url != null && String(body.video_url).trim() !== "") {
      fd.append("video_url", String(body.video_url).trim());
    }
    if (body.duration_label != null && String(body.duration_label).trim() !== "") {
      fd.append("duration_label", String(body.duration_label).trim());
    }
    fd.append("sort_order", String(body.sort_order === "" || body.sort_order == null ? 0 : body.sort_order));
    fd.append("status", body.status ? String(body.status) : "draft");
    fd.append("video", body.video);
    const { data } = await adminClient.post(GA_LECTURES_PATH, fd, {
      signal,
      onUploadProgress: onUploadProgress
        ? (ev) => {
            const { loaded, total } = ev;
            if (total && total > 0) {
              onUploadProgress(Math.min(100, Math.round((loaded * 100) / total)));
            } else {
              onUploadProgress(null);
            }
          }
        : undefined,
    });
    return data.data;
  }
  const { data } = await adminClient.post(GA_LECTURES_PATH, body, { signal });
  return data.data;
}

/**
 * @param {(percent: number | null) => void} [onUploadProgress]
 * @param {AbortSignal} [signal]
 */
export async function updateGaLectureApi(id, body, onUploadProgress, signal) {
  const hasFile = body && typeof body === "object" && body.video instanceof File;
  if (hasFile) {
    const fd = new FormData();
    if (body.title != null) fd.append("title", String(body.title).trim());
    if (body.summary !== undefined) {
      fd.append("summary", body.summary == null ? "" : String(body.summary).trim());
    }
    if (body.video_url !== undefined) {
      fd.append("video_url", body.video_url == null ? "" : String(body.video_url).trim());
    }
    if (body.duration_label !== undefined) {
      fd.append("duration_label", body.duration_label == null ? "" : String(body.duration_label).trim());
    }
    if (body.sort_order !== undefined) {
      fd.append("sort_order", String(body.sort_order === "" || body.sort_order == null ? 0 : body.sort_order));
    }
    if (body.status != null) fd.append("status", String(body.status));
    fd.append("video", body.video);
    const { data } = await adminClient.put(`${GA_LECTURES_PATH}/${id}`, fd, {
      signal,
      onUploadProgress: onUploadProgress
        ? (ev) => {
            const { loaded, total } = ev;
            if (total && total > 0) {
              onUploadProgress(Math.min(100, Math.round((loaded * 100) / total)));
            } else {
              onUploadProgress(null);
            }
          }
        : undefined,
    });
    return data.data;
  }
  const { data } = await adminClient.put(`${GA_LECTURES_PATH}/${id}`, body, { signal });
  return data.data;
}

export async function deleteGaLectureApi(id) {
  await adminClient.delete(`${GA_LECTURES_PATH}/${id}`);
}

export async function fetchQuestionnairesAdmin(scope) {
  return fetchAllPages(questionnairesAdminListPath(scope));
}

export async function createQuestionnaireAdmin(scope, body) {
  const { data } = await adminClient.post(questionnairesAdminListPath(scope), body);
  return data.data;
}

export async function fetchQuestionnaireAdmin(scope, id) {
  const { data } = await adminClient.get(`${questionnairesAdminListPath(scope)}/${id}`);
  return data.data;
}

export async function updateQuestionnaireAdmin(scope, id, body) {
  const { data } = await adminClient.put(`${questionnairesAdminListPath(scope)}/${id}`, body);
  return data.data;
}

export async function deleteQuestionnaireAdmin(scope, id) {
  await adminClient.delete(`${questionnairesAdminListPath(scope)}/${id}`);
}

export async function addQuestionnaireQuestionAdmin(scope, questionnaireId, body) {
  const base = questionnairesAdminListPath(scope);
  const { data } = await adminClient.post(`${base}/${questionnaireId}/questions`, body);
  return data.data;
}

export async function addQuestionnaireOptionAdmin(scope, questionnaireId, questionId, body) {
  const base = questionnairesAdminListPath(scope);
  const { data } = await adminClient.post(`${base}/${questionnaireId}/questions/${questionId}/options`, body);
  return data.data;
}

export async function updateQuestionnaireQuestionAdmin(scope, questionnaireId, questionId, body) {
  const base = questionnairesAdminListPath(scope);
  const { data } = await adminClient.put(`${base}/${questionnaireId}/questions/${questionId}`, body);
  return data.data;
}

export async function updateQuestionnaireOptionAdmin(scope, questionnaireId, questionId, optionId, body) {
  const base = questionnairesAdminListPath(scope);
  const { data } = await adminClient.put(`${base}/${questionnaireId}/questions/${questionId}/options/${optionId}`, body);
  return data.data;
}

export async function fetchQuestionnaireDetailsAdmin(scope, id, { page = 1, perPage = 50 } = {}) {
  const { data } = await adminClient.get(`${questionnairesAdminListPath(scope)}/${id}/details`, {
    params: { page, per_page: perPage },
  });
  return data.data;
}

export async function adminLogin(login, password) {
  const { data } = await adminClient.post(
    "/auth/admin/login",
    { login, password },
    { skipAuth: true },
  );
  if (!data?.success || !data?.data?.token) {
    throw new Error(data?.message || "Login failed");
  }
  return data.data;
}

export async function adminLogout() {
  try {
    await adminClient.post("/auth/logout");
  } catch {
    /* ignore */
  }
}

export async function fetchDashboardStats() {
  const { data } = await adminClient.get("/admin/dashboard/stats");
  return data.data;
}

/** Same metrics as stats; explicit student-interface dashboard. */
export async function fetchDashboardStudent() {
  const { data } = await adminClient.get("/admin/dashboard/student");
  return data.data;
}

export async function fetchDashboardInterfaces() {
  const { data } = await adminClient.get("/admin/dashboard/interfaces");
  return data.data;
}

export async function fetchGaDashboard() {
  const { data } = await adminClient.get("/admin/general-assembly/dashboard");
  return data.data;
}

export async function fetchSpecialDashboard() {
  const { data } = await adminClient.get("/admin/dashboard/special");
  return data.data;
}

export async function fetchGaFamilies() {
  return fetchAllPages("/admin/general-assembly/families");
}

/** @returns {Promise<{ data: object, family_login_id?: string, temporary_password?: string, permanent_password?: string, message?: string }>} */
export async function createGaFamilyApi(body) {
  const { data } = await adminClient.post("/admin/general-assembly/families", body);
  return data;
}

export async function updateGaFamilyApi(familyId, body) {
  const { data } = await adminClient.put(`/admin/general-assembly/families/${familyId}`, body);
  return data.data;
}

export async function deleteGaFamilyApi(familyId, adminPassword) {
  await adminClient.delete(`/admin/general-assembly/families/${familyId}`, {
    data: { admin_password: adminPassword },
  });
}

export async function toggleGaFamilyStatus(familyId) {
  await adminClient.patch(`/admin/general-assembly/families/${familyId}/toggle-status`);
}

export async function resetGaFamilyPassword(familyId, adminPassword) {
  const { data } = await adminClient.post(`/admin/general-assembly/families/${familyId}/reset-password`, {
    admin_password: adminPassword,
  });
  return {
    temporary_password: data.temporary_password ?? "",
    permanent_password: data.permanent_password ?? "",
    message: data.message ?? "",
  };
}

export async function fetchGaFamilyExamAttemptsApi(familyId) {
  return fetchAllPages(`/admin/general-assembly/families/${familyId}/exam-attempts`);
}

export async function fetchGaFamilyCompetitionAttemptsApi(familyId) {
  return fetchAllPages(`/admin/general-assembly/families/${familyId}/competition-attempts`);
}

export async function fetchSpecialLearners() {
  return fetchAllPages("/admin/special-learners");
}

export async function updateSpecialLearnerApi(learnerId, body) {
  const { data } = await adminClient.put(`/admin/special-learners/${learnerId}`, body);
  return {
    learner: data.data,
    issued_credentials: data.issued_credentials ?? null,
  };
}

export async function deleteSpecialLearnerApi(learnerId, adminPassword) {
  await adminClient.delete(`/admin/special-learners/${learnerId}`, {
    data: { admin_password: adminPassword },
  });
}

export async function toggleSpecialLearnerStatus(learnerId, adminPassword) {
  const body = adminPassword ? { admin_password: adminPassword } : {};
  const { data } = await adminClient.patch(`/admin/special-learners/${learnerId}/toggle-status`, body);
  return {
    learner: data.data,
    issued_credentials: data.issued_credentials ?? null,
  };
}

/** @returns {{ temporary_password: string, permanent_password: string, message?: string }} */
export async function resetSpecialLearnerPasswordApi(learnerId, adminPassword) {
  const { data } = await adminClient.post(`/admin/special-learners/${learnerId}/reset-password`, {
    admin_password: adminPassword,
  });
  return {
    temporary_password: data.data?.temporary_password ?? "",
    permanent_password: data.data?.permanent_password ?? "",
    message: data.message ?? "",
  };
}

export async function fetchGaCompetitionApi(competitionId) {
  const { data } = await adminClient.get(`/admin/general-assembly/competitions/${competitionId}`);
  return data.data;
}

export async function createGaCompetitionApi(body) {
  const { data } = await adminClient.post("/admin/general-assembly/competitions", body);
  return data.data;
}

export async function updateGaCompetitionApi(competitionId, body) {
  const { data } = await adminClient.put(`/admin/general-assembly/competitions/${competitionId}`, body);
  return data.data;
}

export async function deleteGaCompetitionApi(competitionId) {
  await adminClient.delete(`/admin/general-assembly/competitions/${competitionId}`);
}

export async function addGaCompetitionQuestionApi(competitionId, body) {
  const { data } = await adminClient.post(`/admin/general-assembly/competitions/${competitionId}/questions`, body);
  return data.data;
}

export async function updateGaCompetitionQuestionApi(competitionId, questionId, body) {
  const { data } = await adminClient.put(
    `/admin/general-assembly/competitions/${competitionId}/questions/${questionId}`,
    body,
  );
  return data.data;
}

export async function deleteGaCompetitionQuestionApi(competitionId, questionId) {
  await adminClient.delete(`/admin/general-assembly/competitions/${competitionId}/questions/${questionId}`);
}

export async function addGaCompetitionOptionApi(competitionId, questionId, body) {
  const { data } = await adminClient.post(
    `/admin/general-assembly/competitions/${competitionId}/questions/${questionId}/options`,
    body,
  );
  return data.data;
}

export async function updateGaCompetitionOptionApi(competitionId, questionId, optionId, body) {
  const { data } = await adminClient.put(
    `/admin/general-assembly/competitions/${competitionId}/questions/${questionId}/options/${optionId}`,
    body,
  );
  return data.data;
}

export async function deleteGaCompetitionOptionApi(competitionId, questionId, optionId) {
  await adminClient.delete(`/admin/general-assembly/competitions/${competitionId}/questions/${questionId}/options/${optionId}`);
}

export async function addGaCompetitionTopicApi(competitionId, body) {
  const { data } = await adminClient.post(`/admin/general-assembly/competitions/${competitionId}/topics`, body);
  return data.data;
}

export async function updateGaCompetitionTopicApi(competitionId, topicId, body) {
  const { data } = await adminClient.put(`/admin/general-assembly/competitions/${competitionId}/topics/${topicId}`, body);
  return data.data;
}

export async function deleteGaCompetitionTopicApi(competitionId, topicId) {
  await adminClient.delete(`/admin/general-assembly/competitions/${competitionId}/topics/${topicId}`);
}

export async function addGaCompetitionRuleApi(competitionId, body) {
  const { data } = await adminClient.post(`/admin/general-assembly/competitions/${competitionId}/rules`, body);
  return data.data;
}

export async function deleteGaCompetitionRuleApi(competitionId, ruleId) {
  await adminClient.delete(`/admin/general-assembly/competitions/${competitionId}/rules/${ruleId}`);
}

export async function fetchGaCompetitionAttemptsApi(competitionId) {
  return fetchAllPages(`/admin/general-assembly/competitions/${competitionId}/attempts`);
}

export async function fetchGaCompetitionAttemptDetailsApi(competitionId, attemptId) {
  const { data } = await adminClient.get(`/admin/general-assembly/competitions/${competitionId}/attempts/${attemptId}`);
  return data.data;
}

export async function verifyGaCompetitionAttemptApi(attemptId) {
  const { data } = await adminClient.post(`/admin/general-assembly/competition-attempts/${attemptId}/verify`);
  return data.data;
}

export async function fetchGaCompetitionBankPartsApi(params = {}) {
  return fetchAllPages("/admin/general-assembly/competition-bank/parts", params);
}

export async function createGaCompetitionBankPartApi(body) {
  const { data } = await adminClient.post("/admin/general-assembly/competition-bank/parts", body);
  return data.data;
}

export async function updateGaCompetitionBankPartApi(partId, body) {
  const { data } = await adminClient.put(`/admin/general-assembly/competition-bank/parts/${partId}`, body);
  return data.data;
}

export async function deleteGaCompetitionBankPartApi(partId) {
  await adminClient.delete(`/admin/general-assembly/competition-bank/parts/${partId}`);
}

export async function fetchGaCompetitionBankQuestionsApi(params = {}) {
  return fetchAllPages("/admin/general-assembly/competition-bank/questions", params);
}

export async function createGaCompetitionBankQuestionApi(body) {
  const { data } = await adminClient.post("/admin/general-assembly/competition-bank/questions", body);
  return data.data;
}

export async function updateGaCompetitionBankQuestionApi(questionId, body) {
  const { data } = await adminClient.put(`/admin/general-assembly/competition-bank/questions/${questionId}`, body);
  return data.data;
}

export async function deleteGaCompetitionBankQuestionApi(questionId) {
  await adminClient.delete(`/admin/general-assembly/competition-bank/questions/${questionId}`);
}

export async function createGaCompetitionBankOptionApi(questionId, body) {
  const { data } = await adminClient.post(`/admin/general-assembly/competition-bank/questions/${questionId}/options`, body);
  return data.data;
}

export async function updateGaCompetitionBankOptionApi(questionId, optionId, body) {
  const { data } = await adminClient.put(
    `/admin/general-assembly/competition-bank/questions/${questionId}/options/${optionId}`,
    body,
  );
  return data.data;
}

export async function deleteGaCompetitionBankOptionApi(questionId, optionId) {
  await adminClient.delete(`/admin/general-assembly/competition-bank/questions/${questionId}/options/${optionId}`);
}

export async function importGaCompetitionBankQuestionsApi(file) {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await adminClient.post("/admin/general-assembly/competition-bank/questions/import", fd);
  return data.data;
}

export async function importGaBankPartsIntoCompetitionApi(competitionId, partIds) {
  const { data } = await adminClient.post(`/admin/general-assembly/competitions/${competitionId}/import-bank-parts`, {
    part_ids: partIds,
  });
  return data.data;
}

export async function fetchGaCompetitionsAdmin() {
  return fetchAllPages("/admin/general-assembly/competitions");
}

export async function fetchGaFamilyExamsAdmin() {
  return fetchAllPages("/admin/general-assembly/family-exams");
}

export async function fetchGaFamilyExamApi(examId) {
  const { data: body } = await adminClient.get(`/admin/general-assembly/family-exams/${examId}`);
  const payload = body?.data;
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload;
  }
  return payload ?? null;
}

export async function createGaFamilyExamApi(body) {
  const { data } = await adminClient.post("/admin/general-assembly/family-exams", body);
  return data.data;
}

export async function updateGaFamilyExamApi(examId, body) {
  const { data } = await adminClient.put(`/admin/general-assembly/family-exams/${examId}`, body);
  return data.data;
}

export async function deleteGaFamilyExamApi(examId) {
  await adminClient.delete(`/admin/general-assembly/family-exams/${examId}`);
}

export async function addGaFamilyExamQuestionApi(examId, body) {
  const { data } = await adminClient.post(`/admin/general-assembly/family-exams/${examId}/questions`, body);
  return data.data;
}

export async function updateGaFamilyExamQuestionApi(examId, questionId, body) {
  const { data } = await adminClient.put(`/admin/general-assembly/family-exams/${examId}/questions/${questionId}`, body);
  return data.data;
}

export async function deleteGaFamilyExamQuestionApi(examId, questionId) {
  await adminClient.delete(`/admin/general-assembly/family-exams/${examId}/questions/${questionId}`);
}

export async function importGaFamilyExamQuestionsApi(examId, file) {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await adminClient.post(`/admin/general-assembly/family-exams/${examId}/questions/import`, fd);
  return data.data;
}

export async function addGaFamilyExamOptionApi(examId, questionId, body) {
  const { data } = await adminClient.post(
    `/admin/general-assembly/family-exams/${examId}/questions/${questionId}/options`,
    body,
  );
  return data.data;
}

export async function updateGaFamilyExamOptionApi(examId, questionId, optionId, body) {
  const { data } = await adminClient.put(
    `/admin/general-assembly/family-exams/${examId}/questions/${questionId}/options/${optionId}`,
    body,
  );
  return data.data;
}

export async function deleteGaFamilyExamOptionApi(examId, questionId, optionId) {
  await adminClient.delete(`/admin/general-assembly/family-exams/${examId}/questions/${questionId}/options/${optionId}`);
}

export async function addGaFamilyExamRuleApi(examId, body) {
  const { data } = await adminClient.post(`/admin/general-assembly/family-exams/${examId}/rules`, body);
  return data.data;
}

export async function fetchGaFamilyExamQuestionBankApi(params = {}) {
  return fetchAllPages("/admin/general-assembly/family-exam-question-bank/questions", params);
}

export async function createGaFamilyExamQuestionBankQuestionApi(body) {
  const { data } = await adminClient.post("/admin/general-assembly/family-exam-question-bank/questions", body);
  return data.data;
}

export async function updateGaFamilyExamQuestionBankQuestionApi(questionId, body) {
  const { data } = await adminClient.put(`/admin/general-assembly/family-exam-question-bank/questions/${questionId}`, body);
  return data.data;
}

export async function deleteGaFamilyExamQuestionBankQuestionApi(questionId) {
  await adminClient.delete(`/admin/general-assembly/family-exam-question-bank/questions/${questionId}`);
}

export async function importGaFamilyExamQuestionBankQuestionsApi(file) {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await adminClient.post("/admin/general-assembly/family-exam-question-bank/questions/import", fd);
  return data.data;
}

export async function createGaFamilyExamQuestionBankOptionApi(questionId, body) {
  const { data } = await adminClient.post(`/admin/general-assembly/family-exam-question-bank/questions/${questionId}/options`, body);
  return data.data;
}

export async function updateGaFamilyExamQuestionBankOptionApi(questionId, optionId, body) {
  const { data } = await adminClient.put(
    `/admin/general-assembly/family-exam-question-bank/questions/${questionId}/options/${optionId}`,
    body,
  );
  return data.data;
}

export async function deleteGaFamilyExamQuestionBankOptionApi(questionId, optionId) {
  await adminClient.delete(`/admin/general-assembly/family-exam-question-bank/questions/${questionId}/options/${optionId}`);
}

export async function fetchAdminProfile() {
  const { data } = await adminClient.get("/admin/profile");
  return data.data;
}

export async function updateAdminProfile(body) {
  const { data } = await adminClient.patch("/admin/profile", body);
  return data.data;
}

export async function fetchTracks() {
  return fetchAllPages(lms("/tracks"));
}

export async function fetchCourses() {
  return fetchAllPages(lms("/courses"));
}

export async function createCourseApi(body) {
  const { data } = await adminClient.post(lms("/courses"), body);
  return data.data;
}

export async function updateCourseApi(courseId, body) {
  const { data } = await adminClient.put(lms(`/courses/${courseId}`), body);
  return data.data;
}

export async function deleteCourseApi(courseId) {
  await adminClient.delete(lms(`/courses/${courseId}`));
}

export async function fetchLevels() {
  return fetchAllPages(lms("/levels"));
}

export async function fetchStudents() {
  return fetchAllPages("/admin/students");
}

export async function createStudentApi(body) {
  const { data } = await adminClient.post("/admin/students", body);
  return data;
}

export async function toggleStudentStatus(studentId) {
  await adminClient.patch(`/admin/students/${studentId}/toggle-status`);
}

/** Returns { temporary_password, permanent_password, message } — copy once; not stored in plain text server-side. */
export async function resetStudentPassword(studentId, adminPassword) {
  const { data } = await adminClient.post(`/admin/students/${studentId}/reset-password`, {
    admin_password: adminPassword,
  });
  return {
    temporary_password: data.temporary_password ?? "",
    permanent_password: data.permanent_password ?? "",
    message: data.message ?? "",
  };
}

/** POST /admin/levels — body matches `LevelTrackController::storeLevel` */
export async function createLevelApi(body) {
  const { data } = await adminClient.post(lms("/levels"), body);
  return data.data;
}

/** Multipart: title, course_id, track_id, file (File), status optional */
export async function createBookApi({ title, course_id, track_id, file, status }) {
  const fd = new FormData();
  fd.append("title", title);
  fd.append("course_id", String(course_id));
  if (track_id != null && track_id !== "") {
    fd.append("track_id", String(track_id));
  }
  if (status) fd.append("status", status);
  fd.append("file", file);
  const { data } = await adminClient.post(lms("/books"), fd);
  return data.data;
}

/** Multipart: title, course_id, track_id, lecture_type, file (File), status optional */
/** @param {(percent: number | null) => void} [onUploadProgress] — percent 0–100 when known, null if total size unknown */
/** @param {AbortSignal} [signal] */
export async function createLectureApi({
  title,
  course_id,
  track_id,
  lecture_type,
  file,
  external_url,
  status,
  onUploadProgress,
  signal,
}) {
  if (file) {
    const fd = new FormData();
    fd.append("title", title);
    fd.append("course_id", String(course_id));
    if (track_id != null && track_id !== "") {
      fd.append("track_id", String(track_id));
    }
    fd.append("lecture_type", lecture_type);
    if (status) fd.append("status", status);
    fd.append("file", file);
    const { data } = await adminClient.post(lms("/lectures"), fd, {
      signal,
      onUploadProgress: onUploadProgress
        ? (ev) => {
            const { loaded, total } = ev;
            if (total && total > 0) {
              onUploadProgress(Math.min(100, Math.round((loaded * 100) / total)));
            } else {
              onUploadProgress(null);
            }
          }
        : undefined,
    });
    return data.data;
  }
  const body = {
    title,
    course_id,
    lecture_type,
    status: status || "active",
    external_url: String(external_url || "").trim(),
  };
  if (track_id != null && track_id !== "") {
    body.track_id = track_id;
  }
  const { data } = await adminClient.post(lms("/lectures"), body, { signal });
  return data.data;
}

/** JSON body matches `ExamController::store` */
export async function createExamApi(body) {
  const { data } = await adminClient.post(lms("/exams"), body);
  return data.data;
}

export async function publishExamApi(examId) {
  const { data } = await adminClient.post(lms(`/exams/${examId}/publish`));
  return data.data;
}

export async function unpublishExamApi(examId) {
  const { data } = await adminClient.post(lms(`/exams/${examId}/unpublish`));
  return data.data;
}

export async function fetchExams() {
  return fetchAllPages(lms("/exams"));
}

/** Query matches `QuestionController::index` filters */
export async function fetchQuestions(params = {}) {
  return fetchAllPages(lms("/questions"), params);
}

/** POST /admin/questions — body matches `QuestionController::store` */
export async function createQuestionApi(body) {
  const { data } = await adminClient.post(lms("/questions"), body);
  return data.data;
}

export async function fetchBooks() {
  return fetchAllPages(lms("/books"));
}

export async function deleteBookApi(bookId) {
  await adminClient.delete(lms(`/books/${bookId}`));
}

export async function fetchLectures() {
  return fetchAllPages(lms("/lectures"));
}

export async function deleteLectureApi(lectureId) {
  await adminClient.delete(lms(`/lectures/${lectureId}`));
}

export async function createTrackApi(body) {
  const { data } = await adminClient.post(lms("/tracks"), body);
  return data.data;
}

export async function updateTrackApi(trackId, body) {
  const { data } = await adminClient.put(lms(`/tracks/${trackId}`), body);
  return data.data;
}

export async function deleteTrackApi(trackId) {
  await adminClient.delete(lms(`/tracks/${trackId}`));
}

export async function updateLevelApi(levelId, body) {
  const { data } = await adminClient.put(lms(`/levels/${levelId}`), body);
  return data.data;
}

export async function deleteLevelApi(levelId) {
  await adminClient.delete(lms(`/levels/${levelId}`));
}

export async function updateStudentApi(studentId, body) {
  const { data } = await adminClient.put(`/admin/students/${studentId}`, body);
  return data.data;
}

export async function deleteStudentApi(studentId, adminPassword) {
  await adminClient.delete(`/admin/students/${studentId}`, {
    data: { admin_password: adminPassword },
  });
}

export async function fetchExamApi(examId) {
  const { data } = await adminClient.get(lms(`/exams/${examId}`));
  return data.data;
}

export async function updateExamApi(examId, body) {
  const { data } = await adminClient.put(lms(`/exams/${examId}`), body);
  return data.data;
}

export async function deleteExamApi(examId) {
  await adminClient.delete(lms(`/exams/${examId}`));
}

export async function fetchQuestionApi(questionId) {
  const { data } = await adminClient.get(lms(`/questions/${questionId}`));
  return data.data;
}

export async function updateQuestionApi(questionId, body) {
  const { data } = await adminClient.put(lms(`/questions/${questionId}`), body);
  return data.data;
}

export async function deleteQuestionApi(questionId) {
  await adminClient.delete(lms(`/questions/${questionId}`));
}

export async function importQuestionsForCourseTrack({ course_id, track_id, difficulty, status, file }) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("course_id", String(course_id));
  if (track_id != null && track_id !== "") {
    fd.append("track_id", String(track_id));
  }
  if (difficulty) fd.append("difficulty", difficulty);
  if (status) fd.append("status", status);
  const { data } = await adminClient.post(lms("/questions/import-for-course-track"), fd);
  return data.data;
}

export async function importStudentsWithDefaults({ level_id, track_id, status, file }) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("level_id", String(level_id));
  if (track_id) fd.append("track_id", String(track_id));
  if (status) fd.append("status", status);
  const { data } = await adminClient.post("/admin/students/import-with-defaults", fd);
  return data.data;
}

export async function createAdminApi(body) {
  const { data } = await adminClient.post("/admin/admins", body);
  return data.data;
}

export async function fetchAdminsApi() {
  return fetchAllPages("/admin/admins");
}

export async function updateAdminApi(adminId, body) {
  const { data } = await adminClient.put(`/admin/admins/${adminId}`, body);
  return data.data;
}

export async function deleteAdminApi(adminId, adminPassword) {
  await adminClient.delete(`/admin/admins/${adminId}`, {
    data: { admin_password: adminPassword },
  });
}

export async function fetchStudentAttemptsApi(studentId, page = 1, perPage = 10) {
  const { data } = await adminClient.get(lms("/attempts"), {
    params: { student_id: studentId, page, per_page: perPage },
  });
  return data.data;
}

export async function fetchSpecialLearnerAttemptsApi(specialLearnerId, page = 1, perPage = 10) {
  const { data } = await adminClient.get(lms("/attempts"), {
    params: { special_learner_id: specialLearnerId, page, per_page: perPage },
  });
  return data.data;
}

/** @param {number|string} levelId */
export async function fetchAttendanceBoard(levelId, { heldOn, q } = {}) {
  const { data } = await adminClient.get(lms(`/attendance/levels/${levelId}/board`), {
    params: {
      held_on: heldOn || undefined,
      q: q && String(q).trim() !== "" ? String(q).trim() : undefined,
    },
  });
  return data.data;
}

/** @param {{ level_id: number, held_on: string, present_student_ids?: number[], title?: string, notes?: string }} body */
export async function saveAttendanceSessionApi(body) {
  const { data } = await adminClient.post(lms("/attendance/sessions"), body);
  return { message: data.message ?? "", data: data.data };
}

/**
 * @param {{ held_on: string, levels: { level_id: number, present_student_ids?: number[] }[], title?: string, notes?: string }} body
 */
export async function saveAttendanceSessionsBulkApi(body) {
  const { data } = await adminClient.post(lms("/attendance/sessions/bulk"), body);
  return { message: data.message ?? "", data: data.data };
}

/** @param {{ level_id?: number, from?: string, to?: string }} [params] */
export async function fetchAttendanceSessionsApi(params = {}) {
  return fetchAllPages(lms("/attendance/sessions"), params);
}

/** @param {number|string} sessionId */
export async function fetchAttendanceSessionDetailApi(sessionId) {
  const { data } = await adminClient.get(lms(`/attendance/sessions/${sessionId}`));
  return data.data;
}

/** @param {{ level_id?: number, from?: string, to?: string }} [params] */
export async function fetchAttendancePointsApi(params = {}) {
  const { data } = await adminClient.get(lms("/attendance/points"), { params });
  return data.data;
}
