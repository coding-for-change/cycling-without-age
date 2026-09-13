import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";
import { DownloadQrButton } from "../settings/_components/download-qr-button";

export type JoinLinkLabels = {
  copy: string;
  copied: string;
  poster: string;
  downloadPng: string;
};

/**
 * Copy the join link, print its poster, save its QR. Three surfaces show these
 * — chapter settings, a chapter's detail page and the create drawer's done
 * panel — so the poster route and the PNG filename are spelled once here.
 */
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
