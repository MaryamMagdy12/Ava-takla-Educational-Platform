import { Bell, Menu, Search } from "lucide-react";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { adminRoleLabel } from "../../utils/adminRoleLabels";
import "../../layout/admin/TopBar.css";

function TopBar({ isSidebarOpen, onMenuToggle, searchValue, onSearchChange, interfaceKey = "student" }) {
  const { session, isSuper } = useAdminAuth();
  const user = session?.user;
  const userLabel = user?.name ?? user?.full_name ?? user?.email ?? user?.login ?? "المشرف";
  const roleLabel = isSuper ? adminRoleLabel("super") : adminRoleLabel(session?.role ?? interfaceKey);

  return (
    <header id="adm-topbar-root">
      <button
        type="button"
        className={`adm-topbar-menu ${isSidebarOpen ? "adm-topbar-menu--active" : ""}`}
        aria-label={isSidebarOpen ? "إغلاق القائمة" : "فتح القائمة"}
        aria-expanded={isSidebarOpen}
        aria-controls="adm-sidebar-root"
        onClick={onMenuToggle}
      >
        <Menu size={20} />
      </button>
      <div className="adm-topbar-search-wrap">
        <Search className="adm-topbar-search-icon" size={18} aria-hidden />
        <input
          className="adm-topbar-search"
          placeholder="بحث..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="adm-topbar-user-block">
        <div className="adm-topbar-user">{userLabel}</div>
        <div className="adm-topbar-role">{roleLabel}</div>
      </div>
      <button type="button" className="adm-topbar-bell" aria-label="الإشعارات">
        <Bell size={20} strokeWidth={1.75} aria-hidden />
      </button>
    </header>
  );
}

export default TopBar;
