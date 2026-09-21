"use client";

import { useState, useSyncExternalStore } from "react";
import { LifeBuoy, RotateCcw, Unplug } from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import { ReportProblemDrawer } from "@/components/report-problem/report-problem-drawer";
import { Button } from "@/components/ui/button";
import { errorStrings } from "@/lib/i18n/error-strings";
import { fill } from "@/lib/utils";

const NEVER = () => () => {};

export function ErrorFallback({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const strings = useSyncExternalStore(NEVER, errorStrings, errorStrings);
  const [eventId] = useState<string | null>(() =>
    error.digest
      ? null
      : (Sentry.captureException(error, { tags: { boundary: "root" } }) ??
        null),
  );
  const [reporting, setReporting] = useState(false);

  const reference = error.digest ?? eventId;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-5 py-16 text-center">
      <span
        aria-hidden
        className="flex size-13 items-center justify-center rounded-full bg-mint-tint"
      >
        <Unplug className="size-5" />
      </span>

      <h1 className="font-display text-2xl font-bold tracking-tight">
        {strings.title}
      </h1>
      <p className="max-w-prose text-sm text-ink-soft">{strings.body}</p>

      {reference ? (
        <p className="font-mono text-xs break-all text-ink-faint">
          {fill(strings.errorId, { id: reference })}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
        <Button
          variant="brand"
          onClick={() => retry()}
        >
          <RotateCcw />
          {strings.retry}
        </Button>
        <Button
          variant="outline"
          onClick={() => setReporting(true)}
        >
          <LifeBuoy />
          {strings.report}
        </Button>
      </div>

      <ReportProblemDrawer
        open={reporting}
        onOpenChange={setReporting}
        strings={strings.drawer}
        {...(eventId ? { associatedEventId: eventId } : {})}
      />
    </div>
  );
}
