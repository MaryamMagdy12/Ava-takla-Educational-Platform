import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import * as adminApi from "../api/adminApi";
import { adminReadToken } from "../api/config";
import { GA_BASE, SPECIAL_BASE } from "../navigation/adminPaths";
import { resolveLearnerPhotoUrlFromRecord } from "../utils/resolveLearnerPhotoUrl";

const AdminDataContext = createContext(null);

function mapLevel(l) {
  return {
    id: l.id,
    name: l.name,
    codePrefix: l.code_prefix,
    permanentPasswordPrefix: l.permanent_password_prefix ?? "",
    track: l.track?.name ?? "",
    trackId: l.track_id ?? l.track?.id,
    active: l.status !== "inactive",
    status: l.status,
  };
}

function mapStudent(s) {
  return {
    id: s.id,
    name: s.full_name,
    studentId: s.student_unique_id,
    level: s.level?.name ?? "—",
    levelId: s.level_id,
    trackId: s.track_id,
    email: s.email ?? "",
    parentName: s.parent_name ?? "",
    parentPhone: s.parent_phone ?? "",
    parentEmail: s.parent_email ?? "",
    status: s.status,
    photoUrl: resolveLearnerPhotoUrlFromRecord(s),
  };
}

function mapTrack(t) {
  return { id: t.id, name: t.name, description: t.description ?? "", status: t.status };
}

function mapCourse(c) {
  return {
    id: c.id,
    name: c.name,
    description: c.description ?? "",
    status: c.status,
    track_id: c.track_id ?? null,
    lectures_count: c.lectures_count ?? c.lecturesCount ?? null,
    exams_count: c.exams_count ?? c.examsCount ?? null,
  };
}

function mapExam(e, courses, tracks) {
  const course = courses.find((x) => x.id === e.course_id);
  const track = tracks.find((x) => x.id === e.track_id);
  return {
    id: e.id,
    title: e.title,
    course: course?.name ?? "—",
    track: track?.name ?? "—",
    courseId: e.course_id,
    trackId: e.track_id,
    questions: e.question_count,
    duration: e.duration_minutes,
    published: e.status === "published",
    status: e.status,
    showCorrectAnswersAfterSubmit: Boolean(e.show_correct_answers_after_submit),
  };
}

function mapBook(b, courses, tracks) {
  const course = courses.find((x) => x.id === b.course_id);
  const track = tracks.find((x) => x.id === b.track_id);
  return {
    id: b.id,
    title: b.title,
    course: course?.name ?? "—",
    courseId: b.course_id,
    track: track?.name ?? "—",
    trackId: b.track_id,
    file_type: b.file_type,
    status: b.status,
    file_path: b.file_path ?? "",
  };
}

function mapLecture(l, courses, tracks) {
  const course = courses.find((x) => x.id === l.course_id);
  const track = tracks.find((x) => x.id === l.track_id);
  return {
    id: l.id,
    title: l.title,
    course: course?.name ?? "—",
    courseId: l.course_id,
    track: track?.name ?? "—",
    trackId: l.track_id,
    lecture_type: l.lecture_type,
    duration_minutes: l.duration_minutes ?? null,
    status: l.status,
    file_path: l.file_path ?? "",
  };
}

function mapQuestion(q, courses, tracks) {
  const course = courses.find((x) => x.id === q.course_id);
  const track = tracks.find((x) => x.id === q.track_id);
  const options = [...(q.options ?? [])].sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  const letters = ["A", "B", "C", "D", "E", "F"];
  return {
    id: q.id,
    text: q.question_text,
    difficulty: q.difficulty,
    course: course?.name ?? "—",
    courseId: q.course_id,
    track: track?.name ?? "—",
    trackId: q.track_id,
    question_type: q.question_type,
    options: options.map((o, i) => ({
      id: o.id,
      text: o.option_text ?? "",
      isCorrect: Boolean(o.is_correct),
      label: letters[i] ?? String(i + 1),
    })),
  };
}

export function AdminDataProvider({ children }) {
  const { pathname } = useLocation();
  const iface = pathname.startsWith(GA_BASE) ? "general_assembly" : pathname.startsWith(SPECIAL_BASE) ? "special" : "student";
  const [tracks, setTracks] = useState([]);
  const [courses, setCourses] = useState([]);
  const [levels, setLevels] = useState([]);
  const [students, setStudents] = useState([]);
  const [exams, setExams] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [books, setBooks] = useState([]);
  const [lectures, setLectures] = useState([]);

  const loadCourseTrackRows = useCallback(async () => {
    const [rawCourses, rawTracks] = await Promise.all([adminApi.fetchCourses(), adminApi.fetchTracks()]);
    return {
      courseRows: rawCourses.map(mapCourse),
      trackRows: rawTracks.map(mapTrack),
    };
  }, []);

  const refreshTracks = useCallback(async () => {
    const rows = await adminApi.fetchTracks();
    setTracks(rows.map(mapTrack));
  }, []);

  const refreshCourses = useCallback(async () => {
    const rows = await adminApi.fetchCourses();
    setCourses(rows.map(mapCourse));
  }, []);

  const refreshLevels = useCallback(async () => {
    const rows = await adminApi.fetchLevels();
    setLevels(rows.map(mapLevel));
  }, []);

  const refreshStudents = useCallback(async () => {
    const rows = await adminApi.fetchStudents();
    setStudents(rows.map(mapStudent));
  }, []);

  const refreshExams = useCallback(async () => {
    const [rows, { courseRows, trackRows }] = await Promise.all([adminApi.fetchExams(), loadCourseTrackRows()]);
    setExams(rows.map((e) => mapExam(e, courseRows, trackRows)));
  }, [loadCourseTrackRows]);

  const refreshQuestions = useCallback(async () => {
    const [rows, { courseRows, trackRows }] = await Promise.all([adminApi.fetchQuestions(), loadCourseTrackRows()]);
    setQuestions(rows.map((q) => mapQuestion(q, courseRows, trackRows)));
  }, [loadCourseTrackRows]);

  const refreshBooks = useCallback(async () => {
    const [rows, { courseRows, trackRows }] = await Promise.all([adminApi.fetchBooks(), loadCourseTrackRows()]);
    setBooks(rows.map((b) => mapBook(b, courseRows, trackRows)));
  }, [loadCourseTrackRows]);

  const refreshLectures = useCallback(async () => {
    const [rows, { courseRows, trackRows }] = await Promise.all([adminApi.fetchLectures(), loadCourseTrackRows()]);
    setLectures(rows.map((l) => mapLecture(l, courseRows, trackRows)));
  }, [loadCourseTrackRows]);

  const bootstrapLmsData = useCallback(async (includeStudents) => {
    const [rawTracks, rawCourses, rawLevels, rawExams, rawQuestions, rawBooks, rawLectures, rawStudents] = await Promise.all([
      adminApi.fetchTracks(),
      adminApi.fetchCourses(),
      adminApi.fetchLevels(),
      adminApi.fetchExams(),
      adminApi.fetchQuestions(),
      adminApi.fetchBooks(),
      adminApi.fetchLectures(),
      includeStudents ? adminApi.fetchStudents() : Promise.resolve([]),
    ]);

    const trackRows = rawTracks.map(mapTrack);
    const courseRows = rawCourses.map(mapCourse);

    setTracks(trackRows);
    setCourses(courseRows);
    setLevels(rawLevels.map(mapLevel));
    setStudents(includeStudents ? rawStudents.map(mapStudent) : []);
    setExams(rawExams.map((e) => mapExam(e, courseRows, trackRows)));
    setQuestions(rawQuestions.map((q) => mapQuestion(q, courseRows, trackRows)));
    setBooks(rawBooks.map((b) => mapBook(b, courseRows, trackRows)));
    setLectures(rawLectures.map((l) => mapLecture(l, courseRows, trackRows)));
  }, []);

  useEffect(() => {
    // Prevent stale cross-interface data while moving between interfaces.
    setTracks([]);
    setCourses([]);
    setLevels([]);
    setStudents([]);
    setExams([]);
    setQuestions([]);
    setBooks([]);
    setLectures([]);
  }, [iface]);

  useEffect(() => {
    const token = adminReadToken();
    if (!token) return;
    if (iface === "student") {
      bootstrapLmsData(true).catch(() => {});
      return;
    }
    if (iface === "special") {
      bootstrapLmsData(false).catch(() => {});
      return;
    }
    // general_assembly has its own dedicated datasets (families/competitions/GA lectures/questionnaires).
  }, [
    iface,
    bootstrapLmsData,
  ]);

  const value = useMemo(() => ({
    tracks,
    courses,
    levels,
    students,
    exams,
    questions,
    books,
    lectures,
    refreshTracks,
    refreshCourses,
    refreshLevels,
    refreshStudents,
    refreshExams,
    refreshQuestions,
    refreshBooks,
    refreshLectures,
    setStudents,
  }), [
    tracks,
    courses,
    levels,
    students,
    exams,
    questions,
    books,
    lectures,
    refreshTracks,
    refreshCourses,
    refreshLevels,
    refreshStudents,
    refreshExams,
    refreshQuestions,
    refreshBooks,
    refreshLectures,
  ]);

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}

export function useAdminData() {
  const ctx = useContext(AdminDataContext);
  if (!ctx) {
    throw new Error("useAdminData must be used within AdminDataProvider");
  }
  return ctx;
}
