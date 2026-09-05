import { Check } from "lucide-react";
import { membership } from "@/features/membership";
import { formatDate, type Locale } from "@/lib/format";
import { cn, fill, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Dictionary } from "@/lib/i18n";

type StatusStrings = Dictionary["pilot"]["status"];

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

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
  const reviewers = await membership.listChapterAdmins(chapterId);

  return (
    <article className="mt-6 rounded-xl border border-line p-5">
      <h2 className="font-display text-lg font-bold">
        {fill(strings.pendingTitle, { chapter: chapterName })}
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        {fill(strings.appliedOn, { date: formatDate(appliedAt, locale) })}
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
              <Avatar size="sm">
                {reviewer.user.image ? (
                  <AvatarImage
                    src={reviewer.user.image}
                    alt=""
                  />
                ) : null}
                <AvatarFallback className="bg-mint-tint text-ink">
                  {getInitials(reviewer.user.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{firstName(reviewer.user.name)}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-sm text-ink-soft">{strings.pendingHint}</p>
    </article>
  );
}

// The application is in step two for as long as this card is on screen: it is
// only ever rendered for a pending application.
const ACTIVE_STEP = 1;

function ApplicationTimeline({ steps }: { steps: StatusStrings["steps"] }) {
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
