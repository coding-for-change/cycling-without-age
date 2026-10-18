import { Bug, Mail } from "lucide-react";
import { getDictionary } from "@/lib/i18n";
import { problemMailto } from "@/lib/support";

/**
 * Something not working? One tap opens the passenger's mail app with a short
 * template — what happened, where — addressed to the chapter's helpers.
 */
export async function ReportProblemCard() {
  const dict = await getDictionary();
  const s = dict.member.home.passenger.report;

  return (
    <section className="reveal flex flex-col gap-4 rounded-soft border border-line bg-paper p-5 shadow-soft [--i:8]">
      <div className="flex items-center gap-3.5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-grey-tint">
          <Bug
            aria-hidden
            className="size-5"
          />
        </span>
        <div className="flex min-w-0 flex-col">
          <h2 className="text-lg">{s.title}</h2>
          <p className="text-sm text-ink-soft">{s.body}</p>
        </div>
      </div>
      <a
        href={problemMailto(s.subject, s.template)}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full border border-line bg-paper px-5 text-base font-bold shadow-soft outline-none transition-transform hover:bg-canvas-deep focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-98 motion-reduce:transition-none"
      >
        <Mail
          aria-hidden
          className="size-5"
        />
        {s.action}
      </a>
    </section>
  );
}
