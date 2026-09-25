import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Info } from "lucide-react";
import { chapters } from "@/features/chapters";
import { fleet } from "@/features/fleet";
import { TrishawTimeline } from "@/features/rides/components/trishaw-timeline";
import { DamageReportDrawer } from "@/features/fleet/components/damage-report-drawer";
import { damageStateOf } from "@/features/fleet/components/trishaw-badges";
import { TrishawNoteComposer } from "@/features/fleet/components/trishaw-note-composer";
import { allowsAdmin } from "@/lib/access";
import { requireAdminOf } from "@/lib/auth-guards";
import { formatDate, formatPlural, wordsLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { fill } from "@/lib/utils";
import { trishawHistory } from "@/use-cases/trishaw-history";
import { BackLink, DetailSection } from "../../../_components/detail-page";
import { SidePanel } from "../../../_components/side-panel";
import { readActiveScope, type AdminSearchParams } from "../../../active-scope";
import { readCalendarWeek } from "../../../calendar-week";
import { WeekSwitcher } from "../../../_components/week-switcher";
import { HistoryMore, historyShown } from "../../../_components/history-more";
import {
  locationOption,
  manageableLocations,
  typeOptions,
} from "../../_components/options";
import { TrishawEditor } from "./trishaw-editor";
import { TrishawHistory } from "./trishaw-history";

export async function TrishawBody({
  params,
  searchParams,
}: {
  params: Promise<{ trishawId: string }>;
  searchParams: Promise<AdminSearchParams>;
}) {
  const [{ session, scopeQuery, chapterIds }, { trishawId }, query] =
    await Promise.all([
      readActiveScope(searchParams, "bikes"),
      params,
      searchParams,
    ]);

  const trishaw = await fleet.getTrishaw(trishawId);
  if (!trishaw) notFound();
  await requireAdminOf(await fleet.trishawReaders(trishawId));

  const canManage = allowsAdmin(
    session.access,
    await fleet.trishawAuthority(trishawId),
  );

  const site = trishaw.storageLocation;
  const reaching = fleet.chapterIdsReaching(trishaw);
  const countryIds = [
    ...new Set(
      [
        site.countryId,
        site.ownerChapter?.countryId,
        ...site.chapters.map((link) => link.chapter.countryId),
      ].filter((id): id is string => Boolean(id)),
    ),
  ];
  const nearby = [...new Set([...chapterIds, ...reaching])];

  const [items, damages, type, types, locations, dict, language, head, zones] =
    await Promise.all([
      trishawHistory(trishawId),
      fleet.listDamages(trishawId),
      trishaw.typeId ? fleet.getType(trishaw.typeId) : null,
      canManage
        ? fleet.listTypes({ countryIds, chapterIds: reaching })
        : Promise.resolve([]),
      canManage
        ? fleet
            .listLocationsForChapters(nearby)
            .then((rows) => manageableLocations(session.access, rows))
        : Promise.resolve([]),
      getDictionary(),
      getLocale(),
      headers(),
      chapters.getChapterTimeZones(reaching),
    ]);

  const calendar = await readCalendarWeek({
    week: query.week,
    zones,
    head,
    chapterIds: reaching,
  });
  const { locale, now, anchor, weekStartsOn } = calendar;
  const weekRides = calendar.rides.filter((ride) =>
    ride.trishaws.some((entry) => entry.trishaw.id === trishaw.id),
  );

  const shown = historyShown(query);

  const words = wordsLocale(language);
  const common = dict.fleet.common;
  const strings = dict.fleet.trishaws;
  const detail = strings.detail;
  const backHref = `/admin/trishaws${scopeQuery}`;

  const open = damages.filter((damage) => damage.clearedAt === null);
  const damageState = damageStateOf(open);

  const typeChoices = typeOptions(types, dict, language);
  if (type && !typeChoices.some((choice) => choice.id === type.id))
    typeChoices.unshift(...typeOptions([type], dict, language));

  const locationChoices = locations.map(locationOption);
  if (canManage && !locationChoices.some((choice) => choice.id === site.id))
    locationChoices.unshift(
      locationOption((await fleet.getLocation(site.id)) ?? site),
    );

  const errors = common.errors;

  const panels = (
    <>
      <SidePanel title={detail.damage}>
        {open.length > 0 ? (
          <ul className="grid gap-2">
            {open.map((damage) => (
              <li
                key={damage.id}
                className="grid gap-1 text-2sm"
              >
                <span className="line-clamp-2">{damage.description}</span>
                <span className="text-xs text-ink-soft">
                  {[
                    damage.grounding ? common.grounded : null,
                    formatDate(damage.reportedAt, locale),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-2sm text-ink-soft">{detail.noDamage}</p>
        )}
        <DamageReportDrawer
          trishawId={trishaw.id}
          trishawName={trishaw.name}
          labels={{
            ...common.damage,
            open: common.damage.report,
            title: strings.report.title,
            body: fill(strings.report.body, { name: trishaw.name }),
            gallery: { ...common.gallery, errors: common.errors },
            errors,
          }}
        />
      </SidePanel>

      {canManage ? null : (
        <p className="flex gap-2 rounded-xl bg-mint-tint px-4 py-3 text-2sm">
          <Info
            aria-hidden
            className="mt-0.5 size-4 shrink-0"
          />
          {detail.readOnly}
        </p>
      )}
    </>
  );

  return (
    <>
      <BackLink
        href={backHref}
        label={detail.back}
      />

      <TrishawEditor
        trishaw={{
          id: trishaw.id,
          name: trishaw.name,
          status: trishaw.status,
          note: trishaw.note,
          typeId: trishaw.typeId,
          typeName: trishaw.type?.name ?? null,
          photoFileId: trishaw.photoFileId,
          photoFileIds: trishaw.photos.map((photo) => photo.fileId),
          frameNumber: trishaw.frameNumber,
          typePhotoFileId: trishaw.type?.photoFileId ?? null,
          locationId: site.id,
          locationName: site.name,
          isPool: site.kind === "pool",
        }}
        damage={{
          state: damageState,
          count: open.length,
          grounding: open
            .filter((damage) => damage.grounding)
            .map(({ id, description }) => ({ id, description })),
        }}
        model={
          type
            ? {
                seats: formatPlural(type.seats, common.seats, words),
                wheelchair: type.wheelchairAccessible,
                manualFileId: type.manualFileId,
                description: type.description,
              }
            : null
        }
        canManage={canManage}
        types={typeChoices}
        locations={locationChoices}
        backHref={backHref}
        language={language}
        labels={{
          ...detail,
          field: {
            edit: detail.edit,
            saved: detail.saved,
            undo: detail.undo,
            undone: detail.undone,
            invalid: detail.invalid,
            errors,
          },
          status: { saving: detail.saving, saved: detail.savedAt },
          statusLabel: detail.status,
          manualOpen: common.manual.open,
          noModel: strings.noModel,
          pool: common.pool,
          since: fill(detail.since, {
            date: formatDate(trishaw.createdAt, locale),
          }),
          statuses: common.statuses,
          grounded: common.grounded,
          damaged: common.damaged,
          typePicker: {
            placeholder: strings.picker.modelPlaceholder,
            empty: strings.picker.modelEmpty,
            wheelchair: common.wheelchair,
          },
          locationPicker: {
            placeholder: strings.picker.locationPlaceholder,
            empty: strings.picker.locationEmpty,
            pool: common.pool,
          },
          gallery: { ...common.gallery, errors },
          delete: { ...strings.delete, errors },
          clear: { ...common.damage, cancel: strings.clear.cancel, errors },
          cancel: strings.delete.cancel,
        }}
        panels={panels}
      >
        <DetailSection
          title={detail.calendar}
          description={detail.calendarHint}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            {calendar.label ? (
              <p className="text-2sm text-ink-soft">{calendar.label}</p>
            ) : (
              <span />
            )}
            <WeekSwitcher
              pathname={`/admin/trishaws/${trishaw.id}`}
              scopeQuery={scopeQuery}
              anchor={anchor}
              timeZone={calendar.timeZone}
              strings={dict.calendar}
              locale={locale}
              now={now}
            />
          </div>
          <div className="-mx-4 md:mx-0">
            <TrishawTimeline
              trishaws={[trishaw]}
              rides={weekRides}
              anchor={anchor}
              timeZone={calendar.timeZone}
              weekStartsOn={weekStartsOn}
              strings={dict.calendar}
              locale={locale}
              now={now}
            />
          </div>
        </DetailSection>

        <DetailSection title={detail.history}>
          <TrishawNoteComposer
            trishawId={trishaw.id}
            labels={{ ...strings.composer, errors }}
          />
          <TrishawHistory
            items={items.slice(0, shown)}
            viewerId={session.user.id}
            canManage={canManage}
            scopeQuery={scopeQuery}
            labels={strings.history}
            common={common}
            rideStatuses={dict.calendar.statuses}
            clear={{ ...common.damage, cancel: strings.clear.cancel, errors }}
            empty={detail.historyEmpty}
            notation={locale}
            words={language}
          />
          <HistoryMore
            pathname={`/admin/trishaws/${trishaw.id}`}
            query={query}
            shown={shown}
            total={items.length}
            label={dict.admin.history.showMore}
          />
        </DetailSection>
      </TrishawEditor>
    </>
  );
}
