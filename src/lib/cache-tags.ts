import { updateTag } from "next/cache";

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
