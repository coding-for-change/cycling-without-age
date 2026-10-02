import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Armchair, Inbox, Users } from "lucide-react";
import { QrCode } from "@/components/qr-code";
import { BackLink } from "../../../_components/detail-page";
import {
  PropertyList,
  PropertyRow,
  PropertyValue,
} from "../../../_components/properties";
import { historyShown } from "../../../_components/history-more";
import {
  HistorySection,
  historyTake,
} from "../../../_components/history-section";
import { SidePanel } from "../../../_components/side-panel";
import { deletionConsequences } from "../../../_components/deletion-consequences";
import { JoinLinkActions } from "../../../_components/join-link-actions";
import { activity } from "@/lib/activity";
import { chapters } from "@/features/chapters";
import { fleet } from "@/features/fleet";
import { joinUrl } from "@/lib/app-url";
import { formatDate, resolveLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { supportedTimeZones } from "@/lib/time-zone";
import { readActiveScope } from "../../../active-scope";
import { ChapterEditor } from "./chapter-editor";
import { DeleteChapterDialog } from "./delete-chapter-dialog";
import type { AdminSearchParams } from "../../../active-scope";

export async function ChapterBody({
  params,
  searchParams,
}: {
  params: Promise<{ chapterId: string }>;
  searchParams: Promise<AdminSearchParams>;
}) {
  const [{ session, scopeQuery, chapters: inScope }, { chapterId }, query] =
    await Promise.all([
      readActiveScope(searchParams, "chapters"),
      params,
      searchParams,
    ]);
  const shown = historyShown(query);
  if (!inScope.some((entry) => entry.id === chapterId)) notFound();

  const [
    chapter,
    footprint,
    fleetFootprint,
    events,
    all,
    dict,
    language,
    head,
  ] = await Promise.all([
    chapters.getChapter(chapterId),
    chapters.getChapterFootprint(chapterId),
    fleet.getChapterFleetFootprint(chapterId),
    activity.listForChapter(chapterId, historyTake(shown)),
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

  const compact = "h-8 min-h-8 justify-start text-2sm";

  const properties = (
    <>
      <SidePanel title={detail.properties}>
        <PropertyList>
          <PropertyRow label={detail.slug}>
            <PropertyValue className="font-mono">{chapter.slug}</PropertyValue>
          </PropertyRow>
          <PropertyRow label={detail.country}>
            <PropertyValue>{country?.name ?? "–"}</PropertyValue>
          </PropertyRow>
          <PropertyRow label={detail.createdLabel}>
            <PropertyValue>
              {formatDate(chapter.createdAt, notation)}
            </PropertyValue>
          </PropertyRow>
        </PropertyList>
      </SidePanel>

      <SidePanel title={detail.people}>
        <ul className="grid gap-0.5">
          {people.map(({ icon: Icon, label, count, href }) => (
            <li key={label}>
              <Link
                href={href}
                className="-mx-2 flex h-8 items-center gap-2 rounded-md px-2 text-2sm transition-colors hover:bg-canvas-deeper"
              >
                <Icon
                  aria-hidden
                  className="size-3.5 shrink-0 text-ink-soft"
                />
                <span className="min-w-0 flex-1 truncate">{label}</span>
                <span className="tabular-nums text-ink-soft">{count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </SidePanel>

      <SidePanel title={detail.joinLink}>
        <div className="w-fit rounded-(--r-card) bg-mint-tint p-3">
          <QrCode
            value={url}
            className="size-24"
          />
        </div>
        <p className="font-mono text-xs break-all text-ink-soft">{url}</p>
        <JoinLinkActions
          url={url}
          slug={chapter.slug}
          labels={dict.admin.settings.joinLink}
          className="grid gap-1"
          buttonClassName={compact}
        />
      </SidePanel>

      <div className="grid gap-1">
        <DeleteChapterDialog
          chapterId={chapter.id}
          name={chapter.name}
          consequences={deletionConsequences(
            {
              members: footprint.members,
              passengers: footprint.passengers,
              pending: footprint.pendingApplications,
              rides: footprint.rides,
              ...fleetFootprint,
            },
            dict.admin.deletion,
            language,
          )}
          backHref={backHref}
          labels={{
            ...detail.delete,
            consequences: dict.admin.deletion.consequences,
            errors: strings.errors,
          }}
          cancel={strings.cancel}
          locale={language}
        />
      </div>
    </>
  );

  const history = (
    <HistorySection
      title={detail.history}
      pathname={`/admin/chapters/${chapterId}`}
      query={query}
      shown={shown}
      events={events}
      viewerId={session.user.id}
      labels={dict.admin.history}
      empty={detail.historyEmpty}
      notation={notation}
      words={language}
    />
  );

  return (
    <>
      <BackLink
        href={backHref}
        label={detail.back}
      />

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
        timeZone={chapter.timeZone}
        zones={supportedTimeZones()}
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
          timeZone: detail.timeZone,
          timeZoneHint: detail.timeZoneHint,
        }}
        history={history}
        properties={properties}
      />
    </>
  );
}
