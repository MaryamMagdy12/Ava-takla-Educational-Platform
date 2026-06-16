import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/common/PageShell";
import FormCard from "../components/common/FormCard";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import * as adminApi from "../api/adminApi";
import { ga } from "../navigation/adminPaths";
import { useToast } from "../components/common/ToastProvider";
import { useDialog } from "../components/common/DialogProvider";
import { copyToClipboard } from "../utils/copyToClipboard";
import "../assets/css/AddStudentPage.css";

const PAGE_KEY = "pg-student-new";

export default function AddGaFamilyPage() {
  const navigate = useNavigate();
  const [display_name, setDisplayName] = useState("");
  const [status, setStatus] = useState("active");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();
  const { alertMessage } = useDialog();

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setCreated(null);
    setCopied(false);
    setLoading(true);
    try {
      const res = await adminApi.createGaFamilyApi({ display_name: display_name.trim(), status });
      setCreated({
        name: res.data?.display_name ?? display_name.trim(),
        familyLoginId: res.family_login_id ?? res.data?.family_login_id ?? "",
        temporaryPassword: res.temporary_password ?? "",
        permanentPassword: res.permanent_password ?? "",
      });
      showToast({ type: "success", message: "تم إنشاء حساب العائلة." });
      setDisplayName("");
    } catch (e) {
      setErr(e.message || "فشل الإنشاء");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell
      pageKey={PAGE_KEY}
      title="عائلة جديدة"
      subtitle="تُنشأ كلمة مرور مؤقتة ودائمة رسمية (Ga# + أحرف الاسم + رقم الدخول) — انسخها فورًا."
    >
      <PageToolbar pageKey={PAGE_KEY}>
        <ToolbarLink pageKey={PAGE_KEY} to={ga("families")}>
          العودة للقائمة
        </ToolbarLink>
      </PageToolbar>
      {err ? <p className="adm-error">{err}</p> : null}

      {created ? (
        <section className={`${PAGE_KEY}-success-card`}>
          <div className={`${PAGE_KEY}-success-head`}>
            <h3 className={`${PAGE_KEY}-success-title`}>تم إنشاء العائلة</h3>
            <p className={`${PAGE_KEY}-success-subtitle`}>احفظ بيانات الدخول؛ قد لا تُعرض مرة أخرى.</p>
          </div>
          <div className={`${PAGE_KEY}-success-grid`}>
            <div className={`${PAGE_KEY}-success-item`}>
              <span className={`${PAGE_KEY}-success-label`}>اسم العرض</span>
              <strong className={`${PAGE_KEY}-success-value`}>{created.name || "—"}</strong>
            </div>
            <div className={`${PAGE_KEY}-success-item`}>
              <span className={`${PAGE_KEY}-success-label`}>رقم الدخول</span>
              <strong className={`${PAGE_KEY}-success-value`}>{created.familyLoginId || "—"}</strong>
            </div>
            <div className={`${PAGE_KEY}-success-item ${PAGE_KEY}-success-item--wide`}>
              <span className={`${PAGE_KEY}-success-label`}>كلمة المرور المؤقتة</span>
              <strong className={`${PAGE_KEY}-success-value`} dir="ltr">
                {created.temporaryPassword || "—"}
              </strong>
            </div>
            <div className={`${PAGE_KEY}-success-item ${PAGE_KEY}-success-item--wide`}>
              <span className={`${PAGE_KEY}-success-label`}>كلمة المرور الدائمة (بعد أول تسجيل)</span>
              <strong className={`${PAGE_KEY}-success-value`} dir="ltr">
                {created.permanentPassword || "—"}
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
                    `اسم العائلة: ${created.name || "—"}`,
                    `رقم الدخول: ${created.familyLoginId || "—"}`,
                    `كلمة المرور المؤقتة: ${created.temporaryPassword || "—"}`,
                    `كلمة المرور الدائمة: ${created.permanentPassword || "—"}`,
                  ].join("\n");
                  await copyToClipboard(payload);
                  setCopied(true);
                  showToast({ type: "success", message: "تم نسخ بيانات العائلة." });
                  setTimeout(() => navigate(ga("families")), 1800);
                } catch (e) {
                  await alertMessage({ title: "تعذر النسخ", message: e.message });
                }
              }}
              disabled={copied}
            >
              {copied ? "تم النسخ" : "نسخ البيانات"}
            </button>
            <button
              type="button"
              className={`${PAGE_KEY}-success-btn ${PAGE_KEY}-success-btn--ghost`}
              onClick={() => navigate(ga("families"))}
            >
              الذهاب إلى القائمة
            </button>
          </div>
        </section>
      ) : null}

      <FormCard pageKey={PAGE_KEY} title="بيانات العائلة" onSubmit={onSubmit} submitText={loading ? "جاري الحفظ…" : "إنشاء الحساب"}>
        <label className={`${PAGE_KEY}-form-label`}>
          اسم العرض
          <input
            className={`${PAGE_KEY}-form-control`}
            required
            value={display_name}
            onChange={(e) => setDisplayName(e.target.value)}
          />
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
