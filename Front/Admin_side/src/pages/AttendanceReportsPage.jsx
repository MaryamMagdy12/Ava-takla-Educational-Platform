import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardCheck, ScrollText, Users } from "lucide-react";
import PageShell from "../components/common/PageShell";
import Panel from "../components/common/Panel";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import { useAdminData } from "../context/AdminDataContext";
import * as adminApi from "../api/adminApi";
import { st } from "../navigation/adminPaths";
import "../assets/css/AttendancePages.css";

const PAGE_KEY = "pg-attendance-reports";

function startOfSchoolYear() {
  const d = new Date();
  const m = d.getMonth();
  const y = d.getFullYear();
  const startYear = m < 8 ? y - 1 : y;
  return `${startYear}-09-01`;
}

function todayInputDate() {
  const x = new Date();
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function AttendanceReportsPage() {
  const { levels, refreshLevels } = useAdminData();
  const [mainTab, setMainTab] = useState("match");
  const [levelFilter, setLevelFilter] = useState("");
  const [from, setFrom] = useState(startOfSchoolYear);
  const [to, setTo] = useState(todayInputDate);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState("attendees");
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pointsData, setPointsData] = useState(null);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [pointsError, setPointsError] = useState("");
  const [pointsLevelTab, setPointsLevelTab] = useState(0);

  useEffect(() => {
    refreshLevels().catch(() => {});
  }, [refreshLevels]);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    setSessionsError("");
    try {
      const params = { from, to };
      if (levelFilter) params.level_id = Number(levelFilter);
      const rows = await adminApi.fetchAttendanceSessionsApi(params);
      setSessions(Array.isArray(rows) ? rows : []);
      setSelectedSessionId(null);
      setDetail(null);
    } catch (e) {
      setSessions([]);
      setSessionsError(e.message || "تعذر تحميل الجلسات.");
    } finally {
      setSessionsLoading(false);
    }
  }, [from, to, levelFilter]);

  useEffect(() => {
    if (mainTab === "match") loadSessions();
  }, [mainTab, loadSessions]);

  useEffect(() => {
    if (!selectedSessionId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      try {
        const d = await adminApi.fetchAttendanceSessionDetailApi(selectedSessionId);
        if (!cancelled) setDetail(d);
      } catch {
        if (!cancelled) setDetail(null);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedSessionId]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setDetailsDrawerOpen(false);
      }
    };
    if (detailsDrawerOpen) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [detailsDrawerOpen]);

  useEffect(() => {
    if (!detailsDrawerOpen) return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [detailsDrawerOpen]);

  const loadPoints = useCallback(async () => {
    setPointsLoading(true);
    setPointsError("");
    try {
      const params = { from, to };
      if (levelFilter) params.level_id = Number(levelFilter);
      const d = await adminApi.fetchAttendancePointsApi(params);
      setPointsData(d);
      setPointsLevelTab(0);
    } catch (e) {
      setPointsData(null);
      setPointsError(e.message || "تعذر تحميل النقاط.");
    } finally {
      setPointsLoading(false);
    }
  }, [from, to, levelFilter]);

  useEffect(() => {
    if (mainTab === "points") loadPoints();
  }, [mainTab, loadPoints]);

  const byLevel = pointsData?.by_level ?? [];
  const activePointsLevel = byLevel[pointsLevelTab] ?? null;

  const levelOptions = useMemo(
    () => [{ id: "", name: "كل المراحل" }, ...levels.map((l) => ({ id: String(l.id), name: l.name }))],
    [levels],
  );

  return (
    <PageShell
      pageKey={PAGE_KEY}
      title="تقارير الحضور والنقاط"
      subtitle="مطابقة الحضور مع الغياب لكل جلسة، وجمع النقاط (نقطة لكل يوم حضور) حسب المرحلة."
    >
      <PageToolbar pageKey={PAGE_KEY}>
        <ToolbarLink pageKey={PAGE_KEY} to={st("attendance/take")}>
          تسجيل الحضور
        </ToolbarLink>
        <ToolbarLink pageKey={PAGE_KEY} to={st("attendance/reports")} end variant="primary">
          التقارير والنقاط
        </ToolbarLink>
      </PageToolbar>

      <div className={`${PAGE_KEY}-main-tabs`} role="tablist" aria-label="نوع التقرير">
        <button
          type="button"
          className={`${PAGE_KEY}-tab ${mainTab === "match" ? `${PAGE_KEY}-tab--active` : ""}`}
          onClick={() => setMainTab("match")}
        >
          مطابقة الحضور والغياب
        </button>
        <button
          type="button"
          className={`${PAGE_KEY}-tab ${mainTab === "points" ? `${PAGE_KEY}-tab--active` : ""}`}
          onClick={() => setMainTab("points")}
        >
          النقاط حسب المرحلة
        </button>
      </div>

      <div className={`${PAGE_KEY}-toolbar`}>
        <div className={`${PAGE_KEY}-field`}>
          <label htmlFor="ar-from">من تاريخ</label>
          <input id="ar-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className={`${PAGE_KEY}-field`}>
          <label htmlFor="ar-to">إلى تاريخ</label>
          <input id="ar-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className={`${PAGE_KEY}-field`}>
          <label htmlFor="ar-level">المرحلة</label>
          <select id="ar-level" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
            {levelOptions.map((o) => (
              <option key={o.id || "all"} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        {mainTab === "match" ? (
          <button type="button" className="adm-btn adm-btn-primary" onClick={loadSessions} disabled={sessionsLoading}>
            {sessionsLoading ? "…" : "تحديث القائمة"}
          </button>
        ) : (
          <button type="button" className="adm-btn adm-btn-primary" onClick={loadPoints} disabled={pointsLoading}>
            {pointsLoading ? "…" : "تحديث النقاط"}
          </button>
        )}
      </div>

      {mainTab === "match" ? (
        <Panel pageKey={PAGE_KEY}>
          {sessionsError ? <div className={`${PAGE_KEY}-error`}>{sessionsError}</div> : null}
          {sessionsLoading ? (
            <div className={`${PAGE_KEY}-empty`}>جاري تحميل الجلسات…</div>
          ) : sessions.length === 0 ? (
            <div className={`${PAGE_KEY}-empty`}>لا توجد جلسات حضور في هذا النطاق. سجّل الحضور من صفحة «تسجيل الحضور».</div>
          ) : (
            <div>
              <h3 className={`${PAGE_KEY}-panel-title`}>جلسات الحضور</h3>
              {sessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`${PAGE_KEY}-session-row ${selectedSessionId === s.id ? `${PAGE_KEY}-session-row--active` : ""}`}
                  onClick={() => {
                    setSelectedSessionId(s.id);
                    setDrawerTab("attendees");
                    setDetailsDrawerOpen(true);
                  }}
                >
                  <span className={`${PAGE_KEY}-session-title`}>{s.level?.name ?? "مرحلة"}</span>
                  <span className={`${PAGE_KEY}-session-date ${PAGE_KEY}-mono`} dir="ltr">
                    {s.held_on}
                  </span>
                  <span className={`${PAGE_KEY}-session-stats`}>
                    حاضر {s.present_count ?? "—"} · غائب {s.absent_count ?? "—"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Panel>
      ) : (
        <Panel pageKey={PAGE_KEY}>
          {pointsError ? <div className={`${PAGE_KEY}-error`}>{pointsError}</div> : null}
          {pointsLoading ? (
            <div className={`${PAGE_KEY}-empty`}>جاري حساب النقاط…</div>
          ) : !pointsData || byLevel.length === 0 ? (
            <div className={`${PAGE_KEY}-empty`}>لا توجد بيانات. تأكد من وجود مراحل وطلاب.</div>
          ) : (
            <>
              <p style={{ margin: "0 0 12px", color: "#5d5a52", fontWeight: 600 }}>
                الفترة:{" "}
                <span className={`${PAGE_KEY}-mono`} dir="ltr">
                  {pointsData.from}
                </span>{" "}
                —{" "}
                <span className={`${PAGE_KEY}-mono`} dir="ltr">
                  {pointsData.to}
                </span>
              </p>
              <div className={`${PAGE_KEY}-points-tabs`} role="tablist" aria-label="مراحل النقاط">
                {byLevel.map((bl, i) => (
                  <button
                    key={bl.level?.id ?? i}
                    type="button"
                    className={`${PAGE_KEY}-tab ${pointsLevelTab === i ? `${PAGE_KEY}-tab--active` : ""}`}
                    onClick={() => setPointsLevelTab(i)}
                  >
                    {bl.level?.name ?? "مرحلة"}
                  </button>
                ))}
              </div>
              {activePointsLevel ? (
                <div className={`${PAGE_KEY}-table-wrap`}>
                  <table className={`${PAGE_KEY}-table`}>
                    <thead>
                      <tr>
                        <th>م</th>
                        <th>رقم الطالب</th>
                        <th>الاسم</th>
                        <th>أيام الحضور</th>
                        <th>أيام الغياب</th>
                        <th>النقاط</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(activePointsLevel.students ?? []).map((r) => (
                        <tr key={r.student_id}>
                          <td>
                            <span className={`${PAGE_KEY}-mono`}>{r.serial_number}</span>
                          </td>
                          <td>
                            <span className={`${PAGE_KEY}-mono`}>{r.student_unique_id}</span>
                          </td>
                          <td>{r.full_name}</td>
                          <td>{r.attendance_count}</td>
                          <td>{r.absence_count}</td>
                          <td className={`${PAGE_KEY}-points-cell`}>
                            <span className={`${PAGE_KEY}-points-pill`}>{r.points}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </>
          )}
        </Panel>
      )}

      <nav className={`${PAGE_KEY}-quicknav`} aria-label="روابط سريعة">
        <span className={`${PAGE_KEY}-quicknav-label`}>انتقال سريع</span>
        <div className={`${PAGE_KEY}-quicknav-links`}>
          <Link className={`${PAGE_KEY}-quicknav-link`} to={st("attendance/take")}>
            <ClipboardCheck size={18} strokeWidth={2} aria-hidden />
            <span>تسجيل الحضور</span>
          </Link>
          <Link className={`${PAGE_KEY}-quicknav-link`} to={st("students")}>
            <Users size={18} strokeWidth={2} aria-hidden />
            <span>قائمة الطلاب</span>
          </Link>
          <Link className={`${PAGE_KEY}-quicknav-link`} to={st("levels")}>
            <ScrollText size={18} strokeWidth={2} aria-hidden />
            <span>المراحل</span>
          </Link>
        </div>
      </nav>

      {detailsDrawerOpen ? (
        <>
          <button type="button" className={`${PAGE_KEY}-drawer-backdrop`} aria-label="إغلاق" onClick={() => setDetailsDrawerOpen(false)} />
          <aside className={`${PAGE_KEY}-drawer ${PAGE_KEY}-drawer--open`} aria-label="تفاصيل الجلسة" role="dialog" aria-modal="true">
            <div className={`${PAGE_KEY}-drawer-header`}>
              <div>
                <h3 className={`${PAGE_KEY}-panel-title`} style={{ marginBottom: 2 }}>
                  تفاصيل الجلسة
                </h3>
                {detail ? (
                  <p className={`${PAGE_KEY}-drawer-meta`}>
                    {detail.level?.name} -{" "}
                    <span className={`${PAGE_KEY}-mono`} dir="ltr">
                      {detail.held_on}
                    </span>
                  </p>
                ) : null}
              </div>
              <button type="button" className="adm-btn" onClick={() => setDetailsDrawerOpen(false)} aria-label="إغلاق النافذة">
                إغلاق
              </button>
            </div>
            {!selectedSessionId ? (
              <p className={`${PAGE_KEY}-empty`}>اختر جلسة من القائمة.</p>
            ) : detailLoading ? (
              <p className={`${PAGE_KEY}-empty`}>جاري التحميل…</p>
            ) : !detail ? (
              <p className={`${PAGE_KEY}-empty`}>تعذر عرض الجلسة.</p>
            ) : (
              <>
                <div className={`${PAGE_KEY}-drawer-summary`}>
                  <span className={`${PAGE_KEY}-drawer-badge`}>الحاضرون: {detail.attendees?.length ?? 0}</span>
                  <span className={`${PAGE_KEY}-drawer-badge`}>الغائبون: {detail.absentees?.length ?? 0}</span>
                </div>
                <div className={`${PAGE_KEY}-drawer-tabs`} role="tablist" aria-label="قوائم الجلسة">
                  <button
                    type="button"
                    className={`${PAGE_KEY}-tab ${drawerTab === "attendees" ? `${PAGE_KEY}-tab--active` : ""}`}
                    onClick={() => setDrawerTab("attendees")}
                  >
                    الحاضرون ({detail.attendees?.length ?? 0})
                  </button>
                  <button
                    type="button"
                    className={`${PAGE_KEY}-tab ${drawerTab === "absentees" ? `${PAGE_KEY}-tab--active` : ""}`}
                    onClick={() => setDrawerTab("absentees")}
                  >
                    الغائبون ({detail.absentees?.length ?? 0})
                  </button>
                </div>
                <div className={`${PAGE_KEY}-table-wrap`}>
                  <table className={`${PAGE_KEY}-table`}>
                    <thead>
                      <tr>
                        <th>م</th>
                        <th>رقم الطالب</th>
                        <th>الاسم</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(drawerTab === "attendees" ? detail.attendees ?? [] : detail.absentees ?? []).map((r) => (
                        <tr key={`${drawerTab}-${r.student_id}`}>
                          <td>
                            <span className={`${PAGE_KEY}-mono`}>{r.serial_number}</span>
                          </td>
                          <td>
                            <span className={`${PAGE_KEY}-mono`}>{r.student_unique_id}</span>
                          </td>
                          <td>{r.full_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </aside>
        </>
      ) : null}
    </PageShell>
  );
}

export default AttendanceReportsPage;
