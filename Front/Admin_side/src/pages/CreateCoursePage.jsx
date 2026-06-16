import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageShell from "../components/common/PageShell";
import FormCard from "../components/common/FormCard";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import { useAdminData } from "../context/AdminDataContext";
import * as adminApi from "../api/adminApi";
import { useAdminNav } from "../context/AdminNavContext";
import { sp } from "../navigation/adminPaths";
import "../assets/css/CreateCoursePage.css";

const PAGE_KEY = "pg-course-form";

function CreateCoursePage() {
  const navigate = useNavigate();
  const nav = useAdminNav();
  const isSpecialLms = nav === sp;
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { courses, tracks, refreshCourses } = useAdminData();
  const [form, setForm] = useState({ name: "", description: "", track_id: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!isEdit) return;
    const row = courses.find((course) => String(course.id) === String(id));
    if (row) {
      setForm({
        name: row.name ?? "",
        description: row.description ?? "",
        track_id: row.track_id != null ? String(row.track_id) : "",
      });
    }
  }, [courses, id, isEdit]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setErr("");
    const name = form.name.trim();
    if (!name) return setErr("اسم المادة مطلوب.");
    if (name.length > 255) return setErr("اسم المادة يجب ألا يتجاوز 255 حرفًا.");

    let body = {
      name,
      description: form.description.trim() || null,
    };

    if (!isSpecialLms) {
      const tid = String(form.track_id ?? "").trim();
      if (!tid) return setErr("اختر المسار لهذه المادة.");
      const trackIdNum = Number(tid);
      if (!Number.isFinite(trackIdNum) || trackIdNum < 1) return setErr("مسار غير صالح.");
      body = { ...body, track_id: trackIdNum };
    }

    setBusy(true);
    try {
      if (isEdit) {
        await adminApi.updateCourseApi(id, body);
      } else {
        await adminApi.createCourseApi(body);
      }
      await refreshCourses();
      navigate(nav("courses"));
    } catch (e) {
      setErr(e.message || "تعذر حفظ المادة.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell
      pageKey={PAGE_KEY}
      title={isEdit ? "تعديل مادة" : "إضافة مادة"}
      subtitle={
        isSpecialLms
          ? "المادة كتالوج عام؛ المسارات تُستخدم لربط المحاضرات والامتحانات والأسئلة بالمسار وليس بالمادة."
          : "كل مادة تنتمي إلى مسار واحد؛ المحاضرات والكتب والامتحانات لهذه المادة تستخدم نفس المسار."
      }
    >
      <PageToolbar pageKey={PAGE_KEY}>
        <ToolbarLink pageKey={PAGE_KEY} to={nav("courses")}>
          ← العودة إلى المواد
        </ToolbarLink>
      </PageToolbar>

      {err ? <p className="adm-error">{err}</p> : null}

      {!isSpecialLms && tracks.length === 0 ? (
        <p className="adm-error">لا توجد مسارات بعد. أنشئ مسارًا من قائمة «المسارات» ثم عد لإضافة مادة.</p>
      ) : null}

      <FormCard
        pageKey={PAGE_KEY}
        title={isEdit ? "بيانات المادة" : "مادة جديدة"}
        onSubmit={onSubmit}
        submitText={busy ? "جارٍ الحفظ..." : isEdit ? "حفظ التعديلات" : "إنشاء المادة"}
      >
        {!isSpecialLms ? (
          <label className={`${PAGE_KEY}-form-label`}>
            المسار
            <select
              className={`${PAGE_KEY}-form-control`}
              value={form.track_id}
              onChange={(e) => setForm((p) => ({ ...p, track_id: e.target.value }))}
              required
              disabled={tracks.length === 0}
            >
              <option value="">— اختر المسار —</option>
              {tracks.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className={`${PAGE_KEY}-form-label`}>
          اسم المادة
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
            rows={4}
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="وصف مختصر للمادة"
          />
        </label>
      </FormCard>
    </PageShell>
  );
}

export default CreateCoursePage;
