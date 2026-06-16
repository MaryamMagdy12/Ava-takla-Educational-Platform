import { useMemo, useState } from "react";
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

function TracksPage() {
  const nav = useAdminNav();
  const { tracks, refreshTracks } = useAdminData();
  const { confirm, alertMessage } = useDialog();
  const { showToast } = useToast();
  const { globalSearch } = useOutletContext();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const debouncedGlobalSearch = useDebouncedValue(globalSearch);
  const highlightQueries = [debouncedSearch, debouncedGlobalSearch];

  const filtered = useMemo(() => {
    const localQuery = debouncedSearch.trim().toLowerCase();
    const sharedQuery = debouncedGlobalSearch.trim().toLowerCase();
    return tracks.filter((t) => {
      const matchesLocal =
        !localQuery || t.name.toLowerCase().includes(localQuery) || (t.description || "").toLowerCase().includes(localQuery);
      const matchesShared =
        !sharedQuery ||
        t.name.toLowerCase().includes(sharedQuery) ||
        (t.description || "").toLowerCase().includes(sharedQuery) ||
        String(t.status || "").toLowerCase().includes(sharedQuery);
      return matchesLocal && matchesShared;
    });
  }, [debouncedGlobalSearch, debouncedSearch, tracks]);

  const columns = [
    {
      key: "name",
      title: "المسار",
      render: (row) => (
        <HighlightedText text={row.name} queries={highlightQueries} highlightClassName={`${PAGE_KEY}-highlight`} />
      ),
    },
    {
      key: "description",
      title: "الوصف",
      render: (row) => (
        <HighlightedText text={row.description || "—"} queries={highlightQueries} highlightClassName={`${PAGE_KEY}-highlight`} />
      ),
    },
    {
      key: "status",
      title: "الحالة",
      render: (row) => (row.status === "inactive" ? "غير نشط" : "نشط"),
    },
    {
      key: "actions",
      title: "الإجراءات",
      render: (row) => (
        <>
          <Link className={`${PAGE_KEY}-datatable-btn adm-edit`} to={nav(`tracks/${row.id}/edit`)} style={{ marginInlineEnd: 8 }}>
            تعديل
          </Link>
          <button
            type="button"
            className={`${PAGE_KEY}-datatable-btn adm-delete`}
            onClick={async () => {
              const ok = await confirm({ title: "حذف المسار", message: `هل تريد حذف المسار "${row.name}"؟` });
              if (!ok) return;
              try {
                await adminApi.deleteTrackApi(row.id);
                await refreshTracks();
                showToast({ type: "success", message: "تم حذف المسار." });
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
    <PageShell pageKey={PAGE_KEY} title="مسارات المناهج" subtitle="أنشئ المسارات أو عدّلها أو احذفها إذا لم تكن مستخدمة.">
      <PageToolbar pageKey={PAGE_KEY}>
        <input
          className={`${PAGE_KEY}-toolbar-search`}
          placeholder="ابحث في المسارات..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <ToolbarLink pageKey={PAGE_KEY} to={nav("tracks/new")} variant="primary">
          + مسار جديد
        </ToolbarLink>
      </PageToolbar>

      <Panel pageKey={PAGE_KEY}>
        <DataTable pageKey={PAGE_KEY} columns={columns} rows={filtered} />
      </Panel>
    </PageShell>
  );
}

export default TracksPage;
