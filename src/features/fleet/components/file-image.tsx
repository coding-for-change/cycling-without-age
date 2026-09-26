import { Bike } from "lucide-react";
import { cn } from "@/lib/utils";

export const fileUrl = (fileId: string) => `/api/files/${fileId}`;

export function FileImage({
  fileId,
  alt,
  fit = "cover",
  className,
}: {
  fileId: string | null | undefined;
  alt: string;
  fit?: "cover" | "contain";
  className?: string;
}) {
  if (!fileId)
    return (
      <div
        aria-hidden
        className={cn(
          "bg-muted text-ink-soft flex items-center justify-center",
          className,
        )}
      >
        <Bike className="size-1/3 max-h-10 max-w-10" />
      </div>
    );

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={fileUrl(fileId)}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn(
        fit === "contain"
          ? "border border-line bg-white object-contain p-1"
          : "bg-muted object-cover",
        className,
      )}
    />
  );
}

const THUMB_SIZE = {
  sm: "size-9 rounded-lg",
  md: "size-13 rounded-lg",
  lg: "size-14 rounded-xl",
} as const;

export function FileThumb({
  fileId,
  alt,
  size = "md",
  className,
}: {
  fileId: string | null | undefined;
  alt: string;
  size?: keyof typeof THUMB_SIZE;
  className?: string;
}) {
  return (
    <FileImage
      fileId={fileId}
      alt={alt}
      fit="contain"
      className={cn("shrink-0", THUMB_SIZE[size], className)}
    />
  );
}
