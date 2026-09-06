import { Suspense } from "react";
import { headers } from "next/headers";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { chapters as chapterFeature } from "@/features/chapters";
import { passengers } from "@/features/passengers";
import { avatarSeed, avatarSvg } from "@/lib/avatar";
import { formatDate, resolveLocale } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import {
  COUNTRIES,
  defaultCountryFor,
  isPhoneTempEmail,
  type CountryCode,
} from "@/lib/identity";
import {
  AdminPageFallback,
  AdminPageHeader,
  AdminPageShell,
} from "../_components/admin-page";
import { ICONS } from "../_components/icons";
import { readActiveScope } from "../active-scope";
import { AddPassengerDrawer } from "./_components/add-passenger-drawer";
import {
  PassengersTable,
  type PassengerRow,
} from "./_components/passengers-table";

type AdminSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function PassengersPage({
  searchParams,
}: {
  searchParams: AdminSearchParams;
}) {
  return (
    <AdminPageShell>
      <Suspense fallback={<AdminPageFallback />}>
        <Passengers searchParams={searchParams} />
      </Suspense>
    </AdminPageShell>
  );
}

async function Passengers({
  searchParams,
}: {
  searchParams: AdminSearchParams;
}) {
  const { active, chapters, chapterIds } = await readActiveScope(searchParams);

  const [list, dict, head, country] = await Promise.all([
    passengers.listPassengersOfChapters(chapterIds),
    getDictionary(),
    headers(),
    active.kind === "chapter"
      ? chapterFeature.getCountry(active.chapter.countryId)
      : null,
  ]);

  const notation = resolveLocale(head.get("accept-language"));
  const code = country?.code.toUpperCase();
  const dialling =
    code && COUNTRIES.includes(code as CountryCode)
      ? (code as CountryCode)
      : defaultCountryFor(notation);

  const scopeQuery =
    active.kind === "chapter"
      ? `?chapter=${encodeURIComponent(active.chapter.slug)}`
      : active.kind === "country"
        ? `?country=${encodeURIComponent(active.country.code)}`
        : "";

  const rows: PassengerRow[] = list.map((passenger) => ({
    id: passenger.id,
    userId: passenger.userId,
    firstName: passenger.firstName,
    lastName: passenger.lastName,
    email:
      passenger.user && !isPhoneTempEmail(passenger.user.email)
        ? passenger.user.email
        : null,
    phone: passenger.user?.phoneNumber ?? null,
    avatar: avatarSvg(
      passenger.user ? avatarSeed(passenger.user.email) : passenger.id,
    ),
    born: formatDate(passenger.birthDate, notation),
    bornIso: passenger.birthDate.toISOString(),
    chapterName: passenger.chapter.name,
    joined: formatDate(passenger.createdAt, notation),
    joinedIso: passenger.createdAt.toISOString(),
  }));

  const PassengersIcon = ICONS.passengers;

  return (
    <>
      <AdminPageHeader title={dict.admin.pages.passengers.title}>
        {active.kind === "chapter" ? (
          <AddPassengerDrawer
            chapterId={active.chapter.id}
            country={dialling}
            scopeQuery={scopeQuery}
            labels={dict.admin.passengers.add}
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

      {rows.length > 0 ? (
        <PassengersTable
          rows={rows}
          showChapter={chapters.length > 1}
          scopeQuery={scopeQuery}
          labels={dict.admin.passengers.columns}
          phoneColumn={dict.admin.members.columns.phone}
          table={dict.admin.table}
        />
      ) : (
        <Empty className="rounded-2xl border border-line">
          <EmptyHeader>
            <EmptyMedia
              variant="icon"
              className="bg-mint-tint text-ink"
            >
              <PassengersIcon aria-hidden />
            </EmptyMedia>
            <EmptyDescription className="text-ink-soft">
              {dict.admin.passengers.empty}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </>
  );
}
