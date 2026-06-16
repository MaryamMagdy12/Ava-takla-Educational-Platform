import { API_ORIGIN } from "../api/config";

/**
 * Turn API photo fields into a usable URL (absolute URL passthrough, or `/storage/...`).
 * Supports common Laravel / Jetstream style keys on the raw record.
 */
export function pickLearnerPhotoRaw(record) {
  if (!record || typeof record !== "object") return "";
  const pp = record.profile_picture;
  if (pp != null && String(pp).trim() !== "" && !/^https?:\/\//i.test(String(pp).trim())) {
    return String(pp).trim();
  }
  return (
    record.profile_picture_url ??
    record.profile_photo_url ??
    record.avatar_url ??
    record.photo_url ??
    record.profile_picture ??
    record.profile_photo_path ??
    record.photo_path ??
    record.image_url ??
    ""
  );
}

/**
 * Laravel often builds storage URLs with `APP_URL` (e.g. localhost) while the SPA
 * talks to `127.0.0.1` — `<img src>` would 404/fail. Re-host `/storage/` on API_ORIGIN.
 */
export function resolveLearnerPhotoUrl(raw) {
  if (raw == null || raw === "") return "";
  const s = String(raw).trim();
  if (!s) return "";
  const origin = String(API_ORIGIN || "").replace(/\/$/, "");

  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      if (u.pathname.startsWith("/storage/") && origin) {
        const api = new URL(origin.endsWith("/") ? origin : `${origin}/`);
        return `${api.protocol}//${api.host}${u.pathname}${u.search}`;
      }
      return s;
    } catch {
      return s;
    }
  }

  const withSlash = s.startsWith("/") ? s : `/${s}`;
  if (withSlash.startsWith("/storage/")) {
    return origin ? `${origin}${withSlash}` : withSlash;
  }
  const path = s.replace(/^\//, "");
  if (!path) return "";
  if (!origin) return `/storage/${path}`;
  return `${origin}/storage/${path}`;
}

export function resolveLearnerPhotoUrlFromRecord(record) {
  return resolveLearnerPhotoUrl(pickLearnerPhotoRaw(record));
}
