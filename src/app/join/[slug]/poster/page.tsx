import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { chapters } from "@/features/chapters";
import { joinUrl } from "@/lib/app-url";
import { getDictionary } from "@/lib/i18n";
import { QrCode } from "@/components/qr-code";
import { Skeleton } from "@/components/ui/skeleton";
import { AutoPrint } from "./_components/auto-print";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const chapter = await chapters.getChapterBySlug(slug);
  return {
    title: chapter
      ? `${chapter.name} · Cycling Without Age`
      : "Cycling Without Age",
    robots: { index: false },
  };
}

export default function PosterPage(props: Props) {
  return (
    <div className="flex min-h-dvh items-start justify-center bg-canvas-deep p-8 print:min-h-0 print:bg-canvas print:p-0">
      <main className="flex min-h-[297mm] w-[210mm] shrink-0 flex-col overflow-hidden bg-canvas [print-color-adjust:exact] print:h-[297mm] print:overflow-hidden">
        <Suspense fallback={<PosterSkeleton />}>
          <Poster {...props} />
        </Suspense>
      </main>
    </div>
  );
}

function PosterSkeleton() {
  return (
    <>
      <div className="px-[16mm] pt-[12mm]">
        <Skeleton className="h-[17mm] w-[48mm]" />
        <Skeleton className="mt-[8mm] h-[15mm] w-[130mm]" />
        <Skeleton className="mt-[4mm] h-[7mm] w-[80mm]" />
        <Skeleton className="mt-[5mm] h-[18mm] w-[135mm]" />
      </div>
      <Skeleton className="mt-[10mm] flex-1 rounded-none" />
    </>
  );
}

async function Poster({ params, searchParams }: Props) {
  const [{ slug }, query, dict] = await Promise.all([
    params,
    searchParams,
    getDictionary(),
  ]);
  const chapter = await chapters.getChapterBySlug(slug);

  if (!chapter) notFound();

  const url = joinUrl(chapter.slug);
  const strings = dict.join.poster;

  return (
    <>
      {query.print === "1" ? <AutoPrint /> : null}

      <header className="px-[16mm] pt-[12mm]">
        <Image
          src="/logo.png"
          alt="Cycling Without Age"
          width={800}
          height={286}
          priority
          className="h-auto w-[48mm]"
        />
        <h1 className="mt-[8mm] line-clamp-2 font-display text-[38pt] leading-[1.05] font-bold tracking-tight text-balance">
          {chapter.name}
        </h1>
        <p className="mt-[4mm] text-[15pt] text-ink-soft">
          {chapter.careHomeName ?? chapter.city}
        </p>
        {chapter.description ? (
          <p className="mt-[5mm] line-clamp-3 max-w-[135mm] text-[11.5pt] leading-relaxed text-ink-soft text-pretty">
            {chapter.description}
          </p>
        ) : null}
      </header>

      <section className="mt-[10mm] flex flex-1 flex-col items-center justify-center gap-[6mm] bg-mint px-[16mm] py-[8mm] [clip-path:polygon(0_0,100%_6%,100%_100%,0_100%)]">
        <div className="rounded-(--r-tile) bg-canvas p-[5mm]">
          <QrCode
            value={url}
            className="size-[95mm] text-ink"
          />
        </div>
        <div className="text-center">
          <p className="font-display text-[19pt] font-bold">{strings.scan}</p>
          <p className="mt-[2mm] text-[12.5pt] tabular-nums">
            {url.replace(/^https?:\/\//, "")}
          </p>
        </div>
      </section>

      <p className="bg-red px-[16mm] py-[6mm] text-center font-display text-[17pt] font-bold text-white">
        {strings.slogan}
      </p>

      <footer className="flex items-center justify-between gap-[6mm] px-[16mm] py-[4mm] text-[8.5pt] text-ink-soft">
        <span>cyclingwithoutage.org</span>
        <span>{strings.madeWith}</span>
        <span>codingforchange.org</span>
      </footer>
    </>
  );
}
