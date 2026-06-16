/** Laravel / axios error body → single message for UI. */

import { API_BASE } from "./config";

/** Axios timeout / abort — not the same as “server unreachable”. */
function isTimeoutLikeError(error) {
  if (!error || error.response) return false;
  if (error.code === "ETIMEDOUT") return true;
  const m = String(error.message || "").toLowerCase();
  if (m.includes("timeout")) return true;
  if (error.code === "ECONNABORTED" && (m.includes("exceeded") || m.includes("timeout"))) return true;
  return false;
}

/** Long PHP/upload hint only for real multipart uploads (not dashboard GETs). */
function shouldShowLargeUploadTimeoutHint(config) {
  if (!config) return false;
  const method = String(config.method || "get").toLowerCase();
  if (!["post", "put", "patch"].includes(method)) return false;
  return config.data instanceof FormData;
}

function isNetworkFailure(error) {
  if (!error || error.response) return false;
  if (isTimeoutLikeError(error)) return false;
  const code = error.code;
  if (code === "ERR_NETWORK" || code === "ECONNABORTED" || code === "ETIMEDOUT") return true;
  const msg = String(error.message || "").toLowerCase();
  return msg.includes("network error") || msg.includes("failed to fetch") || msg.includes("networkerror");
}

const UPLOAD_TIMEOUT_HINT =
  "The request timed out before the server finished. Large video or audio lectures can take a long time on a slow connection. " +
  "Try again on a faster network, compress the file, or check the server: PHP `max_execution_time`, `upload_max_filesize` / `post_max_size`, and Laravel logs.";

const GENERIC_TIMEOUT_MESSAGE =
  "Request timed out. Check your connection, that Laravel is running, and try again.";

/**
 * @param {unknown} error
 * @param {import('axios').InternalAxiosRequestConfig | undefined} [axiosConfig] — pass `err.config` from axios; used to avoid upload-only hints on GET/list timeouts.
 */
export function getApiErrorMessage(error, axiosConfig) {
  if (!error) return "The request could not be completed.";
  const cfg = axiosConfig ?? error?.config;
  if (isTimeoutLikeError(error)) {
    if (shouldShowLargeUploadTimeoutHint(cfg)) {
      return UPLOAD_TIMEOUT_HINT;
    }
    return GENERIC_TIMEOUT_MESSAGE;
  }
  if (isNetworkFailure(error)) {
    const base =
      "Cannot connect to the server. From the Backend folder run `php artisan serve --host=0.0.0.0 --port=8000` (use 0.0.0.0 so LAN URLs like http://192.168.x.x:8000 work). " +
      "Use `npm run dev` from Front/Admin_side. If Laravel uses another port, set `VITE_LARAVEL_PORT` in `Front/Admin_side/.env` and restart Vite.";
    if (!import.meta.env.DEV) {
      return base;
    }
    const path = error?.config?.url ?? "";
    const full = [error?.config?.baseURL, path].filter(Boolean).join("");
    return `${base} [dev: tried ${full || "(unknown)"}; code=${error?.code ?? "n/a"}; API_BASE=${API_BASE}]`;
  }
  if (error.response?.status === 413) {
    const data = error.response?.data ?? error.payload;
    if (typeof data?.message === "string" && data.message) return data.message;
    return (
      "Payload too large (413). Use Laravel on port 8000 with `php artisan serve --host=0.0.0.0` and ensure the app calls that URL directly (not through the Vite dev proxy). Check PHP upload_max_filesize / post_max_size."
    );
  }
  const data = error.response?.data ?? error.payload;
  if (typeof data?.message === "string" && data.message) return data.message;
  if (data?.errors && typeof data.errors === "object") {
    const first = Object.values(data.errors)[0];
    if (Array.isArray(first) && first[0]) return String(first[0]);
    if (typeof first === "string") return first;
  }
  if (error.message && !isNetworkFailure(error)) return error.message;
  return "The request could not be completed.";
}
