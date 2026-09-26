import { Check } from "lucide-react";
import { membership } from "@/features/membership";
import { formatDate, type Locale } from "@/lib/format";
import { avatarSeed, avatarSvg } from "@/lib/avatar";
import { cn, firstName } from "@/lib/utils";
import { formatMessage } from "@/lib/i18n/format";
import { PersonAvatar } from "@/components/person-avatar";
import { getLocale, type Dictionary } from "@/lib/i18n";

type StatusStrings = Dictionary["pilot"]["status"];

export async function PendingChapterCard({
  chapterId,
  chapterName,
  appliedAt,
  locale,
  strings,
}: {
  chapterId: string;
  chapterName: string;
  appliedAt: Date;
  locale: Locale;
  strings: StatusStrings;
}) {
  const [reviewers, language] = await Promise.all([
    membership.listChapterAdmins(chapterId),
    getLocale(),
  ]);

  return (
    <article className="rounded-2xl border border-line p-5">
      <h2 className="font-display text-lg font-bold">
        {formatMessage(
          strings.pendingTitle,
          { chapter: chapterName },
          language,
        )}
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        {formatMessage(
          strings.appliedOn,
          { date: formatDate(appliedAt, locale) },
          language,
        )}
      </p>

      <ApplicationTimeline steps={strings.steps} />

      <h3 className="mt-6 text-xs font-semibold tracking-wide text-ink-soft uppercase">
        {strings.reviewers}
      </h3>
      {reviewers.length === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">{strings.reviewersNone}</p>
      ) : (
        <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          {reviewers.map((reviewer) => (
            <li
              key={reviewer.userId}
              className="flex items-center gap-2"
            >
              <PersonAvatar
                svg={avatarSvg(avatarSeed(reviewer.user.email))}
                size="sm"
              />
              <span className="text-sm">{firstName(reviewer.user.name)}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-sm text-ink-soft">{strings.pendingHint}</p>
    </article>
  );
}

const ACTIVE_STEP = 1;

function ApplicationTimeline({
  steps: labels,
}: {
  steps: StatusStrings["steps"];
}) {
  const steps = Object.values(labels);
  return (
    <ol className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-3">
      {steps.map((label, index) => {
        const done = index < ACTIVE_STEP;
        const active = index === ACTIVE_STEP;
        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className="flex items-center gap-2"
          >
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                done || active
                  ? "bg-mint text-ink"
                  : "border border-line text-ink-soft",
              )}
            >
              {done ? (
                <Check
                  className="size-3.5"
                  aria-hidden
                />
              ) : (
                index + 1
              )}
            </span>
            <span
              className={cn(
                "text-sm",
                active ? "font-medium" : "text-ink-soft",
              )}
            >
              {label}
            </span>
            {index < steps.length - 1 ? (
              <span
                aria-hidden
                className={cn(
                  "ml-1 h-px w-4 sm:w-8",
                  done ? "bg-mint" : "bg-line",
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
