import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as adminApi from "../api/adminApi";
import {
  adminClearAuthStorage,
  adminReadSession,
  adminReadToken,
  adminWriteSession,
  adminWriteToken,
} from "../api/config";
import { homePathForDefaultInterface } from "../navigation/adminPaths";

function readStoredToken() {
  return adminReadToken();
}

/**
 * Never treat `admin_session` from storage as authenticated by itself: a stale name/role
 * with an expired token skipped `/auth/me` because `session` was already truthy. When a token
 * exists, session starts null until `fetchAuthMe` succeeds. When there is no token, clear
 * orphan cached session from browser storage.
 */
function readInitialAuth() {
  const t = readStoredToken();
  if (!t) {
    adminClearAuthStorage();
    return { token: null, session: null };
  }
  // Migrate any legacy localStorage row to sessionStorage, but do not trust it for auth.
  adminReadSession();
  return { token: t, session: null };
}

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const initial = readInitialAuth();
  const [token, setToken] = useState(initial.token);
  const [session, setSession] = useState(initial.session);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const clearAuth = useCallback(() => {
    adminClearAuthStorage();
    setToken(null);
    setSession(null);
  }, []);

  const logout = useCallback(async () => {
    try {
      await adminApi.adminLogout();
    } catch {
      /* ignore */
    }
    clearAuth();
  }, [clearAuth]);

  useEffect(() => {
    if (!token || session) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const me = await adminApi.fetchAuthMe();
        if (cancelled) return;
        const next = {
          role: me?.role ?? me?.user?.admin_role ?? "student",
          allowed_interfaces: me?.allowed_interfaces ?? [],
          default_interface: me?.default_interface ?? "student",
          user: me?.user ?? null,
        };
        adminWriteSession(next);
        setSession(next);
      } catch {
        if (!cancelled) clearAuth();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, session, clearAuth]);

  /** Tab refocus: catch server-revoked tokens without waiting for another admin API call. */
  useEffect(() => {
    if (!token || !session) return undefined;
    let timer;
    function onVisibility() {
      if (document.visibilityState !== "visible") return;
      clearTimeout(timer);
      timer = setTimeout(async () => {
        if (!readStoredToken()) return;
        try {
          const me = await adminApi.fetchAuthMe();
          const next = {
            role: me?.role ?? me?.user?.admin_role ?? "student",
            allowed_interfaces: me?.allowed_interfaces ?? [],
            default_interface: me?.default_interface ?? "student",
            user: me?.user ?? null,
          };
          adminWriteSession(next);
          setSession(next);
        } catch (e) {
          if (e?.status === 401) {
            clearAuth();
          }
        }
      }, 400);
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clearTimeout(timer);
    };
  }, [token, session, clearAuth]);

  const login = useCallback(async (loginValue, password) => {
    setLoginError("");
    setLoginLoading(true);
    try {
      const data = await adminApi.adminLogin(loginValue, password);
      adminWriteToken(data.token);
      const sess = {
        role: data.role ?? data.user?.admin_role ?? "student",
        allowed_interfaces: data.allowed_interfaces ?? [],
        default_interface: data.default_interface ?? "student",
        user: data.user ?? null,
      };
      adminWriteSession(sess);
      setToken(data.token);
      setSession(sess);
    } catch (e) {
      setLoginError(e.message || "فشل تسجيل الدخول");
    } finally {
      setLoginLoading(false);
    }
  }, []);

  const isSuper = session?.role === "super";
  const canAccessInterface = useCallback(
    (key) => isSuper || (session?.allowed_interfaces ?? []).includes(key),
    [isSuper, session?.allowed_interfaces],
  );

  const defaultHomePath = useCallback(() => {
    return homePathForDefaultInterface(session?.default_interface ?? "student");
  }, [session?.default_interface]);

  const value = useMemo(
    () => ({
      token,
      session,
      isAuthenticated: Boolean(token && session),
      isRestoringSession: Boolean(token && !session),
      isSuper,
      canAccessInterface,
      defaultHomePath,
      login,
      logout,
      loginLoading,
      loginError,
      setLoginError,
    }),
    [
      token,
      session,
      isSuper,
      canAccessInterface,
      defaultHomePath,
      login,
      logout,
      loginLoading,
      loginError,
    ],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
