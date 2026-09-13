"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Check, Loader2 } from "lucide-react";
import { formatRelativeTime, wordsLocale } from "@/lib/format";
import { cn, fill } from "@/lib/utils";

type Status =
  { kind: "idle" } | { kind: "saving" } | { kind: "saved"; at: Date };

type Report = (outcome: "saving" | "saved" | "failed") => void;

const Ctx = createContext<{ status: Status; report: Report }>({
  status: { kind: "idle" },
  report: () => {},
});

/** One header indicator for however many fields autosave on the page. */
export function SaveStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const inFlight = useRef(0);

  const report = useCallback<Report>((outcome) => {
    if (outcome === "saving") {
      inFlight.current += 1;
      setStatus({ kind: "saving" });
      return;
    }
    inFlight.current = Math.max(0, inFlight.current - 1);
    if (inFlight.current > 0) return;
    setStatus(
      outcome === "saved"
        ? { kind: "saved", at: new Date() }
        : { kind: "idle" },
    );
  }, []);

  const value = useMemo(() => ({ status, report }), [status, report]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSaveStatus = () => useContext(Ctx).report;

export function SaveStatus({
  labels,
  words,
  className,
}: {
  labels: { saving: string; saved: string };
  /** The UI language — relative time is words, not notation. */
  words: string;
  className?: string;
}) {
  const { status } = useContext(Ctx);
  const [now, setNow] = useState(() => new Date());

  // "just now" has to age into "1 min ago" without another save happening.
  useEffect(() => {
    if (status.kind !== "saved") return;
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, [status]);

  if (status.kind === "idle") return null;

  return (
    <p
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1.5 text-2sm text-ink-soft",
        className,
      )}
    >
      {status.kind === "saving" ? (
        <>
          <Loader2
            aria-hidden
            className="size-3.5 animate-spin motion-reduce:animate-none"
          />
          {labels.saving}
        </>
      ) : (
        <>
          <Check
            aria-hidden
            className="size-3.5"
          />
          {fill(labels.saved, {
            when: formatRelativeTime(
              status.at,
              wordsLocale(words),
              now > status.at ? now : status.at,
            ),
          })}
        </>
      )}
    </p>
  );
}
