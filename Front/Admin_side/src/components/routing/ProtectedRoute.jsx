import { Navigate, Outlet } from "react-router-dom";
import SessionRestoringFallback from "../auth/SessionRestoringFallback";
import { useAdminAuth } from "../../context/AdminAuthContext";

function ProtectedRoute() {
  const { isAuthenticated, isRestoringSession } = useAdminAuth();
  if (isRestoringSession) {
    return <SessionRestoringFallback />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
