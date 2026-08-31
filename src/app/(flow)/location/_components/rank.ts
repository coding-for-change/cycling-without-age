import { distanceMeters, type Coords } from "@/lib/geo";

export type RankableChapter = {
  id: string;
  name: string;
  city: string;
  careHomeName: string | null;
  coords: Coords;
};

export type RankedChapter<T> = T & { distance: number | null };

export function rankChapters<T extends RankableChapter>({
  chapters,
  query,
  here,
  locale,
}: {
  chapters: T[];
  query: string;
  here: Coords | null;
  locale: string;
}): RankedChapter<T>[] {
  const needle = query.trim().toLocaleLowerCase(locale);

  return chapters
    .filter(
      (chapter) =>
        !needle ||
        `${chapter.name} ${chapter.city} ${chapter.careHomeName ?? ""}`
          .toLocaleLowerCase(locale)
          .includes(needle),
    )
    .map((chapter) => ({
      ...chapter,
      distance: here ? distanceMeters(here, chapter.coords) : null,
    }))
    .sort(
      (a, b) =>
        (a.distance ?? Infinity) - (b.distance ?? Infinity) ||
        a.name.localeCompare(b.name, locale),
    );
}
