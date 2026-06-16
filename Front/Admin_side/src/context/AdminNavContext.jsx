import { createContext, useContext } from "react";
import { st } from "../navigation/adminPaths";

const AdminNavContext = createContext(st);

export function AdminNavProvider({ value, children }) {
  return <AdminNavContext.Provider value={value}>{children}</AdminNavContext.Provider>;
}

/** Path builder for the active LMS shell (`st` = طلاب، `sp` = مسارات متخصصة). */
export function useAdminNav() {
  return useContext(AdminNavContext);
}
