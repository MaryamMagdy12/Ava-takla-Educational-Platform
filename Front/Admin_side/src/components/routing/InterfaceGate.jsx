import { Navigate, Outlet } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";

/**
 * @param {{ iface: "student" | "general_assembly" | "special" }} props
 */
export default function InterfaceGate({ iface }) {
  const { canAccessInterface, isAuthenticated } = useAdminAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccessInterface(iface)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
