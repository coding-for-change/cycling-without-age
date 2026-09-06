import { chapterInput, chapterUpdateInput, countryInput } from "./schemas";
import type { ChapterInput, ChapterUpdateInput, CountryInput } from "./schemas";
import {
  deleteCountryAdmin,
  findCountries,
  findCountryAdmins,
  findCountryAdminsOf,
  findCountryByCode,
  findCountryById,
  insertCountry,
  insertCountryAdmin,
} from "./services/countries";
import {
  findChapterById,
  findChapterBySlug,
  findChapterCountryId,
  findChapters,
  insertChapter,
  updateChapterById,
} from "./services/chapters";

export const listCountries = () => findCountries();
export const getCountry = (id: string) => findCountryById(id);
export const getCountryByCode = (code: string) =>
  findCountryByCode(code.toUpperCase());

export const createCountry = (input: CountryInput) =>
  insertCountry(countryInput.parse(input));

export const listCountryAdmins = (countryId: string) =>
  findCountryAdmins(countryId);
export const listCountriesAdministeredBy = async (userId: string) =>
  (await findCountryAdminsOf(userId)).map((row) => row.countryId);

export async function appointCountryAdmin(userId: string, countryId: string) {
  if (!(await findCountryById(countryId))) throw new Error("Unknown country");
  return insertCountryAdmin(userId, countryId);
}

export const removeCountryAdmin = (userId: string, countryId: string) =>
  deleteCountryAdmin(userId, countryId);

export const listChapters = (countryId?: string) => findChapters(countryId);
export const getChapter = (id: string) => findChapterById(id);
export const getChapterBySlug = (slug: string) => findChapterBySlug(slug);

export const getChapterCountryId = async (id: string) =>
  (await findChapterCountryId(id))?.countryId ?? null;

export async function createChapter(input: ChapterInput) {
  const data = chapterInput.parse(input);
  if (!(await findCountryById(data.countryId)))
    throw new Error("Unknown country");
  if (await findChapterBySlug(data.slug)) throw new Error("Slug already taken");
  return insertChapter(data);
}

// A chapter belongs to exactly one country for life — moving it would silently
// re-scope every country admin's authority over it, so countryId is not updatable.
export async function updateChapter(id: string, input: ChapterUpdateInput) {
  const data = chapterUpdateInput.parse(input);
  if (data.slug) {
    const clash = await findChapterBySlug(data.slug);
    if (clash && clash.id !== id) throw new Error("Slug already taken");
  }
  return updateChapterById(id, data);
}
