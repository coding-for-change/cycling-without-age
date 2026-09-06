import { Printer } from "lucide-react";
import { QrCode } from "@/components/qr-code";
import { Button } from "@/components/ui/button";
import { CopyButton } from "../../_components/copy-button";
import { DownloadQrButton } from "./download-qr-button";

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
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <CopyButton
            value={url}
            label={labels.copy}
            copiedLabel={labels.copied}
          />
          <Button
            asChild
            variant="outline"
            className="min-h-11"
          >
            <a
              href={`/join/${slug}/poster?print=1`}
              target="_blank"
              rel="noopener"
            >
              <Printer aria-hidden />
              {labels.poster}
            </a>
          </Button>
          <DownloadQrButton
            value={url}
            fileName={`${slug}-qr.png`}
            label={labels.downloadPng}
          />
        </div>
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
