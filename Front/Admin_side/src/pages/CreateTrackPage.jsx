import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageShell from "../components/common/PageShell";
import FormCard from "../components/common/FormCard";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import { useAdminData } from "../context/AdminDataContext";
import * as adminApi from "../api/adminApi";
import { useAdminNav } from "../context/AdminNavContext";
import "../assets/css/CreateLevelPage.css";

const PAGE_KEY = "pg-level-new";

function CreateTrackPage() {
  const navigate = useNavigate();
  const nav = useAdminNav();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { tracks, refreshTracks } = useAdminData();
  const [form, setForm] = useState({ name: "", description: "", status: "active" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    const row = tracks.find((t) => String(t.id) === String(id));
    if (row) {
      setForm({
        name: row.name,
        description: row.description ?? "",
        status: row.status === "inactive" ? "inactive" : "active",
      });
    }
  }, [id, isEdit, tracks]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setErr("");
    const name = form.name.trim();
    if (!name) return setErr("اسم المسار مطلوب.");
    if (name.length > 255) return setErr("يجب ألا يزيد الاسم عن 255 حرفًا.");
    setBusy(true);
    try {
      const body = {
        name,
        description: form.description.trim() || null,
        status: form.status,
      };
      if (isEdit) {
        await adminApi.updateTrackApi(id, body);
      } else {
        await adminApi.createTrackApi(body);
      }
      await refreshTracks();
      navigate(nav("tracks"));
    } catch (e) {
      setErr(e.message || "تعذر حفظ المسار.");
    } finally {
      setBusy(false);
    }
  };

  const title = isEdit ? "تعديل المسار" : "إضافة مسار جديد";
  const submitText = busy ? "جارٍ الحفظ..." : isEdit ? "حفظ التعديلات" : "إنشاء المسار";

  return (
    <PageShell pageKey={PAGE_KEY} title={title} subtitle="يجب أن يكون اسم المسار فريدًا، ولا يمكن حذفه إذا كان مستخدمًا.">
      <PageToolbar pageKey={PAGE_KEY}>
        <ToolbarLink pageKey={PAGE_KEY} to={nav("tracks")}>
          الرجوع إلى المسارات
        </ToolbarLink>
      </PageToolbar>

      {err ? <p className="adm-error">{err}</p> : null}

      <FormCard pageKey={PAGE_KEY} title={isEdit ? "تعديل المسار" : "مسار جديد"} onSubmit={onSubmit} submitText={submitText}>
        <label className={`${PAGE_KEY}-form-label`}>
          الاسم
          <input
            className={`${PAGE_KEY}-form-control`}
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            maxLength={255}
            required
          />
        </label>
        <label className={`${PAGE_KEY}-form-label`}>
          الوصف
          <textarea
            className={`${PAGE_KEY}-form-control`}
            rows={3}
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          />
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

export default CreateTrackPage;
