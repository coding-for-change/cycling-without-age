import { Suspense } from "react";
import { headers } from "next/headers";
import { EmptyState } from "@/components/empty-state";
import { chapters as chapterFeature } from "@/features/chapters";
import { passengers } from "@/features/passengers";
import {
  personProfiles,
  photoUrl,
  subjectSlug,
  type SubjectRef,
} from "@/features/person-profiles";
import { avatarSeed, avatarSvg } from "@/lib/avatar";
import { formatDate, formatNumber, resolveLocale } from "@/lib/format";
import { formatMessage } from "@/lib/i18n/format";
import { Badge } from "@/components/ui/badge";
import { getDictionary, getLocale } from "@/lib/i18n";
import {
  COUNTRIES,
  defaultCountryFor,
  isPhoneTempEmail,
  type CountryCode,
} from "@/lib/identity";
import { AdminPageHeader, AdminPageShell } from "../_components/admin-page";
import { ICONS } from "@/components/icons";
import { readActiveScope, type AdminSearchParams } from "../active-scope";
import { AddPassengerDrawer } from "./_components/add-passenger-drawer";
import {
  PassengersTable,
  type PassengerRow,
} from "./_components/passengers-table";
import { PageFallback } from "@/components/page-fallback";
import { pickupLabel } from "./_components/pickup-label";

export default function PassengersPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  return (
    <AdminPageShell>
      <Suspense fallback={<PageFallback />}>
        <Passengers searchParams={searchParams} />
      </Suspense>
    </AdminPageShell>
  );
}

async function Passengers({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const { active, scopeQuery, chapters, chapterIds } =
    await readActiveScope(searchParams);

  const [list, waiting, dict, head, country, locale] = await Promise.all([
    passengers.listPassengersOfChapters(chapterIds),
    passengers.listWaitingRiders(chapterIds),
    getDictionary(),
    headers(),
    active.kind === "chapter"
      ? chapterFeature.getCountry(active.chapter.countryId)
      : null,
    getLocale(),
  ]);

  const subjectOf = (passenger: (typeof list)[number]): SubjectRef =>
    passenger.userId
      ? { kind: "user", id: passenger.userId }
      : { kind: "passenger", id: passenger.id };
  const photos = await personProfiles.photoFileIdsOf(list.map(subjectOf));

  const notation = resolveLocale(head.get("accept-language"));
  const code = country?.code.toUpperCase();
  const dialling =
    code && COUNTRIES.includes(code as CountryCode)
      ? (code as CountryCode)
      : defaultCountryFor(notation);

  const emailOf = (email: string | undefined) =>
    email && !isPhoneTempEmail(email) ? email : null;

  const rows: PassengerRow[] = list.map((passenger) => {
    const managed = passenger.managedByUserId !== passenger.userId;
    const email = emailOf(passenger.user?.email);
    const phone = passenger.user?.phoneNumber ?? null;
    const caretaker = managed
      ? {
          id: passenger.managedByUserId,
          name: passenger.managedBy.name || passenger.managedBy.email,
          contact:
            email || phone
              ? null
              : (emailOf(passenger.managedBy.email) ??
                passenger.managedBy.phoneNumber),
        }
      : null;
    return {
      id: passenger.id,
      userId: passenger.userId,
      firstName: passenger.firstName,
      lastName: passenger.lastName,
      email,
      phone,
      caretaker,
      pickup: pickupLabel(passenger, dict.riders.pickup.careHome),
      avatar: avatarSvg(
        passenger.user
          ? avatarSeed(passenger.user.email)
          : `passenger:${passenger.id}`,
      ),
      photoUrl: photoUrl(photos.get(subjectSlug(subjectOf(passenger))) ?? null),
      born: formatDate(passenger.birthDate, notation),
      bornIso: passenger.birthDate.toISOString(),
      chapterName: passenger.chapter.name,
      joined: formatDate(passenger.createdAt, notation),
      joinedIso: passenger.createdAt.toISOString(),
    };
  });

  const PassengersIcon = ICONS.passengers;

  return (
    <>
      <AdminPageHeader title={dict.admin.pages.passengers.title}>
        {active.kind === "chapter" ? (
          <AddPassengerDrawer
            chapterId={active.chapter.id}
            country={dialling}
            labels={dict.admin.passengers.add}
            relationships={dict.riders.relationship.options}
            pickup={{
              ...dict.riders.pickup,
              missing: dict.admin.passengers.add.pickupMissing,
              address: dict.riders.address,
            }}
            locale={locale}
            person={{
              firstName: dict.profile.firstName,
              lastName: dict.profile.lastName,
              birthDate: dict.profile.birthDate,
              gender: dict.profile.gender,
              genders: dict.profile.genders,
            }}
          />
        ) : (
          <p className="text-sm text-ink-soft">
            {dict.admin.passengers.pickChapter}
          </p>
        )}
      </AdminPageHeader>

      {waiting.length > 0 ? (
        <section className="mb-5 grid gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-medium">
              {dict.admin.passengers.waiting.title}
            </h2>
            <Badge className="bg-mint font-normal text-ink">
              {formatNumber(waiting.length, notation)}
            </Badge>
          </div>
          <ul className="grid divide-y divide-line rounded-xl border border-line">
            {waiting.map((rider) => (
              <li
                key={rider.id}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-4 py-3 text-2sm"
              >
                <span className="font-medium">
                  {`${rider.firstName} ${rider.lastName}`.trim()}
                </span>
                <span className="text-ink-soft">
                  {formatMessage(
                    dict.admin.passengers.waiting.row,
                    {
                      caretaker: rider.helperName.trim(),
                      date: formatDate(rider.createdAt, notation),
                    },
                    locale,
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {rows.length > 0 ? (
        <PassengersTable
          rows={rows}
          showChapter={chapters.length > 1}
          scopeQuery={scopeQuery}
          labels={dict.admin.passengers.columns}
          phoneColumn={dict.admin.members.columns.phone}
          table={dict.admin.table}
          locale={locale}
        />
      ) : (
        <EmptyState icon={PassengersIcon}>
          {dict.admin.passengers.empty}
        </EmptyState>
      )}
    </>
  );
}
