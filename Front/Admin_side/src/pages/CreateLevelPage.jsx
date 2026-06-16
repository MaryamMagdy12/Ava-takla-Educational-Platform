import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageShell from "../components/common/PageShell";
import FormCard from "../components/common/FormCard";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import { useAdminData } from "../context/AdminDataContext";
import * as adminApi from "../api/adminApi";
import { useAdminNav } from "../context/AdminNavContext";
import { validateCodePrefix, validatePermanentPasswordPrefix } from "../api/adminValidation";
import "../assets/css/CreateLevelPage.css";

const PAGE_KEY = "pg-level-new";

function CreateLevelPage() {
  const navigate = useNavigate();
  const nav = useAdminNav();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { tracks, levels, refreshLevels } = useAdminData();
  const [form, setForm] = useState({
    name: "",
    code_prefix: "",
    permanent_password_prefix: "",
    track_id: tracks[0]?.id ?? "",
    status: "active",
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isEdit) {
      const row = levels.find((l) => String(l.id) === String(id));
      if (row) {
        setForm({
          name: row.name,
          code_prefix: row.codePrefix,
          permanent_password_prefix: row.permanentPasswordPrefix ?? "",
          track_id: row.trackId ?? tracks[0]?.id ?? "",
          status: row.status === "inactive" ? "inactive" : "active",
        });
      }
      return;
    }
    if (tracks.length) {
      setForm((p) => (p.track_id ? p : { ...p, track_id: tracks[0].id }));
    }
  }, [tracks, levels, id, isEdit]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setErr("");
    const name = form.name.trim();
    if (!name) return setErr("اسم المرحلة مطلوب.");
    if (name.length > 255) return setErr("يجب ألا يزيد الاسم عن 255 حرفًا.");
    const cp = validateCodePrefix(form.code_prefix);
    if (cp) return setErr(cp);
    const pp = validatePermanentPasswordPrefix(form.permanent_password_prefix, { required: true });
    if (pp) return setErr(pp);
    const tid = Number(form.track_id);
    if (!tid) return setErr("اختر مسار المنهج.");

    setBusy(true);
    try {
      const body = {
        track_id: tid,
        name,
        code_prefix: String(form.code_prefix).trim(),
        permanent_password_prefix: String(form.permanent_password_prefix).trim(),
        status: form.status,
      };
      if (isEdit) {
        await adminApi.updateLevelApi(id, body);
      } else {
        await adminApi.createLevelApi(body);
      }
      await refreshLevels();
      navigate(nav("levels"));
    } catch (e) {
      setErr(e.message || "تعذر حفظ المرحلة.");
    } finally {
      setBusy(false);
    }
  };

  const shellTitle = isEdit ? "تعديل المرحلة" : "إضافة مرحلة";
  const cardTitle = isEdit ? "تعديل المرحلة" : "مرحلة جديدة";
  const submitText = busy ? "جارٍ الحفظ..." : isEdit ? "حفظ التعديلات" : "حفظ المرحلة";

  return (
    <PageShell
      pageKey={PAGE_KEY}
      title={shellTitle}
      subtitle="المسار، الاسم، مقدمة الكود، بادئة كلمة المرور الدائمة للطلاب، والحالة — كما تتوقعها واجهة الـ API."
    >
      <PageToolbar pageKey={PAGE_KEY}>
        <ToolbarLink pageKey={PAGE_KEY} to={nav("levels")}>
          الرجوع إلى المراحل
        </ToolbarLink>
      </PageToolbar>

      {err ? <p className="adm-error">{err}</p> : null}

      <FormCard pageKey={PAGE_KEY} title={cardTitle} onSubmit={onSubmit} submitText={submitText}>
        <label className={`${PAGE_KEY}-form-label`}>
          اسم المرحلة
          <input
            className={`${PAGE_KEY}-form-control`}
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="مثال: ابتدائي أ"
            maxLength={255}
          />
        </label>
        <label className={`${PAGE_KEY}-form-label`}>
          مقدمة الكود من 4 أرقام
          <input
            className={`${PAGE_KEY}-form-control`}
            maxLength={4}
            value={form.code_prefix}
            onChange={(e) => setForm((p) => ({ ...p, code_prefix: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
            placeholder="1100"
          />
        </label>
        <label className={`${PAGE_KEY}-form-label`}>
          بادئة كلمة المرور الدائمة (للطلاب)
          <input
            className={`${PAGE_KEY}-form-control ${PAGE_KEY}-form-control--compact`}
            value={form.permanent_password_prefix}
            onChange={(e) => setForm((p) => ({ ...p, permanent_password_prefix: e.target.value }))}
           
            maxLength={32}
            dir="ltr"
            autoComplete="off"
          />
          <span className={`${PAGE_KEY}-form-hint`}>
            تُدمج مع أول 3 أحرف من الاسم + كود الطالب عند إنشاء الحساب (تُعرض مرة واحدة فقط).
          </span>
        </label>
        <label className={`${PAGE_KEY}-form-label`}>
          مسار المنهج
          <select
            className={`${PAGE_KEY}-form-control`}
            value={form.track_id}
            onChange={(e) => setForm((p) => ({ ...p, track_id: Number(e.target.value) }))}
          >
            {tracks.length === 0 ? <option value="">لا توجد مسارات، أضف مسارًا أولًا</option> : null}
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className={`${PAGE_KEY}-form-label`}>
          الحالة
          <select
            className={`${PAGE_KEY}-form-control`}
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
          >
            <option value="active">نشطة</option>
            <option value="inactive">غير نشطة</option>
          </select>
        </label>
      </FormCard>
    </PageShell>
  );
}

export default CreateLevelPage;
