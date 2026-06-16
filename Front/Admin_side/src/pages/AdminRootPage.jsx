import { Navigate } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";
import SuperHubPage from "./SuperHubPage";

export default function AdminRootPage() {
  const { isSuper, defaultHomePath } = useAdminAuth();

  if (!isSuper) {
    return <Navigate to={defaultHomePath()} replace />;
  }

  return <SuperHubPage />;
}
