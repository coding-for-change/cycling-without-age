import { ReportProblemButton } from "./report-problem-button";
import type { SupportStrings } from "./strings";

export function SupportCard({ strings }: { strings: SupportStrings }) {
  return (
    <section className="grid justify-items-start gap-3 rounded-2xl border border-line p-6">
      <h2 className="text-lg">{strings.title}</h2>
      <p className="max-w-prose text-sm text-ink-soft">{strings.body}</p>
      <ReportProblemButton strings={strings} />
    </section>
  );
}
