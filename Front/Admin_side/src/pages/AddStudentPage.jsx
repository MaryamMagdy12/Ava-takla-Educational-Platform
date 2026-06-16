import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/common/PageShell";
import FormCard from "../components/common/FormCard";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import { useAdminData } from "../context/AdminDataContext";
import * as adminApi from "../api/adminApi";
import { useAdminNav } from "../context/AdminNavContext";
import { validateStudentEmail } from "../api/adminValidation";
import "../assets/css/AddStudentPage.css";
import { useToast } from "../components/common/ToastProvider";
import { useDialog } from "../components/common/DialogProvider";
import { copyToClipboard } from "../utils/copyToClipboard";

const PAGE_KEY = "pg-student-new";

function formatImportErrors(errors) {
  if (!Array.isArray(errors) || errors.length === 0) return "";
  const visibleErrors = errors.slice(0, 10).map((item) => `Row ${item.row}: ${item.message}`);
  const remaining = errors.length - visibleErrors.length;

  return [
    ...visibleErrors,
    remaining > 0 ? `... and ${remaining} more issue(s).` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function AddStudentPage() {
  const navigate = useNavigate();
  const nav = useAdminNav();
  const { levels, tracks, refreshStudents } = useAdminData();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [levelId, setLevelId] = useState(levels[0]?.id ?? "");
  const [trackId, setTrackId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [createdStudent, setCreatedStudent] = useState(null);
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();
  const { alertMessage } = useDialog();

  useEffect(() => {
    if (!levelId && levels.length > 0) setLevelId(levels[0].id);
  }, [levels, levelId]);

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
    setCreatedStudent(null);
    setCopied(false);
    setBusy(true);
    try {
      const payload = {
        full_name: trimmed,
        level_id: Number(levelId),
        email: email.trim() || undefined,
        parent_name: parentName.trim(),
        parent_phone: parentPhone.trim(),
        parent_email: parentEmail.trim(),
      };
      if (trackId) payload.track_id = Number(trackId);
      const json = await adminApi.createStudentApi(payload);
      setCreatedStudent({
        name: json.data?.full_name ?? trimmed,
        studentId: json.data?.student_unique_id ?? "",
        temporaryPassword: json.temporary_password ?? "",
        permanentPassword: json.permanent_password ?? "",
      });
      showToast({ type: "success", message: "تم إنشاء الطالب بنجاح." });
      await refreshStudents();
      setName("");
      setEmail("");
      setParentName("");
      setParentPhone("");
      setParentEmail("");
      setTrackId("");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell
      pageKey={PAGE_KEY}
      title="إضافة طالب"
      subtitle="يتم إنشاء الحساب عبر الـ API؛ تظهر كلمة المرور المؤقتة والدائمة مرة واحدة فقط — انسخهما واحفظهما."
    >
      <PageToolbar pageKey={PAGE_KEY}>
        <ToolbarLink pageKey={PAGE_KEY} to={nav("students")}>
          الرجوع إلى الطلاب
        </ToolbarLink>
      </PageToolbar>

      {err ? <p className="adm-error">{err}</p> : null}

      {createdStudent ? (
        <section className={`${PAGE_KEY}-success-card`}>
          <div className={`${PAGE_KEY}-success-head`}>
            <h3 className={`${PAGE_KEY}-success-title`}>تم إنشاء الطالب بنجاح</h3>
            <p className={`${PAGE_KEY}-success-subtitle`}>احفظ بيانات الدخول التالية لأنها قد تظهر مرة واحدة فقط.</p>
          </div>
          <div className={`${PAGE_KEY}-success-grid`}>
            <div className={`${PAGE_KEY}-success-item`}>
              <span className={`${PAGE_KEY}-success-label`}>اسم الطالب</span>
              <strong className={`${PAGE_KEY}-success-value`}>{createdStudent.name || "—"}</strong>
            </div>
            <div className={`${PAGE_KEY}-success-item`}>
              <span className={`${PAGE_KEY}-success-label`}>كود الطالب</span>
              <strong className={`${PAGE_KEY}-success-value`}>{createdStudent.studentId || "—"}</strong>
            </div>
            <div className={`${PAGE_KEY}-success-item ${PAGE_KEY}-success-item--wide`}>
              <span className={`${PAGE_KEY}-success-label`}>كلمة المرور المؤقتة</span>
              <strong className={`${PAGE_KEY}-success-value`} dir="ltr">
                {createdStudent.temporaryPassword || "—"}
              </strong>
            </div>
            <div className={`${PAGE_KEY}-success-item ${PAGE_KEY}-success-item--wide`}>
              <span className={`${PAGE_KEY}-success-label`}>كلمة المرور الدائمة (بعد التغيير)</span>
              <strong className={`${PAGE_KEY}-success-value`} dir="ltr">
                {createdStudent.permanentPassword || "—"}
              </strong>
            </div>
          </div>
          <div className={`${PAGE_KEY}-success-actions`}>
            <button
              type="button"
              className={`${PAGE_KEY}-success-btn`}
              onClick={async () => {
                try {
                  const payload = [
                    `اسم الطالب: ${createdStudent.name || "—"}`,
                    `كود الطالب: ${createdStudent.studentId || "—"}`,
                    `كلمة المرور المؤقتة: ${createdStudent.temporaryPassword || "—"}`,
                    `كلمة المرور الدائمة: ${createdStudent.permanentPassword || "—"}`,
                  ].join("\n");
                  await copyToClipboard(payload);
                  setCopied(true);
                  showToast({ type: "success", message: "تم نسخ بيانات الطالب." });
                  setTimeout(() => {
                    navigate(nav("students"));
                  }, 2000);
                } catch (e) {
                  await alertMessage({
                    title: "تعذر النسخ",
                    message: e.message || "لم نتمكن من نسخ البيانات إلى الحافظة.",
                  });
                }
              }}
              disabled={copied}
            >
              {copied ? "تم النسخ" : "نسخ البيانات"}
            </button>
            <button
              type="button"
              className={`${PAGE_KEY}-success-btn ${PAGE_KEY}-success-btn--ghost`}
              onClick={() => navigate(nav("students"))}
            >
              الذهاب إلى قائمة الطلاب
            </button>
          </div>
        </section>
      ) : null}

      <FormCard pageKey={PAGE_KEY} title="طالب جديد" onSubmit={onSubmit} submitText={busy ? "جارٍ الإنشاء..." : "إنشاء الطالب"}>
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
          البريد الإلكتروني (اختياري لاستعادة كلمة المرور)
          <input
            className={`${PAGE_KEY}-form-control`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@example.com"
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
          المسار (اختياري، وإلا يُستخدم مسار المرحلة)
          <select
            className={`${PAGE_KEY}-form-control`}
            value={trackId}
            onChange={(e) => setTrackId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">— الافتراضي —</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
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
      </FormCard>

      {/* Bulk import students */}
      <FormCard
        pageKey={PAGE_KEY}
        title="استيراد الطلاب من ملف"
        onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const file = formData.get("file");
          const levelImport = Number(formData.get("level_id"));
          const trackImport = formData.get("track_id");
          const statusImport = formData.get("status") || "active";
          if (!file || !(file instanceof File)) {
            showToast({ type: "error", message: "اختر ملف الطلاب لاستيراده." });
            return;
          }
          if (!levelImport) {
            showToast({ type: "error", message: "اختر المرحلة للطلاب المستوردين." });
            return;
          }
          try {
            const result = await adminApi.importStudentsWithDefaults({
              level_id: levelImport,
              track_id: trackImport ? Number(trackImport) : undefined,
              status: statusImport,
              file,
            });
            showToast({
              type: "success",
              message: `تم استيراد ${result.created} طالب. يوجد ${result.errors.length} صفًا به مشكلات.`,
            });
            if (result.errors?.length) {
              await alertMessage({
                title: "Import problems",
                message: formatImportErrors(result.errors),
                confirmText: "Close",
              });
            }
            if (result.accounts?.length) {
              // Export with UTF-8 BOM so Excel opens Arabic/UTF-8 text correctly.
              // Use DB-style column names where possible for clarity.
              const header = [
                "full_name",
                "student_unique_id",
                "email",
                "parent_name",
                "parent_phone",
                "parent_email",
                "level_id",
                "track_id",
                "temporary_password",
                "permanent_password",
              ];
              const rows = result.accounts.map((a) => [
                a.full_name ?? "",
                a.student_unique_id ?? "",
                a.email ?? "",
                a.parent_name ?? "",
                a.parent_phone ?? "",
                a.parent_email ?? "",
                a.level_id ?? "",
                a.track_id ?? "",
                a.temporary_password ?? "",
                a.permanent_password ?? "",
              ]);
              const csv = [header, ...rows]
                .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
                .join("\r\n");
              const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "student-accounts.csv";
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }
            await refreshStudents();
          } catch (e2) {
            showToast({ type: "error", message: e2.message || "فشل الاستيراد." });
          }
        }}
        submitText="استيراد الطلاب"
      >
        <label className={`${PAGE_KEY}-form-label`}>
          المرحلة لجميع الصفوف
          <select className={`${PAGE_KEY}-form-control`} name="level_id" defaultValue={levels[0]?.id ?? ""}>
            {levels.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
        <label className={`${PAGE_KEY}-form-label`}>
          المسار (اختياري)
          <select className={`${PAGE_KEY}-form-control`} name="track_id" defaultValue="">
            <option value="">— الافتراضي —</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className={`${PAGE_KEY}-form-label`}>
          الحالة
          <select className={`${PAGE_KEY}-form-control`} name="status" defaultValue="active">
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
          </select>
        </label>
        <label className={`${PAGE_KEY}-form-label`}>
          ملف الطلاب (csv / xlsx)
          <input className={`${PAGE_KEY}-form-control`} type="file" name="file" accept=".csv,.xlsx,.txt" />
        </label>
        <aside className={`${PAGE_KEY}-import-hint`} dir="rtl">
          <strong>صيغة الملف (الصف الأول عناوين أعمدة)</strong>
          <p className={`${PAGE_KEY}-import-hint-p`}>
            يجب أن يحتوي كل صف على: <span dir="ltr">full_name</span> (أو <span dir="ltr">الاسم</span>)، و{" "}
            <span dir="ltr">parent_name</span>، و<span dir="ltr">parent_phone</span>، و<span dir="ltr">parent_email</span> (بقيم غير
            فارغة). يقبل العناوين العربية أو الإنجليزية الموضّحة أدناه.
          </p>
          <ul className={`${PAGE_KEY}-import-hint-list`}>
            <li>
              <span dir="ltr">email</span> — بريد الطالب (اختياري)
            </li>
            <li>
              <strong>مطلوب:</strong> <span dir="ltr">parent_name</span> — أو: <span dir="ltr">اسم_ولي_الأمر</span>،{" "}
              <span dir="ltr">ولي_الأمر</span>، <span dir="ltr">guardian_name</span>
            </li>
            <li>
              <strong>مطلوب:</strong> <span dir="ltr">parent_phone</span> — أو: <span dir="ltr">هاتف_ولي_الأمر</span>،{" "}
              <span dir="ltr">جوال_ولي_الأمر</span>، <span dir="ltr">guardian_phone</span>
            </li>
            <li>
              <strong>مطلوب:</strong> <span dir="ltr">parent_email</span> — أو: <span dir="ltr">بريد_ولي_الأمر</span>،{" "}
              <span dir="ltr">guardian_email</span>
            </li>
          </ul>
          <p className={`${PAGE_KEY}-import-hint-p`}>
            مثال صف عناوين:{" "}
            <code dir="ltr">full_name,parent_name,parent_phone,parent_email,email</code>
          </p>
        </aside>
      </FormCard>
    </PageShell>
  );
}

export default AddStudentPage;
