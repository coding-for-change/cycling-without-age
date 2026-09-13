import { XCircle } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import { fill } from "@/lib/utils";

type StatusStrings = Dictionary["pilot"]["status"];

/**
 * A chapter said no. The note they left is quoted rather than paraphrased —
 * this is the one place a pilot hears from them directly.
 */
export function RejectedCard({
  chapterName,
  note,
  strings,
}: {
  chapterName: string;
  note: string | null;
  strings: StatusStrings;
}) {
  return (
    <section className="flex items-start gap-3 rounded-2xl border border-line p-5">
      <XCircle
        className="mt-0.5 size-5 shrink-0 text-ink-faint"
        aria-hidden
      />
      <div className="min-w-0">
        <h2 className="font-display font-bold">
          {fill(strings.rejectedTitle, { chapter: chapterName })}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">{strings.rejectedBody}</p>
        {note ? (
          <figure className="mt-3 rounded-lg bg-canvas-deep p-3">
            <figcaption className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
              {strings.note}
            </figcaption>
            <blockquote className="mt-1 text-sm whitespace-pre-wrap">
              {note}
            </blockquote>
          </figure>
        ) : null}
      </div>
    </section>
  );
}
