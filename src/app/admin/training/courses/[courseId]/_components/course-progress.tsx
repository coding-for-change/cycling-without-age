import { headers } from "next/headers";
import { chapters as chapterFeature } from "@/features/chapters";
import type { FamilyStatusName } from "@/features/training";
import { formatNumber, resolveLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import { FALLBACK_TIME_ZONE } from "@/lib/time-zone";
import { courseProgress } from "@/use-cases/training-progress";
import {
  DetailEmpty,
  DetailSection,
} from "../../../../_components/detail-page";
import { stampOf } from "../../../../_components/training-stamp";
import { CourseProgressTable } from "./course-progress-table";

const STATUSES: FamilyStatusName[] = [
  "passed",
  "exempt",
  "inProgress",
  "notStarted",
];

const SEGMENT: Record<FamilyStatusName, string> = {
  passed: "bg-mint-deep",
  exempt: "bg-mint",
  inProgress: "bg-mint-tint",
  notStarted: "bg-canvas-deeper",
};

export async function CourseProgressSection({
  courseId,
  chapterIds,
  includeNames,
  scopeName,
  scopeQuery,
}: {
  courseId: string;
  chapterIds: string[];
  includeNames: boolean;
  scopeName: string;
  scopeQuery: string;
}) {
  const language = await getLocale();
  const [progress, zones, dict, head] = await Promise.all([
    courseProgress({ courseId, chapterIds, includeNames, locale: language }),
    includeNames
      ? chapterFeature.getChapterTimeZones(chapterIds)
      : Promise.resolve([]),
    getDictionary(),
    headers(),
  ]);
  const labels = dict.admin.training.course.progress;
  const notation = resolveLocale(head.get("accept-language"));
  const total = progress.pilots;
  const zoneOf = new Map(zones.map((zone) => [zone.id, zone.timeZone]));
  const now = new Date();
  const percent = (value: number) =>
    formatNumber(value / 100, notation, {
      style: "percent",
      maximumFractionDigits: 0,
    });

  return (
    <DetailSection
      title={labels.title}
      description={formatMessage(
        labels.description,
        { count: total, scope: scopeName },
        language,
      )}
      className="gap-3"
    >
      {total === 0 ? (
        <DetailEmpty>{labels.empty}</DetailEmpty>
      ) : (
        <div className="grid gap-3 rounded-xl bg-canvas-deep px-4 py-3">
          <div
            aria-hidden
            className="flex h-2 overflow-hidden rounded-full bg-canvas"
          >
            {STATUSES.map((status) =>
              progress.counts[status] > 0 ? (
                <span
                  key={status}
                  className={cn("h-full", SEGMENT[status])}
                  style={{
                    width: `${(progress.counts[status] / total) * 100}%`,
                  }}
                />
              ) : null,
            )}
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-2sm">
            {STATUSES.map((status) => (
              <li
                key={status}
                className="inline-flex items-center gap-2"
              >
                <span
                  aria-hidden
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    SEGMENT[status],
                    status === "notStarted" && "border border-ink-faint",
                  )}
                />
                <span className="text-ink-soft">{labels.statuses[status]}</span>
                <span className="font-medium text-ink tabular-nums">
                  {formatNumber(progress.counts[status], notation)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {includeNames ? (
        progress.rows.length > 0 ? (
          <CourseProgressTable
            rows={progress.rows.map((row) => {
              const context = {
                notation,
                words: language,
                timeZone: zoneOf.get(row.chapterId) ?? FALLBACK_TIME_ZONE,
                now,
              };
              return {
                id: `${row.userId}:${row.chapterId}`,
                userId: row.userId,
                pilot: row.name ?? labels.unnamed,
                status: row.status,
                percent: row.percent,
                percentLabel: percent(row.percent),
                current: row.currentLessonTitle,
                attempts: row.attempts,
                lastActivity: stampOf(row.lastActivityAt, context, true),
              };
            })}
            scopeQuery={scopeQuery}
            labels={labels}
            table={dict.admin.table}
            locale={language}
          />
        ) : null
      ) : total > 0 ? (
        <p className="text-2sm text-pretty text-ink-soft">{labels.privacy}</p>
      ) : null}
    </DetailSection>
  );
}
