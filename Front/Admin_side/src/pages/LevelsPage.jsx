import { useMemo } from "react";
import { Link, useOutletContext } from "react-router-dom";
import HighlightedText from "../components/common/HighlightedText";
import PageShell from "../components/common/PageShell";
import Panel from "../components/common/Panel";
import DataTable from "../components/common/DataTable";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import { useAdminData } from "../context/AdminDataContext";
import useDebouncedValue from "../hooks/useDebouncedValue";
import * as adminApi from "../api/adminApi";
import { useAdminNav } from "../context/AdminNavContext";
import "../assets/css/LevelsPage.css";
import { useDialog } from "../components/common/DialogProvider";
import { useToast } from "../components/common/ToastProvider";

const PAGE_KEY = "pg-levels";

function LevelsPage() {
  const nav = useAdminNav();
  const { levels, refreshLevels } = useAdminData();
  const { confirm, alertMessage } = useDialog();
  const { showToast } = useToast();
  const { globalSearch } = useOutletContext();
  const debouncedGlobalSearch = useDebouncedValue(globalSearch);
  const highlightQueries = [debouncedGlobalSearch];

  const filteredLevels = useMemo(() => {
    const query = debouncedGlobalSearch.trim().toLowerCase();
    if (!query) return levels;
    return levels.filter(
      (level) =>
        level.name.toLowerCase().includes(query) ||
        String(level.codePrefix ?? "").toLowerCase().includes(query) ||
        String(level.permanentPasswordPrefix ?? "").toLowerCase().includes(query) ||
        String(level.track ?? "").toLowerCase().includes(query) ||
        String(level.status ?? "").toLowerCase().includes(query),
    );
  }, [debouncedGlobalSearch, levels]);

  const columns = [
    {
      key: "name",
      title: "المرحلة",
      render: (row) => (
        <HighlightedText text={row.name} queries={highlightQueries} highlightClassName={`${PAGE_KEY}-highlight`} />
      ),
    },
    {
      key: "codePrefix",
      title: "مقدمة الكود",
      render: (row) => (
        <HighlightedText text={row.codePrefix} queries={highlightQueries} highlightClassName={`${PAGE_KEY}-highlight`} />
      ),
    },
    {
      key: "permanentPasswordPrefix",
      title: "بادئة المرور الدائمة",
      render: (row) => (
        <span className={`${PAGE_KEY}-mono`} dir="ltr">
          <HighlightedText
            text={row.permanentPasswordPrefix || "—"}
            queries={highlightQueries}
            highlightClassName={`${PAGE_KEY}-highlight`}
          />
        </span>
      ),
    },
    {
      key: "track",
      title: "المسار",
      render: (row) => (
        <HighlightedText text={row.track} queries={highlightQueries} highlightClassName={`${PAGE_KEY}-highlight`} />
      ),
    },
    {
      key: "active",
      title: "الحالة",
      render: (row) => (row.active ? "نشطة" : "غير نشطة"),
    },
    {
      key: "actions",
      title: "الإجراءات",
      render: (row) => (
        <>
          <Link className={`${PAGE_KEY}-datatable-btn adm-edit`} to={nav(`levels/${row.id}/edit`)} style={{ marginInlineEnd: 8 }} variant="primary">
            تعديل
          </Link>
          <button
            type="button"
            className={`${PAGE_KEY}-datatable-btn adm-delete`}
            onClick={async () => {
              const ok = await confirm({
                title: "حذف المرحلة",
                message: `هل تريد حذف المرحلة "${row.name}"؟ يجب نقل الطلاب المرتبطين بها أولًا.`,
              });
              if (!ok) return;
              try {
                await adminApi.deleteLevelApi(row.id);
                await refreshLevels();
                showToast({ type: "success", message: "تم حذف المرحلة." });
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
    <PageShell
      pageKey={PAGE_KEY}
      title="إدارة المراحل والمناهج"
      subtitle="أنشئ المراحل واربطها بمقدمات الأكواد والمسارات."
    >
      <PageToolbar pageKey={PAGE_KEY}>
        <ToolbarLink pageKey={PAGE_KEY} to={nav("levels/new")} variant="primary">
          + إضافة مرحلة
        </ToolbarLink>
      </PageToolbar>

      <Panel pageKey={PAGE_KEY}>
        <DataTable pageKey={PAGE_KEY} columns={columns} rows={filteredLevels} />
      </Panel>
    </PageShell>
  );
}

export default LevelsPage;
