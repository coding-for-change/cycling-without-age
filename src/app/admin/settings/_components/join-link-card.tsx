import { QrCode } from "@/components/qr-code";
import { JoinLinkActions } from "../../_components/join-link-actions";

export function JoinLinkCard({
  url,
  slug,
  labels,
}: {
  url: string;
  slug: string;
  labels: {
    title: string;
    body: string;
    copy: string;
    copied: string;
    poster: string;
    downloadPng: string;
  };
}) {
  return (
    <section className="grid gap-6 rounded-2xl border border-line p-6 sm:grid-cols-[1fr_auto] sm:items-start">
      <div className="grid content-start gap-3">
        <h2 className="text-lg">{labels.title}</h2>
        <p className="max-w-prose text-sm text-ink-soft">{labels.body}</p>
        <p className="font-mono text-sm break-all">{url}</p>
        <JoinLinkActions
          url={url}
          slug={slug}
          labels={labels}
          className="flex flex-wrap items-center gap-2 pt-1"
        />
      </div>
      <div className="justify-self-start rounded-2xl bg-mint-tint p-4">
        <QrCode
          value={url}
          className="size-40"
        />
      </div>
    </section>
  );
}
