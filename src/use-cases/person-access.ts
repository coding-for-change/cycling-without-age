import { cache } from "react";
import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import { profile } from "@/features/profile";
import {
  allowsAdmin,
  hasChapterRole,
  isChapterAdmin,
  type Access,
  type Membership,
} from "@/lib/access";
import { avatarSeed } from "@/lib/avatar-seed";
import { subjectSlug, type SubjectRef } from "@/features/person-profiles";

export type Viewer = { user: { id: string }; access: Access };

export type Relation = "self" | "manager" | "admin" | "peer";

export type PersonTarget = {
  subject: SubjectRef;
  name: string;
  avatarSeed: string;
  birthDate: Date | null;
  managedByUserId: string | null;
  managedAccount: boolean;
  chapterIds: string[];
  pilotChapterIds: string[];
  ridesThemself: boolean;
  riderChapter: { id: string; countryId: string | null } | null;
};

const countryOf = cache(chapters.getChapterCountryId);

const riderChapterOf = async (chapterId: string) => ({
  id: chapterId,
  countryId: await countryOf(chapterId),
});

const unique = (values: string[]) => [...new Set(values)];

type CountryLookup = (
  chapterId: string,
) => Promise<string | null> | string | null;

type AccessAccount = {
  name: string;
  email: string;
  birthDate: Date | null;
  createdByUserId: string | null;
  claimedAt: Date | null;
};

type OwnRider = { chapterId: string; managedByUserId: string | null };

function userTarget(
  ref: SubjectRef,
  account: AccessAccount,
  memberships: Membership[],
  ownRider: OwnRider | null,
  riderCountryId: string | null,
): PersonTarget {
  const helper =
    ownRider && ownRider.managedByUserId !== ref.id
      ? ownRider.managedByUserId
      : null;
  return {
    subject: ref,
    name: account.name,
    avatarSeed: avatarSeed(account.email),
    birthDate: account.birthDate,
    managedByUserId: helper,
    // An account set up for someone by a helper stays the helper's to fill in
    // until its owner signs in and claims it.
    managedAccount:
      helper !== null &&
      account.createdByUserId !== null &&
      account.claimedAt === null,
    chapterIds: unique([
      ...memberships.map((m) => m.chapterId),
      ...(ownRider ? [ownRider.chapterId] : []),
    ]),
    pilotChapterIds: memberships
      .filter((m) => m.roles.includes("pilot"))
      .map((m) => m.chapterId),
    ridesThemself: ownRider !== null,
    riderChapter: ownRider
      ? { id: ownRider.chapterId, countryId: riderCountryId }
      : null,
  };
}

export async function resolvePerson(
  ref: SubjectRef,
): Promise<PersonTarget | null> {
  if (ref.kind === "passenger") {
    const rider = await passengers.getPassenger(ref.id);
    if (!rider) return null;
    if (rider.userId) return resolvePerson({ kind: "user", id: rider.userId });
    return {
      subject: ref,
      name: `${rider.firstName} ${rider.lastName}`,
      avatarSeed: `passenger:${rider.id}`,
      birthDate: rider.birthDate,
      managedByUserId: rider.managedByUserId,
      managedAccount: true,
      chapterIds: [rider.chapterId],
      pilotChapterIds: [],
      ridesThemself: true,
      riderChapter: await riderChapterOf(rider.chapterId),
    };
  }

  const [account, memberships, ownRider] = await Promise.all([
    profile.getProfile(ref.id),
    membership.listMembershipsOfUser(ref.id),
    passengers.getOwnPassenger(ref.id),
  ]);
  if (!account) return null;
  const riderCountryId = ownRider ? await countryOf(ownRider.chapterId) : null;
  return userTarget(ref, account, memberships, ownRider, riderCountryId);
}

async function resolvePeople(userIds: string[]) {
  const [accounts, membershipsByUser, ownRiders] = await Promise.all([
    profile.getAccessAccounts(userIds),
    membership.listMembershipsOfUsers(userIds),
    passengers.getOwnPassengers(userIds),
  ]);
  const riderOf = new Map(
    ownRiders.flatMap((rider) =>
      rider.userId ? [[rider.userId, rider] as const] : [],
    ),
  );
  const countries = await chapters.getChapterCountryIds([
    ...[...membershipsByUser.values()].flat().map((m) => m.chapterId),
    ...ownRiders.map((rider) => rider.chapterId),
  ]);
  const lookup = (chapterId: string) => countries.get(chapterId) ?? null;
  const targets = accounts.map((account) => {
    const ownRider = riderOf.get(account.id) ?? null;
    return userTarget(
      { kind: "user", id: account.id },
      account,
      membershipsByUser.get(account.id) ?? [],
      ownRider,
      ownRider ? lookup(ownRider.chapterId) : null,
    );
  });
  return { targets, lookup };
}

async function administers(
  viewer: Viewer,
  chapterIds: string[],
  countryLookup: CountryLookup,
) {
  const authority = {
    chapters: await Promise.all(
      chapterIds.map(async (chapterId) => ({
        chapterId,
        countryId: (await countryLookup(chapterId)) ?? "",
      })),
    ),
    countryIds: [],
  };
  return allowsAdmin(viewer.access, authority);
}

const managedRidersOf = cache(passengers.listPassengersManagedBy);

async function riderChapterIdsOf(viewer: Viewer) {
  const managed = await managedRidersOf(viewer.user.id);
  return unique([
    ...viewer.access.memberships
      .filter((m) => m.roles.includes("passenger"))
      .map((m) => m.chapterId),
    ...managed.map((rider) => rider.chapterId),
  ]);
}

type RelationContext = {
  countryLookup: CountryLookup;
  riderChapters: () => Promise<string[]>;
};

async function relate(
  viewer: Viewer,
  target: PersonTarget,
  context: RelationContext,
): Promise<Relation | null> {
  if (target.subject.kind === "user" && target.subject.id === viewer.user.id)
    return "self";
  const helps = target.managedByUserId === viewer.user.id;
  if (helps && target.managedAccount) return "manager";
  if (await administers(viewer, target.chapterIds, context.countryLookup))
    return "admin";
  if (helps) return "peer";

  const flies = target.chapterIds.some((chapterId) =>
    hasChapterRole(viewer.access, chapterId, "pilot"),
  );
  if (flies) return "peer";

  if (target.pilotChapterIds.length === 0) return null;
  const riderChapters = await context.riderChapters();
  return target.pilotChapterIds.some((id) => riderChapters.includes(id))
    ? "peer"
    : null;
}

export const relationTo = (viewer: Viewer, target: PersonTarget) =>
  relate(viewer, target, {
    countryLookup: countryOf,
    riderChapters: () => riderChapterIdsOf(viewer),
  });

export const canEdit = (relation: Relation | null) =>
  relation === "self" || relation === "manager";

export const canManageRider = (
  relation: Relation | null,
  target: PersonTarget,
) =>
  target.subject.kind === "passenger" &&
  target.managedAccount &&
  relation === "manager";

export const canRemoveRider = (
  relation: Relation | null,
  target: PersonTarget,
) =>
  target.subject.kind === "passenger" &&
  target.managedAccount &&
  (relation === "manager" || relation === "admin");

export const canUploadPhoto = (relation: Relation | null) =>
  relation === "self" || relation === "manager";

export const canRemovePhoto = (relation: Relation | null) =>
  relation === "self" || relation === "manager" || relation === "admin";

export const canSetAccessibility = (
  relation: Relation | null,
  target: PersonTarget,
) => canEdit(relation) && target.ridesThemself;

export const seesHealthDetails = (
  viewer: Viewer,
  relation: Relation | null,
  target: PersonTarget,
) =>
  target.riderChapter !== null &&
  (relation === "self" ||
    relation === "manager" ||
    isChapterAdmin(
      viewer.access,
      target.riderChapter.id,
      target.riderChapter.countryId,
    ) ||
    hasChapterRole(viewer.access, target.riderChapter.id, "pilot"));

export const canGiveHealthConsent = (
  relation: Relation | null,
  target: PersonTarget,
) => target.ridesThemself && (relation === "self" || relation === "manager");

export async function accessPerson(viewer: Viewer, ref: SubjectRef) {
  const target = await resolvePerson(ref);
  if (!target) return null;
  const relation = await relationTo(viewer, target);
  return relation ? { target, relation } : null;
}

export async function visiblePhotoSubjects(
  viewer: Viewer,
  refs: SubjectRef[],
): Promise<Set<string>> {
  const visible = new Set<string>();
  const userIds = refs.filter((ref) => ref.kind === "user").map((r) => r.id);
  const others = refs.filter((ref) => ref.kind !== "user");

  const { targets, lookup } = await resolvePeople(userIds);
  let riderChapters: Promise<string[]> | undefined;
  const context: RelationContext = {
    countryLookup: lookup,
    riderChapters: () => (riderChapters ??= riderChapterIdsOf(viewer)),
  };

  await Promise.all([
    ...targets.map(async (target) => {
      if (await relate(viewer, target, context))
        visible.add(subjectSlug(target.subject));
    }),
    ...others.map(async (ref) => {
      if (await accessPerson(viewer, ref)) visible.add(subjectSlug(ref));
    }),
  ]);
  return visible;
}
