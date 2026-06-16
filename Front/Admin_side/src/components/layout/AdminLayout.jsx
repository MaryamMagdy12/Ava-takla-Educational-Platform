import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import "../../layout/admin/AdminLayout.css";

function AdminLayout({ onLogout, menuItems, showHubLink = false, interfaceKey = "student" }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div id="adm-layout-shell">
      <main id="adm-layout-main">
        <TopBar
          isSidebarOpen={isSidebarOpen}
          onMenuToggle={toggleSidebar}
          searchValue={globalSearch}
          onSearchChange={setGlobalSearch}
          interfaceKey={interfaceKey}
        />
        <Outlet context={{ globalSearch, setGlobalSearch }} />
      </main>
      <Sidebar
        onLogout={onLogout}
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        menuItems={menuItems}
        showHubLink={showHubLink}
        interfaceKey={interfaceKey}
      />
      {isSidebarOpen ? <button id="adm-layout-overlay" type="button" aria-label="إغلاق القائمة الجانبية" onClick={closeSidebar} /> : null}
    </div>
  );
}

export default AdminLayout;
