/**
 * Only same-app paths are allowed as a return target, never another site.
 * Rejects "//host" and any backslash, because browsers treat "/\host" as
 * "//host" (the open-redirect trick in GHSA-wrjc-x8rr-h8h6).
 */
export function safeReturnPath(raw) {
  if (typeof raw !== "string" || !raw.startsWith("/")) return "/admin";
  if (raw.startsWith("//") || raw.includes("\\")) return "/admin";
  return raw;
}
