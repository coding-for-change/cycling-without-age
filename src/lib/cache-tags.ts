import { revalidateTag, updateTag } from "next/cache";
import type { Access } from "@/lib/access";

const REPORTS_TAG = "reports";
const WIDE_REPORTS_TAG = "reports:wide";
const MAX_TAGS_PER_ENTRY = 128;
const MAX_CHAPTER_TAGS = MAX_TAGS_PER_ENTRY - 1;

const chapterReportsTag = (chapterId: string) => `reports:chapter:${chapterId}`;

export const reportCacheTags = (chapterIds: string[]) =>
  chapterIds.length <= MAX_CHAPTER_TAGS
    ? [REPORTS_TAG, ...chapterIds.map(chapterReportsTag)]
    : [REPORTS_TAG, WIDE_REPORTS_TAG];

export function invalidateReports(...chapterIds: string[]) {
  if (!chapterIds.length) {
    updateTag(REPORTS_TAG);
    return;
  }
  updateTag(WIDE_REPORTS_TAG);
  for (const chapterId of new Set(chapterIds))
    updateTag(chapterReportsTag(chapterId));
}

const WIDE_ACCESS_TAG = "access:wide";
const MAX_ACCESS_SCOPE_TAGS = MAX_TAGS_PER_ENTRY - 1;

export const accessTag = (userId: string) => `access:${userId}`;
const chapterAccessTag = (chapterId: string) => `access:chapter:${chapterId}`;
const countryAccessTag = (countryId: string) => `access:country:${countryId}`;

export function accessCacheTags(
  userId: string,
  access: Pick<Access, "countryAdminOf" | "memberships">,
) {
  const scoped = [
    ...access.memberships.map((m) => chapterAccessTag(m.chapterId)),
    ...access.countryAdminOf.map(countryAccessTag),
  ];
  return scoped.length <= MAX_ACCESS_SCOPE_TAGS
    ? [accessTag(userId), ...scoped]
    : [accessTag(userId), WIDE_ACCESS_TAG];
}

export type AccessTargets = {
  userIds?: (string | null | undefined)[];
  chapterIds?: string[];
  countryIds?: string[];
};

function accessTagsOf({
  userIds = [],
  chapterIds = [],
  countryIds = [],
}: AccessTargets) {
  const tags = new Set<string>();
  for (const userId of userIds) if (userId) tags.add(accessTag(userId));
  if (chapterIds.length || countryIds.length) tags.add(WIDE_ACCESS_TAG);
  for (const chapterId of chapterIds) tags.add(chapterAccessTag(chapterId));
  for (const countryId of countryIds) tags.add(countryAccessTag(countryId));
  return [...tags];
}

export function invalidateAccess(targets: AccessTargets) {
  for (const tag of accessTagsOf(targets)) updateTag(tag);
}

export function expireAccess(targets: AccessTargets) {
  for (const tag of accessTagsOf(targets)) revalidateTag(tag, { expire: 0 });
}

export const ADMIN_SCOPES_TAG = "admin-scopes";

export function invalidateAdminScopes() {
  updateTag(ADMIN_SCOPES_TAG);
}

export const passkeysTag = (userId: string) => `passkeys:${userId}`;

export function expirePasskeys(userId: string) {
  revalidateTag(passkeysTag(userId), { expire: 0 });
}
