import { DomainError, mapping } from "@/lib/domain-error";
import { transaction } from "@/lib/events";
import { distanceMeters, type Coords } from "@/lib/geo";
import {
  chapterInput,
  chapterSettingsInput,
  chapterUpdateInput,
  countryInput,
  countryUpdateInput,
  DEFAULT_CHAPTER_SETTINGS,
} from "./schemas";
import type {
  ChapterInput,
  ChapterSettings,
  ChapterSettingsInput,
  ChapterUpdateInput,
  CountryInput,
  CountryUpdateInput,
} from "./schemas";
import {
  deleteCountryAdmin,
  deleteCountryById,
  findCountries,
  findCountryScopes,
  findCountryAdmin,
  findCountryAdmins,
  findCountryAdminsOf,
  findCountryAdminsOfCountries,
  findCountryByCode,
  findCountryById,
  findCountryFootprint,
  findCountryFootprints,
  insertCountry,
  insertCountryAdmin,
  updateCountryById,
} from "./services/countries";
import {
  findChapterSettings,
  upsertChapterSettings,
} from "./services/settings";
import {
  deleteChapterById,
  findChapterById,
  findChaptersByIds,
  findChapterBySlug,
  findChapterCountryId,
  findChapterFootprint,
  findChapters,
  findChapterScopes,
  insertChapter,
  updateChapterById,
} from "./services/chapters";

export const listCountries = () => findCountries();
export const getCountry = (id: string) => findCountryById(id);
export const getCountryByCode = (code: string) =>
  findCountryByCode(code.toUpperCase());

export const createCountry = (input: CountryInput) =>
  mapping(() => insertCountry(countryInput.parse(input)), {
    unique: "codeTaken",
  });

export async function updateCountry(id: string, input: CountryUpdateInput) {
  const data = countryUpdateInput.parse(input);
  if (data.code) {
    const clash = await findCountryByCode(data.code);
    if (clash && clash.id !== id) throw new DomainError("codeTaken");
  }
  return mapping(() => updateCountryById(id, data), { unique: "codeTaken" });
}

export const listCountryAdmins = (countryId: string) =>
  findCountryAdmins(countryId);
export const listCountriesAdministeredBy = async (userId: string) =>
  (await findCountryAdminsOf(userId)).map((row) => row.countryId);

export async function appointCountryAdmin(
  userId: string,
  countryId: string,
  actorUserId: string,
) {
  if (!(await findCountryById(countryId)))
    throw new DomainError("unknownCountry");

  return transaction(async (tx, emit) => {
    if (await findCountryAdmin(userId, countryId, tx)) return false;
    await insertCountryAdmin(userId, countryId, tx);
    await emit({
      type: "countryAdmin.appointed",
      countryId,
      userId,
      actorUserId,
    });
    return true;
  });
}

export function removeCountryAdmin(
  userId: string,
  countryId: string,
  actorUserId: string,
) {
  return transaction(async (tx, emit) => {
    const { count } = await deleteCountryAdmin(userId, countryId, tx);
    if (count === 0) return false;
    await emit({
      type: "countryAdmin.removed",
      countryId,
      userId,
      actorUserId,
    });
    return true;
  });
}

export type CountryFootprint = {
  chapters: number;
  admins: number;
  members: number;
  passengers: number;
};

const toFootprint = (row: {
  _count: { chapters: number; admins: number };
  chapters: { _count: { members: number; passengers: number } }[];
}): CountryFootprint => ({
  chapters: row._count.chapters,
  admins: row._count.admins,
  members: row.chapters.reduce(
    (sum, chapter) => sum + chapter._count.members,
    0,
  ),
  passengers: row.chapters.reduce(
    (sum, chapter) => sum + chapter._count.passengers,
    0,
  ),
});

export async function getCountryFootprint(
  id: string,
): Promise<CountryFootprint | null> {
  const row = await findCountryFootprint(id);
  return row ? toFootprint(row) : null;
}

export async function listCountryFootprints(ids: string[]) {
  const rows = await findCountryFootprints(ids);
  return new Map(rows.map((row) => [row.id, toFootprint(row)]));
}

export async function listAdminsByCountry(countryIds: string[]) {
  const rows = await findCountryAdminsOfCountries(countryIds);
  const grouped = new Map<
    string,
    { userId: string; name: string; email: string }[]
  >();
  for (const row of rows) {
    const list = grouped.get(row.countryId) ?? [];
    list.push({
      userId: row.userId,
      name: row.user.name,
      email: row.user.email,
    });
    grouped.set(row.countryId, list);
  }
  return grouped;
}

export const deleteCountry = (id: string) => deleteCountryById(id);

type Chapter = NonNullable<Awaited<ReturnType<typeof getChapter>>>;

const LOCATION = ["latitude", "longitude", "address"] as const;
const VALUE_MAX = 120;

const shown = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "";
  const text = String(value);
  return text.length > VALUE_MAX ? `${text.slice(0, VALUE_MAX - 1)}…` : text;
};

const locationText = (row: {
  address?: string | null;
  latitude?: number;
  longitude?: number;
}) =>
  row.address ||
  (row.latitude !== undefined && row.longitude !== undefined
    ? `${row.latitude.toFixed(5)}, ${row.longitude.toFixed(5)}`
    : "");

export function diffChapter(
  before: Chapter,
  input: ChapterUpdateInput,
): { field: string; from: string; to: string }[] {
  const changes: { field: string; from: string; to: string }[] = [];
  const moved = LOCATION.some(
    (key) => input[key] !== undefined && input[key] !== before[key],
  );
  if (moved) {
    changes.push({
      field: "location",
      from: locationText(before),
      to: locationText({
        address: input.address === undefined ? before.address : input.address,
        latitude: input.latitude ?? before.latitude,
        longitude: input.longitude ?? before.longitude,
      }),
    });
  }
  for (const [field, next] of Object.entries(input)) {
    if (next === undefined) continue;
    if ((LOCATION as readonly string[]).includes(field)) continue;
    const previous = before[field as keyof Chapter];
    if (shown(previous) === shown(next)) continue;
    changes.push({ field, from: shown(previous), to: shown(next) });
  }
  return changes;
}

export const listChapters = (countryId?: string) => findChapters(countryId);
export const listChapterScopes = () => findChapterScopes();
export const listCountryScopes = () => findCountryScopes();
export const getChapter = (id: string) => findChapterById(id);

export const getChapters = async (ids: string[]) =>
  ids.length === 0 ? [] : findChaptersByIds(ids);
export const getChapterBySlug = (slug: string) => findChapterBySlug(slug);

export const getChapterCountryId = async (id: string) =>
  (await findChapterCountryId(id))?.countryId ?? null;

export const isSlugAvailable = async (slug: string) =>
  chapterInput.shape.slug.safeParse(slug).success &&
  !(await findChapterBySlug(slug));

export type ChapterFootprint = {
  members: number;
  passengers: number;
  pendingApplications: number;
};

export async function getChapterFootprint(
  id: string,
): Promise<ChapterFootprint | null> {
  const row = await findChapterFootprint(id);
  if (!row) return null;
  return {
    members: row._count.members,
    passengers: row._count.passengers,
    pendingApplications: row._count.applications,
  };
}

export const deleteChapter = (id: string) => deleteChapterById(id);

export async function createChapter(input: ChapterInput) {
  const data = chapterInput.parse(input);
  if (!(await findCountryById(data.countryId)))
    throw new DomainError("unknownCountry");
  if (await findChapterBySlug(data.slug)) throw new DomainError("slugTaken");
  return mapping(() => insertChapter(data), { unique: "slugTaken" });
}

export function updateChapter(id: string, input: ChapterUpdateInput) {
  return updateChapterById(id, chapterUpdateInput.parse(input));
}

export const getSettings = async (
  chapterId: string,
): Promise<ChapterSettings> =>
  (await findChapterSettings(chapterId)) ?? DEFAULT_CHAPTER_SETTINGS;

export async function updateSettings(
  chapterId: string,
  input: ChapterSettingsInput,
): Promise<ChapterSettings> {
  if (!(await findChapterCountryId(chapterId)))
    throw new DomainError("unknownChapter");
  return upsertChapterSettings(chapterId, chapterSettingsInput.parse(input));
}

export type NearestChapter = {
  chapter: Awaited<ReturnType<typeof findChapterById>> & object;
  distanceMeters: number;
  inRange: boolean;
};

export async function nearestChapter(
  here: Coords,
): Promise<NearestChapter | null> {
  const all = await findChapters();
  let best: NearestChapter | null = null;

  for (const chapter of all) {
    const metres = distanceMeters(here, {
      lat: chapter.latitude,
      lng: chapter.longitude,
    });
    if (best && metres >= best.distanceMeters) continue;
    best = {
      chapter,
      distanceMeters: metres,
      inRange: metres <= chapter.serviceRadiusKm * 1000,
    };
  }
  return best;
}
