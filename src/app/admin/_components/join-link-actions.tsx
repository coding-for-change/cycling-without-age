import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/copy-button";
import { DownloadQrButton } from "../settings/_components/download-qr-button";

export type JoinLinkLabels = {
  copy: string;
  copied: string;
  poster: string;
  downloadPng: string;
};

export function JoinLinkActions({
  url,
  slug,
  labels,
  className,
  buttonClassName = "min-h-11",
}: {
  url: string;
  slug: string;
  labels: JoinLinkLabels;
  className?: string;
  buttonClassName?: string;
}) {
  return (
    <div className={className}>
      <CopyButton
        value={url}
        label={labels.copy}
        copiedLabel={labels.copied}
        className={buttonClassName}
      />
      <Button
        asChild
        variant="outline"
        className={cn(buttonClassName)}
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
        className={buttonClassName}
      />
    </div>
  );
}
