import axios from "axios";
import { adminClearAuthStorage, adminReadToken, API_BASE } from "./config";
import { getApiErrorMessage } from "./apiError";

function emitErrorToast(message) {
  if (!message) return;
  window.dispatchEvent(
    new CustomEvent("app:toast", {
      detail: {
        type: "error",
        message,
      },
    }),
  );
}

function getAdminToken() {
  return adminReadToken();
}

/** JSON requests: 30s. Multipart (books, lectures, imports) can exceed 10+ minutes on slow links. */
const DEFAULT_TIMEOUT_MS = 30_000;
/** `0` = no XMLHttpRequest timeout (see MDN `XMLHttpRequest.timeout`). Large lecture/video uploads must not abort mid-stream. */
const MULTIPART_TIMEOUT_MS = 0;

export const adminClient = axios.create({
  baseURL: API_BASE,
  timeout: DEFAULT_TIMEOUT_MS,
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
  headers: {
    Accept: "application/json",
  },
});

adminClient.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
    /** Instance default is 30s; always extend for uploads (axios merge would keep 30s otherwise). */
    config.timeout = MULTIPART_TIMEOUT_MS;
  } else if (config.data && typeof config.data === "object" && !(config.data instanceof FormData)) {
    config.headers["Content-Type"] = "application/json";
  }
  if (config.skipAuth) return config;
  const token = getAdminToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url = String(err.config?.url ?? "");
    if (status === 401 && !url.includes("/auth/admin/login")) {
      adminClearAuthStorage();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.assign("/login");
      }
    }
    const msg = getApiErrorMessage(err, err.config);
    emitErrorToast(msg);
    const e = new Error(msg);
    e.status = status;
    e.payload = err.response?.data;
    return Promise.reject(e);
  },
);

/** Accept either a plain array or a Laravel `LengthAwarePaginator` response. */
export async function fetchAllPages(path, params = {}) {
  const items = [];
  let page = 1;
  let lastPage = 1;
  do {
    const { data: body } = await adminClient.get(path, { params: { ...params, page } });
    const payload = body?.data;
    if (Array.isArray(payload)) {
      return payload;
    }
    if (!payload?.data) break;
    items.push(...payload.data);
    lastPage = payload.last_page ?? 1;
    page += 1;
  } while (page <= lastPage);
  return items;
}
