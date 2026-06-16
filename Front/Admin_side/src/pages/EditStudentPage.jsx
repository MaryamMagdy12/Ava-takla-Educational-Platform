import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageShell from "../components/common/PageShell";
import FormCard from "../components/common/FormCard";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import { useAdminData } from "../context/AdminDataContext";
import * as adminApi from "../api/adminApi";
import { useAdminNav } from "../context/AdminNavContext";
import { validateStudentEmail } from "../api/adminValidation";
import LearnerAvatar from "../components/common/LearnerAvatar";
import "../assets/css/AddStudentPage.css";

const PAGE_KEY = "pg-student-new";

function EditStudentPage() {
  const navigate = useNavigate();
  const nav = useAdminNav();
  const { id } = useParams();
  const { students, levels, tracks, refreshStudents } = useAdminData();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [levelId, setLevelId] = useState("");
  const [trackId, setTrackId] = useState("");
  const [status, setStatus] = useState("active");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const studentRow = useMemo(() => students.find((s) => String(s.id) === String(id)), [students, id]);

  useEffect(() => {
    if (!studentRow) return;
    setName(studentRow.name);
    setEmail(studentRow.email ?? "");
    setParentName(studentRow.parentName ?? "");
    setParentPhone(studentRow.parentPhone ?? "");
    setParentEmail(studentRow.parentEmail ?? "");
    setLevelId(studentRow.levelId ?? "");
    setTrackId(studentRow.trackId ?? "");
    setStatus(studentRow.status === "inactive" ? "inactive" : "active");
  }, [studentRow]);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim() || !levelId) return;
    const trimmed = name.trim();
    if (trimmed.length > 255) return setErr("يجب ألا يزيد الاسم عن 255 حرفًا.");
    const emailErr = validateStudentEmail(email);
    if (emailErr) return setErr(emailErr);
    if (!parentName.trim()) return setErr("اسم ولي الأمر مطلوب.");
    if (!parentPhone.trim()) return setErr("رقم تواصل ولي الأمر مطلوب.");
    if (!parentEmail.trim()) return setErr("بريد ولي الأمر مطلوب.");
    const parentEmailErr = validateStudentEmail(parentEmail);
    if (parentEmailErr) return setErr(`بريد ولي الأمر: ${parentEmailErr}`);
    setErr("");
    setBusy(true);
    try {
      const payload = {
        full_name: trimmed,
        level_id: Number(levelId),
        status,
        parent_name: parentName.trim(),
        parent_phone: parentPhone.trim(),
        parent_email: parentEmail.trim(),
      };
      const em = email.trim();
      payload.email = em || null;
      if (trackId) payload.track_id = Number(trackId);
      await adminApi.updateStudentApi(id, payload);
      await refreshStudents();
      navigate(nav("students"));
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell
      pageKey={PAGE_KEY}
      title="تعديل الطالب"
      subtitle="حدّث بيانات الطالب والمرحلة والمسار وبريد الطالب، وبيانات ولي الأمر (جميعها مطلوبة)."
    >
      <PageToolbar pageKey={PAGE_KEY}>
        <ToolbarLink pageKey={PAGE_KEY} to={nav("students")}>
          الرجوع إلى الطلاب
        </ToolbarLink>
      </PageToolbar>

      {err ? <p className="adm-error">{err}</p> : null}

      {studentRow ? (
        <div className={`${PAGE_KEY}-edit-learner-head`}>
          <LearnerAvatar className={`${PAGE_KEY}-edit-learner-avatar`} photoUrl={studentRow.photoUrl} name={name} />
          <p className={`${PAGE_KEY}-edit-learner-caption`}>صورة الطالب كما تظهر في النظام</p>
        </div>
      ) : null}

      <FormCard pageKey={PAGE_KEY} title="بيانات الطالب" onSubmit={onSubmit} submitText={busy ? "جارٍ الحفظ..." : "حفظ التعديلات"}>
        <label className={`${PAGE_KEY}-form-label`}>
          اسم الطالب
          <input
            className={`${PAGE_KEY}-form-control`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="الاسم الكامل"
          />
        </label>
        <label className={`${PAGE_KEY}-form-label`}>
          البريد الإلكتروني (اختياري)
          <input
            className={`${PAGE_KEY}-form-control`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@example.com"
          />
        </label>
        <p className={`${PAGE_KEY}-form-section-title`}>ولي الأمر (مطلوب)</p>
        <label className={`${PAGE_KEY}-form-label`}>
          اسم ولي الأمر
          <input
            className={`${PAGE_KEY}-form-control`}
            value={parentName}
            onChange={(e) => setParentName(e.target.value)}
            placeholder="الاسم الكامل لولي الأمر"
            required
            autoComplete="name"
          />
        </label>
        <label className={`${PAGE_KEY}-form-label`}>
          رقم التواصل
          <input
            className={`${PAGE_KEY}-form-control`}
            type="tel"
            dir="ltr"
            value={parentPhone}
            onChange={(e) => setParentPhone(e.target.value)}
            placeholder="مثال: 01xxxxxxxxx"
            required
            autoComplete="tel"
          />
        </label>
        <label className={`${PAGE_KEY}-form-label`}>
          بريد ولي الأمر
          <input
            className={`${PAGE_KEY}-form-control`}
            type="email"
            dir="ltr"
            value={parentEmail}
            onChange={(e) => setParentEmail(e.target.value)}
            placeholder="parent@example.com"
            required
            autoComplete="email"
          />
        </label>
        <label className={`${PAGE_KEY}-form-label`}>
          المرحلة
          <select
            className={`${PAGE_KEY}-form-control`}
            value={levelId}
            onChange={(e) => setLevelId(Number(e.target.value))}
          >
            {levels.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
        <label className={`${PAGE_KEY}-form-label`}>
          المسار (اختياري)
          <select
            className={`${PAGE_KEY}-form-control`}
            value={trackId}
            onChange={(e) => setTrackId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">— اتركه افتراضيًا —</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className={`${PAGE_KEY}-form-label`}>
          الحالة
          <select className={`${PAGE_KEY}-form-control`} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
          </select>
        </label>
      </FormCard>
    </PageShell>
  );
}

export default EditStudentPage;
