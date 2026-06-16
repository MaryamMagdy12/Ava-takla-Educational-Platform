import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Award, ScrollText, Users } from "lucide-react";
import PageShell from "../components/common/PageShell";
import Panel from "../components/common/Panel";
import PageToolbar, { ToolbarLink } from "../components/common/PageToolbar";
import { useAdminData } from "../context/AdminDataContext";
import useDebouncedValue from "../hooks/useDebouncedValue";
import * as adminApi from "../api/adminApi";
import { st } from "../navigation/adminPaths";
import "../assets/css/AttendancePages.css";
import { useToast } from "../components/common/ToastProvider";

const PAGE_KEY = "pg-attendance-take";

const ATT_DRAFT_PREFIX = "attendanceTake:draft:v1:";

function attendanceDraftKey(levelId, heldOn) {
  return `${ATT_DRAFT_PREFIX}${levelId}:${heldOn}`;
}

/** @returns {number[]|undefined} undefined if no draft key; empty array means explicit "all absent" draft */
function readAttendanceDraft(levelId, heldOn) {
  if (!levelId || !heldOn) return undefined;
  try {
    const raw = localStorage.getItem(attendanceDraftKey(levelId, heldOn));
    if (raw === null) return undefined;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return undefined;
    return parsed.map((n) => Number(n));
  } catch {
    return undefined;
  }
}

function writeAttendanceDraft(levelId, heldOn, presentIdsArray) {
  if (!levelId || !heldOn) return;
  try {
    localStorage.setItem(attendanceDraftKey(levelId, heldOn), JSON.stringify(presentIdsArray));
  } catch {
    /* ignore quota */
  }
}

function clearAttendanceDraft(levelId, heldOn) {
  if (!levelId || !heldOn) return;
  try {
    localStorage.removeItem(attendanceDraftKey(levelId, heldOn));
  } catch {
    /* ignore */
  }
}

function todayInputDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function AttendanceTakePage() {
  const { levels, refreshLevels } = useAdminData();
  const { showToast } = useToast();
  const [levelId, setLevelId] = useState(null);
  const [heldOn, setHeldOn] = useState(todayInputDate);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 200);
  const [board, setBoard] = useState(null);
  const [presentIds, setPresentIds] = useState(() => new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [error, setError] = useState("");
  const busy = saving || savingAll;

  useEffect(() => {
    refreshLevels().catch(() => {});
  }, [refreshLevels]);

  useEffect(() => {
    if (!levelId && levels.length) {
      setLevelId(levels[0].id);
    }
  }, [levels, levelId]);

  const loadBoard = useCallback(async () => {
    if (!levelId) return;
    setLoading(true);
    setError("");
    try {
      const data = await adminApi.fetchAttendanceBoard(levelId, { heldOn });
      setBoard(data);
      const allowed = new Set((data.students || []).map((s) => s.id));
      const next = new Set();
      for (const s of data.students || []) {
        if (s.is_present) next.add(s.id);
      }
      const draft = readAttendanceDraft(levelId, heldOn);
      let merged = next;
      if (draft !== undefined) {
        merged = new Set(draft.filter((id) => allowed.has(id)));
      }
      setPresentIds(merged);
    } catch (e) {
      setBoard(null);
      setError(e.message || "تعذر تحميل قائمة الحضور.");
    } finally {
      setLoading(false);
    }
  }, [levelId, heldOn]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  useEffect(() => {
    if (!levelId || !heldOn || loading || !board) return;
    if (Number(board.level?.id) !== Number(levelId)) return;
    if (String(board.held_on ?? "") !== String(heldOn)) return;
    writeAttendanceDraft(levelId, heldOn, Array.from(presentIds));
  }, [presentIds, levelId, heldOn, loading, board]);

  const filteredStudents = useMemo(() => {
    const rows = board?.students ?? [];
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((s) => {
      const idStr = String(s.id);
      const serial = String(s.serial_number ?? "");
      return (
        String(s.full_name || "")
          .toLowerCase()
          .includes(q) ||
        String(s.student_unique_id || "")
          .toLowerCase()
          .includes(q) ||
        idStr === q ||
        serial === q
      );
    });
  }, [board, debouncedSearch]);

  const toggle = (id) => {
    setPresentIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const selectAllVisible = () => {
    setPresentIds((prev) => {
      const n = new Set(prev);
      for (const s of filteredStudents) n.add(s.id);
      return n;
    });
  };

  const clearVisible = () => {
    setPresentIds((prev) => {
      const n = new Set(prev);
      for (const s of filteredStudents) n.delete(s.id);
      return n;
    });
  };

  const saveThisLevel = async () => {
    if (!levelId) return;
    setSaving(true);
    setError("");
    try {
      const present_student_ids = Array.from(presentIds);
      const { message } = await adminApi.saveAttendanceSessionApi({
        level_id: levelId,
        held_on: heldOn,
        present_student_ids,
      });
      clearAttendanceDraft(levelId, heldOn);
      showToast({ type: "success", message: message || "تم حفظ حضور هذه المرحلة." });
      await loadBoard();
    } catch (e) {
      setError(e.message || "تعذر حفظ الحضور.");
    } finally {
      setSaving(false);
    }
  };

  const saveAllLevels = async () => {
    if (!levels.length) return;
    setSavingAll(true);
    setError("");
    try {
      const levelsPayload = [];
      for (const lv of levels) {
        const draft = readAttendanceDraft(lv.id, heldOn);
        let present_student_ids;
        if (draft !== undefined) {
          present_student_ids = draft;
        } else {
          const data = await adminApi.fetchAttendanceBoard(lv.id, { heldOn });
          present_student_ids = (data.students || []).filter((s) => s.is_present).map((s) => s.id);
        }
        levelsPayload.push({ level_id: lv.id, present_student_ids });
      }
      const { message } = await adminApi.saveAttendanceSessionsBulkApi({
        held_on: heldOn,
        levels: levelsPayload,
      });
      for (const lv of levels) {
        clearAttendanceDraft(lv.id, heldOn);
      }
      showToast({
        type: "success",
        message: message || `تم حفظ حضور جميع المراحل (${levels.length}).`,
      });
      await loadBoard();
    } catch (e) {
      setError(e.message || "تعذر حفظ الحضور لجميع المراحل.");
    } finally {
      setSavingAll(false);
    }
  };

  return (
    <PageShell
      pageKey={PAGE_KEY}
      title="تسجيل الحضور"
      subtitle="اختر المرحلة والتاريخ، ثم سجّل حضور الطلاب. التحديدات تُحفظ في المتصفح حتى تضغط «حفظ هذه المرحلة» أو «حفظ جميع المراحل» لنفس التاريخ. نقطة واحدة لكل يوم حضور في تقارير النقاط."
    >
      <PageToolbar pageKey={PAGE_KEY}>
        <ToolbarLink pageKey={PAGE_KEY} to={st("attendance/take")} end variant="primary">
          تسجيل الحضور
        </ToolbarLink>
        <ToolbarLink pageKey={PAGE_KEY} to={st("attendance/reports")}>
          التقارير والنقاط
        </ToolbarLink>
      </PageToolbar>

      {levels.length === 0 ? (
        <Panel pageKey={PAGE_KEY}>
          <p className={`${PAGE_KEY}-empty`}>لا توجد مراحل بعد. أضف مرحلة من صفحة «المراحل».</p>
          <Link className="adm-btn adm-btn-secondary" to={st("levels/new")}>
            إضافة مرحلة
          </Link>
        </Panel>
      ) : (
        <>
          <div className={`${PAGE_KEY}-level-tabs`} role="tablist" aria-label="مراحل المدرسة">
            {levels.map((lv) => (
              <button
                key={lv.id}
                type="button"
                role="tab"
                aria-selected={levelId === lv.id}
                className={`${PAGE_KEY}-level-tab ${levelId === lv.id ? `${PAGE_KEY}-level-tab--active` : ""}`}
                onClick={() => setLevelId(lv.id)}
              >
                {lv.name}
              </button>
            ))}
          </div>

          <div className={`${PAGE_KEY}-toolbar`}>
            <div className={`${PAGE_KEY}-field`}>
              <label htmlFor="att-held">تاريخ الحصة</label>
              <input id="att-held" type="date" value={heldOn} onChange={(e) => setHeldOn(e.target.value)} />
            </div>
            <div className={`${PAGE_KEY}-field ${PAGE_KEY}-search`}>
              <label htmlFor="att-q">بحث بالاسم أو رقم الطالب</label>
              <input
                id="att-q"
                type="search"
                placeholder="اسم، كود الطالب، أو الرقم التسلسلي…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {error ? (
            <div className={`${PAGE_KEY}-error`} role="alert">
              {error}
            </div>
          ) : null}

          <Panel pageKey={PAGE_KEY}>
            {loading ? (
              <div className={`${PAGE_KEY}-empty`}>جاري تحميل الطلاب…</div>
            ) : (
              <>
                <div className={`${PAGE_KEY}-table-wrap`}>
                  <table className={`${PAGE_KEY}-table`}>
                    <thead>
                      <tr>
                        <th className={`${PAGE_KEY}-col-check`}>الحضور</th>
                        <th>م</th>
                        <th>رقم الطالب</th>
                        <th>الاسم</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={4} className={`${PAGE_KEY}-empty`}>
                            لا يوجد طلاب مطابقون للبحث في هذه المرحلة.
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((s) => (
                          <tr key={s.id}>
                            <td className={`${PAGE_KEY}-col-check`}>
                              <input
                                type="checkbox"
                                checked={presentIds.has(s.id)}
                                onChange={() => toggle(s.id)}
                                aria-label={`حضور ${s.full_name}`}
                              />
                            </td>
                            <td>
                              <span className={`${PAGE_KEY}-mono`}>{s.serial_number}</span>
                            </td>
                            <td>
                              <span className={`${PAGE_KEY}-mono`}>{s.student_unique_id}</span>
                            </td>
                            <td>{s.full_name}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className={`${PAGE_KEY}-actions`}>
                  <button type="button" className="adm-btn adm-btn-secondary" onClick={selectAllVisible}>
                    تحديد الظاهرين
                  </button>
                  <button type="button" className="adm-btn adm-btn-secondary" onClick={clearVisible}>
                    إلغاء الظاهرين
                  </button>
                  <button
                    type="button"
                    className="adm-btn adm-btn-primary"
                    disabled={busy || loading}
                    onClick={saveThisLevel}
                  >
                    {saving ? "جاري الحفظ…" : "حفظ هذه المرحلة"}
                  </button>
                  <button
                    type="button"
                    className="adm-btn adm-btn-secondary"
                    disabled={busy || loading}
                    onClick={saveAllLevels}
                  >
                    {savingAll ? "جاري حفظ الكل…" : "حفظ جميع المراحل"}
                  </button>
                  <span className={`${PAGE_KEY}-summary`}>
                    المسجّلون حاضرون: <strong>{presentIds.size}</strong> / {board?.students?.length ?? 0}
                  </span>
                </div>
              </>
            )}
          </Panel>
        </>
      )}

      <nav className={`${PAGE_KEY}-quicknav`} aria-label="روابط سريعة">
        <span className={`${PAGE_KEY}-quicknav-label`}>انتقال سريع</span>
        <div className={`${PAGE_KEY}-quicknav-links`}>
          <Link className={`${PAGE_KEY}-quicknav-link`} to={st("attendance/reports")}>
            <Award size={18} strokeWidth={2} aria-hidden />
            <span>التقارير والنقاط</span>
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
    </PageShell>
  );
}

export default AttendanceTakePage;
