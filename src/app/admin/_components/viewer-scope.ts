import type { ScopeArg } from "@/lib/commands";
import { readScopeArg } from "./scope-url";

export type AdminViewer = {
  chapters: { id: string; slug: string; countryId: string }[];
  countries: { id: string; code: string }[];
  stored: ScopeArg;
};

export type ViewerScope = {
  scopeQuery: string;
  chapterId: string | null;
  chapterIds: string[];
  countryIds: string[];
};

const queryOf = (arg: ScopeArg) => {
  const [kind, value] = arg.split(":");
  return value ? `?${kind}=${encodeURIComponent(value)}` : "";
};

const canonicalParams = (params: URLSearchParams, viewer: AdminViewer) => {
  const canonical = new URLSearchParams();
  const chapter = params.get("chapter")?.toLowerCase();
  const country = params.get("country")?.toUpperCase();
  const slug = viewer.chapters.find((c) => c.slug.toLowerCase() === chapter);
  if (chapter) canonical.set("chapter", slug?.slug ?? chapter);
  else if (country) canonical.set("country", country);
  return canonical;
};

export function viewerScope(
  params: URLSearchParams,
  viewer: AdminViewer,
): ViewerScope {
  const allowed: ScopeArg[] = [
    ...viewer.countries.map(({ code }) => `country:${code}` as const),
    ...viewer.chapters.map(({ slug }) => `chapter:${slug}` as const),
  ];
  const canonical = canonicalParams(params, viewer);
  const explicit = canonical.size > 0;
  const active = readScopeArg(canonical, allowed, viewer.stored);
  const [kind, value] = active.split(":");

  const chapters =
    kind === "chapter"
      ? viewer.chapters.filter((c) => c.slug === value)
      : kind === "country"
        ? viewer.chapters.filter(
            (c) =>
              c.countryId ===
              viewer.countries.find((country) => country.code === value)?.id,
          )
        : viewer.chapters;

  const countries =
    kind === "chapter"
      ? viewer.countries.filter((c) =>
          chapters.some((chapter) => chapter.countryId === c.id),
        )
      : kind === "country"
        ? viewer.countries.filter((c) => c.code === value)
        : viewer.countries;

  return {
    scopeQuery: explicit ? queryOf(active) : "",
    chapterId: kind === "chapter" ? (chapters[0]?.id ?? null) : null,
    chapterIds: chapters.map((c) => c.id),
    countryIds: countries.map((c) => c.id),
  };
}
