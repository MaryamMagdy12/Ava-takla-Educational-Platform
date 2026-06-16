import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageShell from "../components/common/PageShell";
import FormCard from "../components/common/FormCard";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import * as adminApi from "../api/adminApi";
import { useAdminNav } from "../context/AdminNavContext";
import { useDialog } from "../components/common/DialogProvider";
import { useToast } from "../components/common/ToastProvider";
import "../assets/css/CreateCoursePage.css";

const PAGE_KEY = "pg-course-form";

function AddAdminPage() {
  const navigate = useNavigate();
  const nav = useAdminNav();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { confirmWithPassword } = useDialog();
  const { showToast } = useToast();
  const [admins, setAdmins] = useState([]);
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    passwordConfirm: "",
    status: "active",
    admin_role: "student",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

  useEffect(() => {
    adminApi.fetchAdminsApi().then(setAdmins).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    const row = admins.find((admin) => String(admin.id) === String(id));
    if (!row) return;
    setForm((prev) => ({
      ...prev,
      name: row.name ?? "",
      username: row.username ?? "",
      email: row.email ?? "",
      status: row.status ?? "active",
      admin_role: row.admin_role ?? "student",
    }));
  }, [admins, id, isEdit]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setErr("");
    if (!form.name.trim() || !form.username.trim() || !form.password) {
      if (!isEdit || !form.password) {
        setErr(isEdit ? "الاسم واسم المستخدم مطلوبان." : "الاسم واسم المستخدم وكلمة المرور مطلوبة.");
      }
      if (!form.name.trim() || !form.username.trim()) return;
      if (!isEdit && !form.password) return;
    }
    if (!form.name.trim() || !form.username.trim()) {
      setErr("الاسم واسم المستخدم مطلوبان.");
      return;
    }
    if (!form.email.trim()) {
      setErr("البريد الإلكتروني مطلوب.");
      return;
    }
    if (!isValidEmail(form.email)) {
      setErr("يرجى إدخال بريد إلكتروني صحيح.");
      return;
    }
    if (form.password && form.password.length < 8) {
      setErr("يجب أن تكون كلمة المرور 8 أحرف على الأقل.");
      return;
    }
    if (form.password && form.password !== form.passwordConfirm) {
      setErr("تأكيد كلمة المرور غير مطابق.");
      return;
    }

    const needsAdminPassword = !isEdit || Boolean(form.password);
    let adminPassword;
    if (needsAdminPassword) {
      const auth = await confirmWithPassword({
        title: isEdit ? "تغيير كلمة مرور المشرف" : "إنشاء مشرف جديد",
        message: isEdit
          ? "أدخل كلمة مرور المشرف الحالي لتأكيد تغيير كلمة مرور هذا الحساب."
          : "أدخل كلمة مرور المشرف الحالي لتأكيد إنشاء حساب مشرف جديد.",
      });
      if (!auth?.password) return;
      adminPassword = auth.password;
    }

    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        status: form.status,
      };
      if (form.password) payload.password = form.password;
      if (adminPassword) payload.admin_password = adminPassword;
      if (!isEdit) {
        payload.admin_role = form.admin_role;
      } else if (form.admin_role) {
        payload.admin_role = form.admin_role;
      }

      if (isEdit) {
        await adminApi.updateAdminApi(id, payload);
      } else {
        await adminApi.createAdminApi(payload);
      }
      showToast({ type: "success", message: isEdit ? "تم تحديث المشرف بنجاح." : "تم إنشاء المشرف بنجاح." });
      navigate(nav("admins"));
    } catch (e) {
      setErr(e.message || (isEdit ? "تعذر تحديث المشرف." : "تعذر إنشاء المشرف."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell
      pageKey={PAGE_KEY}
      title={isEdit ? "تعديل مشرف" : "إضافة مشرف"}
      subtitle="أنشئ أو عدّل حسابات المشرفين. المشرف الرئيسي يتم الحفاظ عليه من خلال إعدادات النظام."
    >
      <PageToolbar pageKey={PAGE_KEY}>
        <ToolbarLink pageKey={PAGE_KEY} to={nav("admins")}>
          الرجوع إلى المشرفين
        </ToolbarLink>
      </PageToolbar>

      {err ? <p className="adm-error">{err}</p> : null}

      <FormCard
        pageKey={PAGE_KEY}
        title={isEdit ? "بيانات المشرف" : "مشرف جديد"}
        onSubmit={onSubmit}
        submitText={busy ? "جارٍ الحفظ..." : isEdit ? "حفظ التعديلات" : "إنشاء المشرف"}
      >
        <label className={`${PAGE_KEY}-form-label`}>
          الاسم
          <input
            className={`${PAGE_KEY}-form-control`}
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
        </label>
        <label className={`${PAGE_KEY}-form-label`}>
          اسم المستخدم
          <input
            className={`${PAGE_KEY}-form-control`}
            value={form.username}
            onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
          />
        </label>
        <label className={`${PAGE_KEY}-form-label`}>
          البريد الإلكتروني
          <input
            className={`${PAGE_KEY}-form-control`}
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          />
        </label>
        <label className={`${PAGE_KEY}-form-label`}>
          كلمة المرور
          <input
            className={`${PAGE_KEY}-form-control`}
            type="password"
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            placeholder={isEdit ? "اتركها فارغة للإبقاء على كلمة المرور الحالية" : ""}
          />
        </label>
        <label className={`${PAGE_KEY}-form-label`}>
          تأكيد كلمة المرور
          <input
            className={`${PAGE_KEY}-form-control`}
            type="password"
            value={form.passwordConfirm}
            onChange={(e) => setForm((p) => ({ ...p, passwordConfirm: e.target.value }))}
          />
        </label>
        <label className={`${PAGE_KEY}-form-label`}>
          نطاق المشرف (صلاحية الواجهات)
          <select
            className={`${PAGE_KEY}-form-control`}
            value={form.admin_role}
            onChange={(e) => setForm((p) => ({ ...p, admin_role: e.target.value }))}
          >
            <option value="super">مشرف عام (كل الواجهات)</option>
            <option value="student">مدرسة الشمامسة فقط</option>
            <option value="general_assembly">الاجتماع العام فقط</option>
            <option value="special">الدورات الخاصة فقط</option>
          </select>
        </label>
        <label className={`${PAGE_KEY}-form-label`}>
          الحالة
          <select
            className={`${PAGE_KEY}-form-control`}
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
          >
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
          </select>
        </label>
      </FormCard>
    </PageShell>
  );
}

export default AddAdminPage;

