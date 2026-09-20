import { chapters } from "@/features/chapters";
import { profile } from "@/features/profile";

export const nameOfChapter = async (chapterId: string) =>
  (await chapters.getChapter(chapterId))?.name ?? null;

export const nameOfCountry = async (countryId: string) =>
  (await chapters.getCountry(countryId))?.name ?? null;

export const nameOfPerson = async (userId: string) =>
  (await profile.getProfile(userId))?.name ?? null;
