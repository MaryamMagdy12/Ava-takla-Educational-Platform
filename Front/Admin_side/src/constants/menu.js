import { Award, ShieldCheck, BookOpen, CirclePlus, ClipboardCheck, ClipboardList, FileStack, GraduationCap, LayoutDashboard, ListChecks, ListTree, ScrollText, Users } from "lucide-react";

/**
 * @param {(segment?: string) => string} stFn e.g. `st` from navigation/adminPaths
 * @param {{ includeAdmins?: boolean }} opts
 */
export function buildStudentMenu(stFn, { includeAdmins = false } = {}) {
  const items = [
    { to: stFn(), label: "لوحة التحكم", icon: LayoutDashboard, end: true },
    { to: stFn("attendance/take"), label: "تسجيل الحضور", icon: ClipboardCheck },
    { to: stFn("attendance/reports"), label: "تقارير الحضور والنقاط", icon: Award },
    { to: stFn("students"), label: "الطلاب", icon: Users },
    { to: stFn("levels"), label: "المراحل", icon: ScrollText },
    { to: stFn("tracks"), label: "المسارات", icon: ListTree },
    { to: stFn("courses"), label: "المواد", icon: FileStack },
    { to: stFn("exams"), label: "الامتحانات", icon: ClipboardList },
    { to: stFn("question-bank"), label: "بنك الأسئلة", icon: GraduationCap },
    { to: stFn("add-question"), label: "إضافة سؤال", icon: CirclePlus, end: true },
    { to: stFn("library"), label: "الكتب والمحاضرات", icon: BookOpen },
    { to: stFn("questionnaires"), label: "الاستبيانات", icon: ListChecks },
  ];
  if (includeAdmins) {
    items.splice(5, 0, {
      to: stFn("admins"),
      label: "المشرفون",
      icon: ShieldCheck,
    });
  }
  return items;
}

/**
 * @param {(segment?: string) => string} gaFn
 */
export function buildGaMenu(gaFn) {
  return [
    { to: gaFn(), label: "لوحة الاجتماع العام", icon: LayoutDashboard, end: true },
    { to: gaFn("families"), label: "عائلات المسابقة", icon: Users },
    { to: gaFn("competitions/parts-dashboard"), label: "أجزاء المسابقات", icon: ListTree },
    { to: gaFn("competitions/questions-add-dashboard"), label: "إضافة أسئلة المسابقات", icon: CirclePlus },
    { to: gaFn("competitions/questions-view-dashboard"), label: "عرض أسئلة المسابقات", icon: ClipboardList },
    { to: gaFn("competitions"), label: "المسابقات", icon: ClipboardList },
    { to: gaFn("family-exams/questions-add-dashboard"), label: "إضافة أسئلة الامتحانات", icon: CirclePlus },
    { to: gaFn("family-exams/questions-view-dashboard"), label: "عرض أسئلة الامتحانات", icon: ClipboardList },
    { to: gaFn("family-exams"), label: "إدارة الامتحانات", icon: ClipboardCheck },
    { to: gaFn("library"), label: "الكتب والمحاضرات", icon: BookOpen },
    { to: gaFn("questionnaires"), label: "الاستبيانات", icon: ListChecks },
  ];
}

/**
 * @param {(segment?: string) => string} spFn
 */
export function buildSpecialMenu(spFn) {
  const items = buildStudentMenu(spFn, { includeAdmins: false });
  const [, ...rest] = items;
  const base = spFn();
  /** First path segment under this interface; `attendance` = student-only (keep in `buildStudentMenu`). */
  const excluded = new Set(["levels", "students", "tracks", "attendance"]);
  const filtered = rest.filter((item) => {
    const prefix = base.endsWith("/") ? base : `${base}/`;
    if (item.to === base) return false;
    if (!item.to.startsWith(prefix)) return true;
    const seg = item.to.slice(prefix.length).split("/")[0];
    return !excluded.has(seg);
  });
  return [
    { to: spFn(), label: "لوحة الدورات المتخصصة", icon: LayoutDashboard, end: true },
    { to: spFn("learners"), label: "حسابات المتعلّمين", icon: Users },
    ...filtered,
  ];
}
