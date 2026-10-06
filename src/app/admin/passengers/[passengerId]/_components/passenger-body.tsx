import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { HeartHandshake } from "lucide-react";
import { PersonAvatar } from "@/components/person-avatar";
import { passengers } from "@/features/passengers";
import { personProfiles, photoUrl } from "@/features/person-profiles";
import { ProfileView } from "@/features/person-profiles/components/profile-view";
import { profile } from "@/features/profile";
import { avatarSvg } from "@/lib/avatar";
import { resolveLocale, toIsoDateUtc } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import {
  accessPerson,
  canRemoveRider,
  seesHealthDetails,
} from "@/use-cases/person-access";
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

  const [own, manager, dict, language, head, bookings] = await Promise.all([
    personProfiles.getProfile(target.subject),
    rider.managedByUserId ? profile.getProfile(rider.managedByUserId) : null,
    getDictionary(),
    getLocale(),
    headers(),
    removable ? passengers.countRiderBookings(rider.id) : 0,
  ]);
  const strings = dict.admin.passengers.detail;
  const notation = resolveLocale(head.get("accept-language"));
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
            />
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
      </DetailLayout>
    </>
  );
}
