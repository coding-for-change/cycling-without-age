import { RichText } from "@/components/markdown";
import { Skeleton } from "@/components/ui/skeleton";

export function LegalDocumentView({
  edition,
  draftNotice,
  text,
}: {
  edition: string;
  draftNotice: string | null;
  text: string;
}) {
  return (
    <>
      <p className="mt-3 text-2sm text-ink-soft">{edition}</p>
      {draftNotice ? (
        <p className="mt-5 rounded-(--r-card) bg-canvas-deep p-4 text-sm text-ink-soft">
          {draftNotice}
        </p>
      ) : null}
      <RichText
        variant="legal"
        text={text}
        className="mt-10"
      />
    </>
  );
}

export function LegalDocumentViewSkeleton() {
  return (
    <div className="mt-3 space-y-5">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
