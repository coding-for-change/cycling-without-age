const BLOCKED_PREFIXES = ["/admin/"];

export const isBlockedOverHttp = (
  path: string | null | undefined,
  overHttp: boolean,
) =>
  overHttp &&
  typeof path === "string" &&
  BLOCKED_PREFIXES.some((prefix) => path.startsWith(prefix));
