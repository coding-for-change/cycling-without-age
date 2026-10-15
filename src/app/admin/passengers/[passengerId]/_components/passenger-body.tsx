import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { HeartHandshake } from "lucide-react";
import { chapters as chapterFeature } from "@/features/chapters";
import { membership } from "@/features/membership";
import { PersonAvatar } from "@/components/person-avatar";
import { passengers } from "@/features/passengers";
import { personProfiles, photoUrl } from "@/features/person-profiles";
import { ProfileView } from "@/features/person-profiles/components/profile-view";
import { profile } from "@/features/profile";
import { activity } from "@/lib/activity";
import { avatarSeed, avatarSvg } from "@/lib/avatar";
import {
  COUNTRIES,
  defaultCountryFor,
  isPhoneTempEmail,
  type CountryCode,
} from "@/lib/identity";
import { resolveLocale, toIsoDateUtc } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import {
  accessPerson,
  canRemoveRider,
  seesHealthDetails,
} from "@/use-cases/person-access";
import { ActivityFeed } from "../../../_components/activity-feed";
import { deletionConsequences } from "../../../_components/deletion-consequences";
import {
  BackLink,
  DETAIL_MEDIA,
  DETAIL_TITLE,
  DetailHeader,
  DetailLayout,
  DetailMeta,
  DetailSection,
} from "../../../_components/detail-page";
import { SidePanel } from "../../../_components/side-panel";
import { readActiveScope, type AdminSearchParams } from "../../../active-scope";
import { HandOverRider } from "./hand-over-rider";
import { RiderProperties } from "./rider-properties";

export async function PassengerBody({
  params,
  searchParams,
}: {
  params: Promise<{ passengerId: string }>;
  searchParams: Promise<AdminSearchParams>;
}) {
  const [{ session, scopeQuery, chapters, chapterIds }, { passengerId }] =
    await Promise.all([readActiveScope(searchParams), params]);

  const rider = await passengers.getPassenger(passengerId);
  if (!rider || !chapterIds.includes(rider.chapterId)) notFound();
  if (rider.userId) redirect(`/admin/members/${rider.userId}${scopeQuery}`);

  const found = await accessPerson(session, {
    kind: "passenger",
    id: rider.id,
  });
  if (!found || (found.relation !== "admin" && found.relation !== "manager"))
    notFound();
  const { target, relation } = found;
  const removable = canRemoveRider(relation, target);

  const admin = relation === "admin";
  const home = chapters.find((chapter) => chapter.id === rider.chapterId);
  const [
    own,
    manager,
    dict,
    language,
    head,
    bookings,
    members,
    handOvers,
    country,
  ] = await Promise.all([
    personProfiles.getProfile(target.subject),
    rider.managedByUserId ? profile.getProfile(rider.managedByUserId) : null,
    getDictionary(),
    getLocale(),
    headers(),
    removable ? passengers.countRiderBookings(rider.id) : 0,
    admin ? membership.listMembersOfChapters([rider.chapterId]) : [],
    admin ? activity.listHandOversOfPassenger(rider.id, 50) : [],
    admin && home ? chapterFeature.getCountry(home.countryId) : null,
  ]);
  const strings = dict.admin.passengers.detail;
  const notation = resolveLocale(head.get("accept-language"));
  const code = country?.code.toUpperCase();
  const dialling =
    code && COUNTRIES.includes(code as CountryCode)
      ? (code as CountryCode)
      : defaultCountryFor(notation);
  const candidates = members
    .filter((member) => member.userId !== rider.managedByUserId)
    .map((member) => ({
      id: member.userId,
      name: member.user.name || member.user.email,
      avatar: avatarSvg(avatarSeed(member.user.email)),
      hint: isPhoneTempEmail(member.user.email)
        ? (member.user.phoneNumber ?? undefined)
        : member.user.email,
    }));
  const chapterName = chapters.find(
    (chapter) => chapter.id === rider.chapterId,
  )?.name;
  const managerHref = rider.managedByUserId
    ? `/admin/members/${rider.managedByUserId}${scopeQuery}`
    : null;

  return (
    <>
      <BackLink
        href={`/admin/passengers${scopeQuery}`}
        label={strings.back}
      />

      <DetailLayout
        header={
          <DetailHeader
            media={
              <PersonAvatar
                svg={avatarSvg(target.avatarSeed, true)}
                photoUrl={photoUrl(own.photoFileId)}
                className={cn(DETAIL_MEDIA, "rounded-full")}
              />
            }
            title={<span className={DETAIL_TITLE}>{target.name}</span>}
          >
            {manager && managerHref ? (
              <DetailMeta>
                <Link
                  href={managerHref}
                  className="inline-flex items-center gap-2 rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <HeartHandshake
                    aria-hidden
                    className="size-4"
                  />
                  {formatMessage(
                    strings.managedBy,
                    { name: manager.name || manager.email },
                    language,
                  )}
                </Link>
              </DetailMeta>
            ) : null}
          </DetailHeader>
        }
        sidebar={
          <SidePanel title={strings.properties}>
            <RiderProperties
              rider={{
                id: rider.id,
                name: target.name,
                birthDate: toIsoDateUtc(rider.birthDate),
                gender: rider.gender,
                chapterName: chapterName ?? "",
                pickup: { residence: rider.residence, address: rider.address },
              }}
              removable={removable}
              consequences={deletionConsequences(
                { riders: bookings },
                dict.admin.deletion,
                language,
              )}
              strings={{
                chapter: strings.chapter,
                born: strings.born,
                gender: strings.gender,
                genders: dict.profile.genders,
                pickup: strings.pickup,
                careHome: dict.riders.pickup.careHome,
                home: dict.riders.pickup.home,
                remove: {
                  ...strings.delete,
                  consequences: dict.admin.deletion.consequences,
                },
                cancel: dict.admin.chapters.cancel,
              }}
              language={language}
              notation={notation}
              backHref={`/admin/passengers${scopeQuery}`}
            >
              {admin ? (
                <HandOverRider
                  passengerId={rider.id}
                  rider={target.name}
                  chapter={chapterName ?? ""}
                  members={candidates}
                  country={dialling}
                  strings={dict.admin.passengers.handOver}
                  errors={{
                    ...dict.common.errors,
                    ...dict.admin.passengers.handOver.errors,
                  }}
                  language={language}
                />
              ) : null}
            </RiderProperties>
          </SidePanel>
        }
      >
        <DetailSection title={strings.profile}>
          <ProfileView
            name={target.name}
            avatar=""
            profile={personProfiles.toPublicProfile(own, target.birthDate)}
            showAccessibility={seesHealthDetails(session, relation, target)}
            strings={dict.personProfile}
            language={language}
            hero={false}
          />
        </DetailSection>
        {admin ? (
          <DetailSection title={strings.history}>
            <ActivityFeed
              events={handOvers}
              viewerId={session.user.id}
              labels={{
                ...dict.admin.history,
                riderHandedOver: strings.handedOver,
              }}
              empty={strings.historyEmpty}
              notation={notation}
              words={language}
            />
          </DetailSection>
        ) : null}
      </DetailLayout>
    </>
  );
}
