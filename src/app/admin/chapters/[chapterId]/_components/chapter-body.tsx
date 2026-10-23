import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Armchair, Inbox, Users } from "lucide-react";
import { QrCode } from "@/components/qr-code";
import { BackLink } from "../../../_components/detail-page";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { PROPERTY_BUTTON } from "../../../_components/properties";
import { ActivityFeed } from "../../../_components/activity-feed";
import { withHandOverNames } from "../../../_components/hand-over-names";
import { fieldLabels } from "../../../_components/field-labels";
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
import { resolveLocale } from "@/lib/format";
import { formatInstantDate } from "@/lib/instant-date";
import { getDictionary, getLocale } from "@/lib/i18n";
import { supportedTimeZones } from "@/lib/time-zone";
import { isCountryAdmin } from "@/lib/access";
import { readActiveScope } from "../../../active-scope";
import { canReach } from "../../../nav";
import { ChapterEditor } from "./chapter-editor";
import { ChapterSettings, ChapterSettingsSkeleton } from "./chapter-settings";
import { deleteChapterAction } from "../../actions";
import type { AdminSearchParams } from "../../../active-scope";

export async function ChapterBody({
  params,
  searchParams,
}: {
  params: Promise<{ chapterId: string }>;
  searchParams: Promise<AdminSearchParams>;
}) {
  const [{ session, scope, scopeQuery }, { chapterId }, query] =
    await Promise.all([readActiveScope(searchParams), params, searchParams]);
  const shown = historyShown(query);
  if (!scope.chapters.some((entry) => entry.id === chapterId)) notFound();

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

  const canManage = isCountryAdmin(session.access, chapter.countryId);
  const backHref = canReach(scope, "chapters")
    ? `/admin/chapters${scopeQuery}`
    : null;
  const url = joinUrl(chapter.slug);
  const chapterQuery = `?chapter=${encodeURIComponent(chapter.slug)}`;

  const visible = new Set(scope.chapters.map((entry) => entry.id));
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

  const panels = (
    <>
      <SidePanel title={detail.joinLink}>
        <div className="w-fit rounded-(--r-card) bg-mint-tint p-3">
          <QrCode
            value={url}
            className="size-24"
          />
        </div>
        <p className="text-2sm text-ink-soft">
          {dict.admin.settings.joinLink.body}
        </p>
        <p className="font-mono text-xs break-all text-ink-soft">{url}</p>
        <JoinLinkActions
          url={url}
          slug={chapter.slug}
          labels={dict.admin.settings.joinLink}
          className="grid gap-1"
          buttonClassName={PROPERTY_BUTTON}
        />
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
    </>
  );

  return (
    <>
      {backHref ? (
        <BackLink
          href={backHref}
          label={detail.back}
        />
      ) : null}

      <ChapterEditor
        id={chapter.id}
        name={chapter.name}
        slug={chapter.slug}
        created={formatInstantDate(
          chapter.createdAt,
          notation,
          chapter.timeZone,
        )}
        editable={canManage}
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
          field: fieldLabels(
            { ...detail, saved: strings.saved, invalid: detail.invalidUrl },
            strings.errors,
          ),
          status: { saving: detail.saving, saved: detail.saved },
          fields: {
            name: strings.fields.name,
            careHomeName: strings.fields.careHomeName,
            description: strings.fields.description,
            logo: strings.fields.logo,
          },
          placeholders: detail.placeholders,
          properties: detail.properties,
          slug: detail.slug,
          country: detail.country,
          createdLabel: detail.createdLabel,
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
        trash={
          canManage ? (
            <ConfirmDeleteDialog
              key="trash"
              variant="icon"
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
              labels={{
                ...detail.delete,
                consequences: dict.admin.deletion.consequences,
                errors: strings.errors,
              }}
              cancel={strings.cancel}
              locale={language}
              action={deleteChapterAction}
              input={chapter.id}
              redirectTo={backHref ?? "/admin"}
            />
          ) : null
        }
        panels={panels}
      >
        <Suspense fallback={<ChapterSettingsSkeleton />}>
          <ChapterSettings
            chapterId={chapter.id}
            dict={dict}
            language={language}
          />
        </Suspense>

        <HistorySection
          title={detail.history}
          pathname={`/admin/chapters/${chapterId}`}
          query={query}
          shown={shown}
          total={events.length}
          showMoreLabel={dict.admin.history.showMore}
        >
          <ActivityFeed
            events={await withHandOverNames(events.slice(0, shown))}
            viewerId={session.user.id}
            labels={{
              ...dict.admin.history,
              riderHandedOver: dict.admin.passengers.detail.handedOver,
            }}
            empty={detail.historyEmpty}
            notation={notation}
            words={language}
            timeZone={chapter.timeZone}
          />
        </HistorySection>
      </ChapterEditor>
    </>
  );
}
