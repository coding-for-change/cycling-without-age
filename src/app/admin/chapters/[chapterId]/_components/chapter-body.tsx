import Link from "next/link";
import { headers } from "next/headers";
import { forbidden, notFound } from "next/navigation";
import { Armchair, ArrowLeft, Inbox, Printer, Users } from "lucide-react";
import { QrCode } from "@/components/qr-code";
import { Button } from "@/components/ui/button";
import { activity } from "@/features/activity";
import { chapters } from "@/features/chapters";
import { joinUrl } from "@/lib/app-url";
import { formatDate, resolveLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { fill } from "@/lib/utils";
import { CopyButton } from "../../../_components/copy-button";
import { readActiveScope } from "../../../active-scope";
import { ActivityFeed } from "../../../members/[userId]/_components/activity-feed";
import { DownloadQrButton } from "../../../settings/_components/download-qr-button";
import { ChapterEditor } from "./chapter-editor";
import { DeleteChapterDialog } from "./delete-chapter-dialog";

export async function ChapterBody({
  params,
  searchParams,
}: {
  params: Promise<{ chapterId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ session, scope, active, chapters: inScope }, { chapterId }] =
    await Promise.all([readActiveScope(searchParams), params]);
  if (!scope.canSeeChapters) forbidden();
  if (!inScope.some((entry) => entry.id === chapterId)) notFound();

  const [chapter, footprint, events, all, dict, language, head] =
    await Promise.all([
      chapters.getChapter(chapterId),
      chapters.getChapterFootprint(chapterId),
      activity.listForChapter(chapterId),
      chapters.listChapters(),
      getDictionary(),
      getLocale(),
      headers(),
    ]);
  if (!chapter || !footprint) notFound();

  const country = await chapters.getCountry(chapter.countryId);

  const notation = resolveLocale(head.get("accept-language"));
  const strings = dict.admin.chapters;
  const detail = strings.detail;

  const scopeQuery =
    active.kind === "chapter"
      ? `?chapter=${encodeURIComponent(active.chapter.slug)}`
      : active.kind === "country"
        ? `?country=${encodeURIComponent(active.country.code)}`
        : "";
  const backHref = `/admin/chapters${scopeQuery}`;
  const url = joinUrl(chapter.slug);
  const chapterQuery = `?chapter=${encodeURIComponent(chapter.slug)}`;

  const visible = new Set(inScope.map((entry) => entry.id));
  const others = all
    .filter((entry) => entry.id !== chapterId && visible.has(entry.id))
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      city: entry.city,
      coords: { lat: entry.latitude, lng: entry.longitude },
      radiusKm: entry.serviceRadiusKm,
    }));

  const people = [
    {
      icon: Users,
      label: detail.members,
      count: footprint.members,
      href: `/admin/members${chapterQuery}`,
    },
    {
      icon: Armchair,
      label: detail.passengers,
      count: footprint.passengers,
      href: `/admin/passengers${chapterQuery}`,
    },
    {
      icon: Inbox,
      label: detail.pending,
      count: footprint.pendingApplications,
      href: `/admin/members${chapterQuery}`,
    },
  ];

  const compact = "h-9 min-h-9 justify-start text-2sm";

  const properties = (
    <aside className="grid content-start gap-6 text-2sm lg:col-start-2 lg:row-span-2 lg:row-start-1">
      <section className="grid gap-3">
        <h2 className="font-medium">{detail.joinLink}</h2>
        <div className="w-fit rounded-(--r-card) bg-mint-tint p-3">
          <QrCode
            value={url}
            className="size-28"
          />
        </div>
        <p className="font-mono break-all text-ink-soft">{url}</p>
        <div className="grid gap-1">
          <CopyButton
            value={url}
            label={dict.admin.settings.joinLink.copy}
            copiedLabel={dict.admin.settings.joinLink.copied}
            className={compact}
          />
          <Button
            asChild
            variant="outline"
            className={compact}
          >
            <a
              href={`/join/${chapter.slug}/poster?print=1`}
              target="_blank"
              rel="noopener"
            >
              <Printer aria-hidden />
              {dict.admin.settings.joinLink.poster}
            </a>
          </Button>
          <DownloadQrButton
            value={url}
            fileName={`${chapter.slug}-qr.png`}
            label={dict.admin.settings.joinLink.downloadPng}
            className={compact}
          />
        </div>
      </section>

      <section className="grid gap-2">
        <h2 className="font-medium">{detail.people}</h2>
        <ul className="grid">
          {people.map(({ icon: Icon, label, count, href }) => (
            <li key={label}>
              <Link
                href={href}
                className="-mx-2 flex min-h-9 items-center gap-2 rounded-(--r-card) px-2 transition-colors hover:bg-canvas-deep"
              >
                <Icon
                  aria-hidden
                  className="size-4 shrink-0 text-ink-soft"
                />
                <span className="min-w-0 flex-1 truncate">{label}</span>
                <span className="tabular-nums">{count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-ink-soft">{detail.slug}</span>
          <span className="font-mono break-all">{chapter.slug}</span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-ink-soft">{detail.country}</span>
          <span>{country?.name ?? ""}</span>
        </div>
        <p className="text-ink-soft">
          {fill(detail.started, {
            date: formatDate(chapter.createdAt, notation),
          })}
        </p>
      </section>

      <div className="grid gap-1">
        <DeleteChapterDialog
          chapterId={chapter.id}
          name={chapter.name}
          footprint={footprint}
          backHref={backHref}
          labels={{ ...detail.delete, errors: strings.errors }}
          cancel={strings.cancel}
        />
      </div>
    </aside>
  );

  const history = (
    <section className="grid gap-4 border-t border-line pt-6">
      <h2 className="text-base font-medium">{detail.history}</h2>
      <ActivityFeed
        events={events}
        viewerId={session.user.id}
        labels={dict.admin.history}
        empty={detail.historyEmpty}
        notation={notation}
        words={language}
      />
    </section>
  );

  return (
    <>
      <Link
        href={backHref}
        className="inline-flex min-h-11 w-fit items-center gap-2 text-2sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft
          aria-hidden
          className="size-4"
        />
        {detail.back}
      </Link>

      <ChapterEditor
        id={chapter.id}
        name={chapter.name}
        city={chapter.city}
        careHomeName={chapter.careHomeName}
        address={chapter.address}
        description={chapter.description}
        logo={chapter.logo}
        countryName={country?.name ?? ""}
        coords={{ lat: chapter.latitude, lng: chapter.longitude }}
        radiusKm={chapter.serviceRadiusKm}
        others={others}
        mapEnabled={Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN)}
        language={language}
        notation={notation}
        labels={{
          field: {
            edit: detail.edit,
            saved: strings.saved,
            undo: detail.undo,
            undone: detail.undone,
            invalid: detail.invalidUrl,
            errors: strings.errors,
          },
          status: { saving: detail.saving, saved: detail.saved },
          fields: {
            name: strings.fields.name,
            careHomeName: strings.fields.careHomeName,
            description: strings.fields.description,
            logo: strings.fields.logo,
          },
          placeholders: detail.placeholders,
          location: detail.location,
          about: detail.about,
          address: strings.create.address,
          map: { label: strings.mapLabel, unavailable: strings.mapUnavailable },
          radius: detail.radius,
          radiusValue: strings.create.radiusValue,
          overlap: strings.create.overlap,
        }}
        history={history}
        properties={properties}
      />
    </>
  );
}
