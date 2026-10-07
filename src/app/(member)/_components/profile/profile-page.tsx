import { Suspense, type ReactNode } from "react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, HeartHandshake } from "lucide-react";
import { PersonAvatar } from "@/components/person-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { passengers } from "@/features/passengers";
import { profile } from "@/features/profile";
import {
  parseSubjectSlug,
  personProfiles,
  photoUrl,
  subjectSlug,
  type SubjectRef,
} from "@/features/person-profiles";
import { AddRiderDrawer } from "@/features/passengers/components/add-rider-drawer";
import { ProfileEditor } from "@/features/person-profiles/components/profile-editor";
import {
  ProfileSection,
  ProfileView,
} from "@/features/person-profiles/components/profile-view";
import { requirePerspective, type Session } from "@/lib/auth-guards";
import { avatarSeed, avatarSvg } from "@/lib/avatar";
import { resolveLocale, toIsoDateUtc } from "@/lib/format";
import { getDictionary, getLocale, type Locale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { PERSPECTIVE_HOME } from "@/lib/redirects";
import {
  accessPerson,
  canEdit,
  canGiveHealthConsent,
  canManageRider,
  canRemovePhoto,
  canUploadPhoto,
  seesHealthDetails,
} from "@/use-cases/person-access";
import { resolveAddress, suggestAddresses } from "@/features/profile/actions";
import { MemberPageShell } from "../member-page";
import { RiderDetails } from "./rider-details";
import type { MemberPerspective } from "../../nav";

export function ProfilePage({
  perspective,
  slug,
}: {
  perspective: MemberPerspective;
  slug?: Promise<string>;
}) {
  return (
    <MemberPageShell>
      <Suspense fallback={<ProfileFallback />}>
        <ProfileBody
          perspective={perspective}
          slug={slug}
        />
      </Suspense>
    </MemberPageShell>
  );
}

export function PeoplePage() {
  return (
    <MemberPageShell>
      <Suspense fallback={<PeopleFallback />}>
        <PeopleBody />
      </Suspense>
    </MemberPageShell>
  );
}

function PeopleFallback() {
  return (
    <div className="grid gap-3 pt-5">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-72 max-w-full" />
      <Skeleton className="h-13 w-full rounded-2xl" />
      <Skeleton className="h-13 w-full rounded-2xl" />
    </div>
  );
}

async function PeopleBody() {
  const session = await requirePerspective("passenger");
  const [dict, language] = await Promise.all([getDictionary(), getLocale()]);
  const strings = dict.personProfile.managed;

  return (
    <div className="grid gap-5 pt-5">
      <header className="grid gap-1.25">
        <h1 className="text-2xl tracking-tight">{strings.title}</h1>
        <p className="text-sm text-ink-soft">{strings.body}</p>
      </header>
      <ManagedRiders
        session={session}
        base={`${PERSPECTIVE_HOME.passenger}/profile`}
        title={strings.title}
        countLabel={strings.count}
        language={language}
        mode="list"
        add={
          <AddRiderDrawer
            strings={{ ...dict.profile, ...dict.riders, open: dict.riders.add }}
            lookup={{ search: suggestAddresses, resolve: resolveAddress }}
            locale={language}
          />
        }
      />
    </div>
  );
}

export function ProfileFallback() {
  return (
    <div className="grid justify-items-center gap-3 pt-9">
      <Skeleton className="size-28 rounded-full" />
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64 max-w-full" />
      <div className="grid w-full gap-3 pt-5">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    </div>
  );
}

async function ProfileBody({
  perspective,
  slug,
}: {
  perspective: MemberPerspective;
  slug?: Promise<string>;
}) {
  const session = await requirePerspective(perspective);
  const raw = slug ? await slug : null;
  const ref: SubjectRef | null = raw
    ? parseSubjectSlug(raw)
    : { kind: "user", id: session.user.id };
  if (!ref) notFound();

  const found = await accessPerson(session, ref);
  if (!found) notFound();
  const { target, relation } = found;

  const [own, dict, language] = await Promise.all([
    personProfiles.getProfile(target.subject),
    getDictionary(),
    getLocale(),
  ]);
  const strings = dict.personProfile;
  const avatar = avatarSvg(target.avatarSeed, true);
  const isOwn = relation === "self";
  const base = `${PERSPECTIVE_HOME[perspective]}/profile`;

  if (!canEdit(relation))
    return (
      <ProfileView
        name={target.name}
        avatar={avatar}
        profile={personProfiles.toPublicProfile(own, target.birthDate)}
        showAccessibility={seesHealthDetails(session, relation, target)}
        strings={strings}
        language={language}
      />
    );

  return (
    <>
      <ProfileEditor
        subject={target.subject}
        name={target.name}
        avatar={avatar}
        age={
          target.birthDate
            ? personProfiles.ageOn(target.birthDate, new Date())
            : null
        }
        profile={own}
        permissions={{
          onBehalf: relation !== "self",
          canUploadPhoto: canUploadPhoto(relation),
          canRemovePhoto: canRemovePhoto(relation),
          showAccessibility: target.ridesThemself,
          canGiveConsent: canGiveHealthConsent(relation, target),
        }}
        strings={strings}
        labels={dict.account.field}
        statusLabels={dict.account.status}
        language={language}
      />
      {canManageRider(relation, target) ? (
        <Suspense fallback={null}>
          <ManagedRiderDetails
            passengerId={target.subject.id}
            backHref={base}
          />
        </Suspense>
      ) : null}
      {isOwn ? (
        <Suspense fallback={null}>
          <ManagedRiders
            session={session}
            base={base}
            title={strings.managed.title}
            countLabel={strings.managed.count}
            language={language}
            mode="link"
            add={
              perspective === "passenger" ? (
                <AddRiderDrawer
                  strings={{
                    ...dict.profile,
                    ...dict.riders,
                    open: dict.riders.add,
                  }}
                  lookup={{ search: suggestAddresses, resolve: resolveAddress }}
                  locale={language}
                />
              ) : null
            }
          />
        </Suspense>
      ) : null}
    </>
  );
}

async function ManagedRiderDetails({
  passengerId,
  backHref,
}: {
  passengerId: string;
  backHref: string;
}) {
  const [rider, dict, language, head] = await Promise.all([
    passengers.getPassenger(passengerId),
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  if (!rider || rider.userId) return null;
  const strings = dict.personProfile.managed;

  return (
    <ProfileSection title={strings.details}>
      <RiderDetails
        rider={{
          id: rider.id,
          name: `${rider.firstName} ${rider.lastName}`,
          firstName: rider.firstName,
          lastName: rider.lastName,
          birthDate: toIsoDateUtc(rider.birthDate),
          gender: rider.gender,
          pickup: {
            residence: rider.residence,
            address: rider.address,
            latitude: rider.latitude,
            longitude: rider.longitude,
          },
        }}
        strings={{
          firstName: dict.profile.firstName,
          lastName: dict.profile.lastName,
          birthDate: dict.profile.birthDate,
          invalidBirthDate: dict.account.profile.invalidBirthDate,
          gender: dict.profile.gender,
          genders: dict.profile.genders,
          pickup: {
            label: strings.pickup,
            pickup: dict.riders.pickup,
            address: dict.riders.address,
          },
          remove: strings.remove,
          cancel: dict.common.back,
        }}
        labels={dict.account.field}
        lookup={{ search: suggestAddresses, resolve: resolveAddress }}
        language={language}
        notation={resolveLocale(head.get("accept-language"))}
        backHref={backHref}
      />
    </ProfileSection>
  );
}

async function ManagedRiders({
  session,
  base,
  title,
  countLabel,
  language,
  mode,
  add,
}: {
  session: Session;
  base: string;
  title: string;
  countLabel: string;
  language: Locale;
  mode: "link" | "list";
  add: ReactNode;
}) {
  const riders = (
    await passengers.listPassengersManagedBy(session.user.id)
  ).filter((rider) => rider.userId !== session.user.id);
  if (riders.length === 0 && !add) return null;

  if (mode === "link" && riders.length > 0)
    return (
      <ProfileSection title={title}>
        <Link
          href={`${base}/people`}
          className="flex min-h-13 items-center gap-3 rounded-2xl px-3 py-2 outline-none transition-colors hover:bg-canvas-deep focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-mint-tint">
            <HeartHandshake
              aria-hidden
              className="size-5"
            />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">
              {riders.map((rider) => rider.firstName).join(", ")}
            </span>
            <span className="block text-sm text-ink-soft">
              {formatMessage(countLabel, { count: riders.length }, language)}
            </span>
          </span>
          <ChevronRight
            aria-hidden
            className="size-4 text-ink-soft"
          />
        </Link>
      </ProfileSection>
    );

  const subjects: SubjectRef[] = riders.map((rider) =>
    rider.userId
      ? { kind: "user", id: rider.userId }
      : { kind: "passenger", id: rider.id },
  );
  const [photos, accounts] = await Promise.all([
    personProfiles.photoFileIdsOf(subjects),
    profile.getProfiles(riders.flatMap((rider) => rider.userId ?? [])),
  ]);
  const emailOf = new Map(
    accounts.map((account) => [account.id, account.email]),
  );

  return (
    <ProfileSection
      title={
        mode === "list"
          ? formatMessage(countLabel, { count: riders.length }, language)
          : title
      }
    >
      <ul className="grid gap-1.25">
        {riders.map((rider, index) => {
          const slug = subjectSlug(subjects[index]);
          return (
            <li key={rider.id}>
              <Link
                href={`${base}/${slug}`}
                className="flex min-h-13 items-center gap-3 rounded-2xl px-3 py-2 outline-none transition-colors hover:bg-canvas-deep focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none"
              >
                <PersonAvatar
                  svg={avatarSvg(
                    rider.userId && emailOf.has(rider.userId)
                      ? avatarSeed(emailOf.get(rider.userId) as string)
                      : `passenger:${rider.id}`,
                  )}
                  photoUrl={photoUrl(photos.get(slug) ?? null)}
                  size="lg"
                />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {rider.firstName} {rider.lastName}
                </span>
                <ChevronRight
                  aria-hidden
                  className="size-4 text-ink-soft"
                />
              </Link>
            </li>
          );
        })}
      </ul>
      {add}
    </ProfileSection>
  );
}
