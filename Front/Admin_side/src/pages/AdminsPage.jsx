import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "../components/common/PageShell";
import Panel from "../components/common/Panel";
import DataTable from "../components/common/DataTable";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import * as adminApi from "../api/adminApi";
import { useAdminNav } from "../context/AdminNavContext";
import { useDialog } from "../components/common/DialogProvider";
import { useToast } from "../components/common/ToastProvider";
import { adminRoleLabel } from "../utils/adminRoleLabels";
import "../assets/css/AdminsPage.css";

const PAGE_KEY = "pg-admins";

function AdminsPage() {
  const nav = useAdminNav();
  const [admins, setAdmins] = useState([]);
  const [search, setSearch] = useState("");
  const [err, setErr] = useState("");
  const { confirmWithPassword, alertMessage } = useDialog();
  const { showToast } = useToast();

  const loadAdmins = async () => {
    setErr("");
    try {
      const rows = await adminApi.fetchAdminsApi();
      setAdmins(rows);
    } catch (e) {
      setErr(e.message || "تعذر تحميل المشرفين.");
    }
  };

  useEffect(() => {
    loadAdmins().catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return admins.filter(
      (admin) =>
        !q ||
        admin.name.toLowerCase().includes(q) ||
        admin.username.toLowerCase().includes(q) ||
        String(admin.email || "").toLowerCase().includes(q),
    );
  }, [admins, search]);

  const columns = [
    { key: "name", title: "الاسم" },
    { key: "username", title: "اسم المستخدم" },
    { key: "email", title: "البريد الإلكتروني", render: (row) => row.email || "—" },
    { key: "status", title: "الحالة", render: (row) => (row.status === "inactive" ? "غير نشط" : "نشط") },
    { key: "dashboard", title: "نوع المشرف / الواجهة", render: (row) => adminRoleLabel(row.admin_role, { isSystem: row.is_system }) },
    {
      key: "actions",
      title: "الإجراءات",
      render: (row) => (
        <>
          <Link className={`${PAGE_KEY}-datatable-btn`} to={nav(`admins/${row.id}/edit`)} style={{ marginInlineEnd: 8 }}>
            تعديل
          </Link>
          <button
            type="button"
            className={`${PAGE_KEY}-datatable-btn adm-delete`}
            disabled={row.is_system}
            onClick={async () => {
              const auth = await confirmWithPassword({
                title: "حذف المشرف",
                message: `هل تريد حذف المشرف "${row.name}"؟`,
              });
              if (!auth?.password) return;
              try {
                await adminApi.deleteAdminApi(row.id, auth.password);
                await loadAdmins();
                showToast({ type: "success", message: "تم حذف المشرف." });
              } catch (e) {
                await alertMessage({ title: "تعذر الحذف", message: e.message });
              }
            }}
          >
            حذف
          </button>
        </>
      ),
    },
  ];

  return (
    <PageShell pageKey={PAGE_KEY} title="إدارة المشرفين" subtitle="أنشئ المشرفين وعدّل بياناتهم. المشرف الرئيسي محمي من الحذف.">
      <PageToolbar pageKey={PAGE_KEY}>
        <input
          className={`${PAGE_KEY}-toolbar-search`}
          placeholder="ابحث عن مشرف..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <ToolbarLink pageKey={PAGE_KEY} to={nav("admins/new")} variant="primary">
          + إضافة مشرف
        </ToolbarLink>
      </PageToolbar>

      {err ? <p className="adm-error">{err}</p> : null}

      <Panel pageKey={PAGE_KEY}>
        <DataTable pageKey={PAGE_KEY} columns={columns} rows={filtered} />
      </Panel>
    </PageShell>
  );
}

export default AdminsPage;

