import { chapters } from "@/features/chapters";
import { fleet } from "@/features/fleet";
import { membership } from "@/features/membership";
import { profile } from "@/features/profile";

export const nameOfChapter = async (chapterId: string) =>
  (await chapters.getChapter(chapterId))?.name ?? null;

export const nameOfCountry = async (countryId: string) =>
  (await chapters.getCountry(countryId))?.name ?? null;

export const nameOfPerson = async (userId: string) =>
  (await profile.getProfile(userId))?.name ?? null;

export const nameOfLocation = async (locationId: string) =>
  (await fleet.getLocation(locationId))?.name ?? null;

export const nameOfTrishaw = async (trishawId: string) =>
  (await fleet.getTrishaw(trishawId))?.name ?? null;

export const chapterAdminIds = async (chapterId: string) =>
  (await membership.listChapterAdmins(chapterId)).map((m) => m.userId);

export const countryAdminIds = async (countryId: string) =>
  (await chapters.listCountryAdmins(countryId)).map((a) => a.userId);

export const excluding = (ids: string[], ...userIds: (string | null)[]) =>
  ids.filter((id) => !userIds.includes(id));
