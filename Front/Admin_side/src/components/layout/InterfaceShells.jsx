import { useMemo } from "react";
import { AdminDataProvider } from "../../context/AdminDataContext";
import { AdminNavProvider } from "../../context/AdminNavContext";
import { useAdminAuth } from "../../context/AdminAuthContext";
import * as adminApi from "../../api/adminApi";
import { buildGaMenu, buildSpecialMenu, buildStudentMenu } from "../../constants/menu";
import { ga, sp, st } from "../../navigation/adminPaths";
import AdminLayout from "./AdminLayout";
import { DialogProvider } from "../common/DialogProvider";
import { ToastProvider } from "../common/ToastProvider";

export function StudentAdminInterface() {
  const { logout, isSuper } = useAdminAuth();
  const menuItems = useMemo(() => buildStudentMenu(st, { includeAdmins: isSuper }), [isSuper]);
  adminApi.setAdminLmsBase("/admin");
  return (
    <ToastProvider>
      <DialogProvider>
        <AdminNavProvider value={st}>
          <AdminDataProvider>
            <AdminLayout onLogout={logout} menuItems={menuItems} showHubLink={isSuper} interfaceKey="student" />
          </AdminDataProvider>
        </AdminNavProvider>
      </DialogProvider>
    </ToastProvider>
  );
}

export function GaAdminInterface() {
  const { logout, isSuper } = useAdminAuth();
  const menuItems = useMemo(() => buildGaMenu(ga), []);
  // Guard against accidental LMS calls leaking to student endpoints.
  adminApi.setAdminLmsBase("/admin/general-assembly");
  return (
    <ToastProvider>
      <DialogProvider>
        <AdminNavProvider value={ga}>
          <AdminDataProvider>
            <AdminLayout onLogout={logout} menuItems={menuItems} showHubLink={isSuper} interfaceKey="general_assembly" />
          </AdminDataProvider>
        </AdminNavProvider>
      </DialogProvider>
    </ToastProvider>
  );
}

export function SpecialAdminInterface() {
  const { logout, isSuper } = useAdminAuth();
  const menuItems = useMemo(() => buildSpecialMenu(sp), []);
  adminApi.setAdminLmsBase("/admin/special-lms");
  return (
    <ToastProvider>
      <DialogProvider>
        <AdminNavProvider value={sp}>
          <AdminDataProvider>
            <AdminLayout onLogout={logout} menuItems={menuItems} showHubLink={isSuper} interfaceKey="special" />
          </AdminDataProvider>
        </AdminNavProvider>
      </DialogProvider>
    </ToastProvider>
  );
}
