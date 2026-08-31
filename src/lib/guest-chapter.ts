import { cookies } from "next/headers";

export const GUEST_CHAPTER_COOKIE = "cwa.chapter";
export const GUEST_CHAPTER_MAX_AGE = 60 * 60 * 24 * 180;

export const readGuestChapterId = async () =>
  (await cookies()).get(GUEST_CHAPTER_COOKIE)?.value ?? null;
