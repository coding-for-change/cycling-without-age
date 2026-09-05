import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Apple, Play } from "lucide-react";
import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/app-url";
import { getSession, homeOf } from "@/lib/auth-guards";
import { getDictionary } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookRideCta } from "./_components/book-ride-cta";
import { JoinActions } from "./_components/join-actions";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const chapter = await chapters.getChapterBySlug(slug);
  if (!chapter) return {};

  const title = `${chapter.name} · Cycling Without Age`;
  const description =
    chapter.description ?? chapter.careHomeName ?? chapter.city;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      ...(chapter.logo ? { images: [chapter.logo] } : {}),
    },
  };
}

// TODO: rework this page once the pilot and passenger mobile structure exists; store links are placeholders until the apps are published.
export default function JoinPage({ params }: Params) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <Suspense fallback={<JoinSkeleton />}>
        <Join params={params} />
      </Suspense>
    </main>
  );
}

function JoinSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-40 w-full rounded-(--r-tile)" />
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-32 w-full rounded-(--r-card)" />
      <Skeleton className="h-32 w-full rounded-(--r-card)" />
    </div>
  );
}

async function Join({ params }: Params) {
  const { slug } = await params;
  const [chapter, session, dict] = await Promise.all([
    chapters.getChapterBySlug(slug),
    getSession(),
    getDictionary(),
  ]);

  if (!chapter) notFound();

  const strings = dict.join;
  const isMember =
    session?.access.memberships.some((m) => m.chapterId === chapter.id) ??
    false;

  const pendingApplication =
    session && !isMember
      ? (await membership.listApplicationsOfUser(session.user.id)).some(
          (application) =>
            application.chapterId === chapter.id &&
            application.status === "pending",
        )
      : false;

  return (
    <>
      <div className="relative h-40 w-full overflow-hidden rounded-(--r-tile) bg-mint-tint">
        {chapter.logo ? (
          <Image
            src={chapter.logo}
            alt=""
            fill
            unoptimized
            sizes="(max-width: 42rem) 100vw, 42rem"
            className="object-contain p-6"
          />
        ) : null}
      </div>

      <Image
        src="/logo.png"
        alt="Cycling Without Age"
        width={800}
        height={286}
        className="mt-8 h-auto w-[140px]"
      />

      <p className="mt-6 text-xs font-semibold tracking-wide text-ink-soft uppercase">
        {strings.eyebrow}
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
        {chapter.name}
      </h1>
      <p className="mt-1 text-ink-soft">
        {chapter.careHomeName ?? chapter.city}
      </p>
      {chapter.description ? (
        <p className="mt-4 leading-relaxed text-ink-soft">
          {chapter.description}
        </p>
      ) : null}

      {isMember && session ? (
        <div className="mt-8 rounded-(--r-card) border border-line p-5">
          <h2 className="font-display text-lg font-bold">
            {strings.member.title}
          </h2>
          <Button
            asChild
            className="mt-4 min-h-11 rounded-full bg-red px-8 text-white hover:bg-red-hover"
          >
            <Link href={homeOf(session)}>{strings.member.cta}</Link>
          </Button>
        </div>
      ) : session ? (
        <JoinActions
          chapterId={chapter.id}
          pendingApplication={pendingApplication}
          strings={{ passenger: strings.passenger, pilot: strings.pilot }}
          errors={dict.location.errors}
        />
      ) : (
        <div className="mt-8 grid gap-4">
          <a
            href={`/join/${chapter.slug}/start?role=passenger`}
            className="group rounded-(--r-card) border border-line p-5 transition-colors hover:bg-canvas-deep focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
          >
            <h2 className="font-display text-lg font-bold">
              {strings.passenger.title}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {strings.passenger.body}
            </p>
            <span className="mt-4 inline-flex min-h-11 items-center rounded-full bg-red px-8 text-sm font-medium text-white group-hover:bg-red-hover">
              {strings.passenger.cta}
            </span>
          </a>
          <a
            href={`/join/${chapter.slug}/start?role=pilot`}
            className="rounded-(--r-card) border border-line p-5 transition-colors hover:bg-canvas-deep focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
          >
            <h2 className="font-display text-lg font-bold">
              {strings.pilot.title}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">{strings.pilot.body}</p>
            <span className="mt-4 inline-flex min-h-11 items-center rounded-full border border-ink px-8 text-sm font-medium">
              {strings.pilot.cta}
            </span>
          </a>
        </div>
      )}

      <BookRideCta
        slug={chapter.slug}
        signedIn={Boolean(session)}
        strings={strings.ride}
      />

      <section className="mt-10 border-t border-line pt-8">
        <h2 className="font-display text-lg font-bold">{strings.app.title}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-mint-deep px-6 text-sm font-medium text-white transition-colors hover:bg-mint-deep/90 focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
          >
            <Apple
              className="size-4"
              aria-hidden
            />
            {strings.app.appStore}
          </a>
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-mint-deep px-6 text-sm font-medium text-white transition-colors hover:bg-mint-deep/90 focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
          >
            <Play
              className="size-4"
              aria-hidden
            />
            {strings.app.playStore}
          </a>
        </div>
      </section>
    </>
  );
}
