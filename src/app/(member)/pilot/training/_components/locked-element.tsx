import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LessonStrings } from "./lesson-view";

export function LockedElement({
  title,
  href,
  strings,
}: {
  title: string;
  href: string | null;
  strings: LessonStrings;
}) {
  return (
    <div className="px-4 pt-2 lg:px-0">
      <div className="grid justify-items-center gap-4 rounded-(--r-tile) border border-line bg-canvas px-5 py-10 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-canvas-deep text-ink-soft">
          <Lock
            className="size-6"
            aria-hidden
          />
        </span>
        <p className="text-xs font-medium tracking-wide text-ink-soft uppercase">
          {title}
        </p>
        <h1 className="text-2xl tracking-tight">{strings.lockedTitle}</h1>
        <p className="max-w-sm text-sm text-ink-soft">{strings.lockedBody}</p>
        {href ? (
          <Button
            asChild
            variant="brand"
            className="min-h-12 rounded-full px-6"
          >
            <Link
              href={href}
              prefetch
              transitionTypes={["pop"]}
            >
              {strings.toQuiz}
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
