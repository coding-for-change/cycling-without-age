export type SearchParams = Record<string, string | string[] | undefined>;

export const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export function hrefWith(
  pathname: string,
  query: SearchParams | URLSearchParams | string,
  patch: Record<string, string | null>,
) {
  const params = new URLSearchParams(
    typeof query === "string" || query instanceof URLSearchParams ? query : "",
  );
  if (typeof query !== "string" && !(query instanceof URLSearchParams))
    for (const [key, value] of Object.entries(query))
      for (const entry of Array.isArray(value) ? value : [value])
        if (entry !== undefined) params.append(key, entry);
  for (const [key, value] of Object.entries(patch))
    if (value === null) params.delete(key);
    else params.set(key, value);
  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}
