import { Link, useLocation } from "react-router-dom";
import { LayoutGrid, LogOut, X } from "lucide-react";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { adminInterfaceRoleTitle, adminRoleLabel } from "../../utils/adminRoleLabels";
import "../../layout/admin/Sidebar.css";

function isNavActive(pathname, item) {
  return pathname === item.to;
}

const INTERFACE_META = {
  student: { subtitle: "واجهة مدرسة الشمامسة" },
  general_assembly: { subtitle: "واجهة الاجتماع العام" },
  special: { subtitle: "واجهة الدورات المتخصصة" },
};

function Sidebar({ onLogout, isOpen, onClose, menuItems = [], showHubLink = false, interfaceKey = "student" }) {
  const location = useLocation();
  const { session, isSuper } = useAdminAuth();
  const user = session?.user;
  const iface = INTERFACE_META[interfaceKey] ?? INTERFACE_META.student;
  const displayName = user?.name ?? user?.full_name ?? user?.username ?? "المشرف";
  const avatarLetter = (displayName?.trim()?.charAt(0) || "م").toUpperCase();
  const roleLabel = isSuper
    ? adminRoleLabel("super")
    : adminInterfaceRoleTitle(interfaceKey);
  const roleDetail = user?.email ?? user?.username ?? "";

  return (
    <aside id="adm-sidebar-root" className={isOpen ? "adm-sidebar-root--open" : ""}>
      <div className="adm-sidebar-header">
        <div className="adm-sidebar-brand-block">
          <div className="adm-sidebar-brand-text">
            <div className="adm-sidebar-brand-title">إدارة المنصة</div>
            <div className="adm-sidebar-brand-sub">{iface.subtitle}</div>
          </div>
          <div className="adm-sidebar-logo" aria-hidden="true" />
        </div>
        <button type="button" className="adm-sidebar-close" aria-label="إغلاق القائمة" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <nav className="adm-sidebar-nav" aria-label="روابط لوحة التحكم">
        {showHubLink ? (
          <Link
            className={`adm-sidebar-link adm-sidebar-link--hub ${location.pathname === "/" ? "adm-sidebar-link--active" : ""}`}
            to="/"
            onClick={onClose}
          >
            <LayoutGrid size={16} />
            <span>مركز الواجهات</span>
          </Link>
        ) : null}
        {menuItems.map((item) => (
          <Link
            key={item.to}
            className={`adm-sidebar-link ${isNavActive(location.pathname, item) ? "adm-sidebar-link--active" : ""}`}
            to={item.to}
            onClick={onClose}
          >
            <item.icon size={16} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="adm-sidebar-footer">
        <div className="adm-sidebar-profile">
          <div className="adm-sidebar-profile-text">
            <div className="adm-sidebar-profile-name">{displayName}</div>
            <div className="adm-sidebar-profile-role">{roleLabel}</div>
            {roleDetail ? <div className="adm-sidebar-profile-meta">{roleDetail}</div> : null}
          </div>
          <div className="adm-sidebar-profile-avatar" aria-hidden="true">
            {avatarLetter}
          </div>
        </div>
        <button
          type="button"
          className="adm-sidebar-logout"
          onClick={() => {
            onClose();
            onLogout();
          }}
        >
          <LogOut size={16} />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
