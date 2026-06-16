/** Route bases for each admin interface (matches backend `admin_role` / interface keys). */
export const STUDENT_BASE = "/interface/student";
export const GA_BASE = "/interface/general-assembly";
export const SPECIAL_BASE = "/interface/special";

/** @param {string} [segment] path segment without leading slash, e.g. "tracks/new" */
export function st(segment = "") {
  if (!segment) return STUDENT_BASE;
  return `${STUDENT_BASE}/${segment.replace(/^\//, "")}`;
}

export function ga(segment = "") {
  if (!segment) return GA_BASE;
  return `${GA_BASE}/${segment.replace(/^\//, "")}`;
}

export function sp(segment = "") {
  if (!segment) return SPECIAL_BASE;
  return `${SPECIAL_BASE}/${segment.replace(/^\//, "")}`;
}

/** Default SPA home for a scoped admin (non-super). */
export function homePathForDefaultInterface(defaultInterface) {
  switch (defaultInterface) {
    case "general_assembly":
      return GA_BASE;
    case "special":
      return SPECIAL_BASE;
    default:
      return STUDENT_BASE;
  }
}
