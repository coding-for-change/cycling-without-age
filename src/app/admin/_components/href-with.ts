import type { AdminSearchParams } from "../active-scope";

export function hrefWith(
  pathname: string,
  query: AdminSearchParams | string,
  patch: Record<string, string | null>,
) {
  const params = new URLSearchParams(typeof query === "string" ? query : "");
  if (typeof query !== "string")
    for (const [key, value] of Object.entries(query))
      for (const entry of Array.isArray(value) ? value : [value])
        if (entry !== undefined) params.append(key, entry);
  for (const [key, value] of Object.entries(patch))
    if (value === null) params.delete(key);
    else params.set(key, value);
  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}
