import { DomainError, mapping } from "@/lib/domain-error";
import { activity } from "@/lib/activity";
import type { ActivityType } from "@/lib/activity";
import { parseRoles } from "@/lib/access";
import type { ChapterRole, Membership } from "@/lib/access";
import {
  applicationDecisionInput,
  chapterRole,
  pilotApplicationInput,
} from "./schemas";
import type {
  ApplicationDecisionInput,
  PilotApplicationInput,
} from "./schemas";
import {
  deleteMember,
  findAdminMembersOfChapter,
  findMember,
  findMembersOfChapters,
  findMembersOfUser,
  upsertMemberRole,
  withChapterLock,
} from "./services/members";
import {
  findApplicationById,
  findApplicationsOfChapters,
  findApplicationsOfUser,
  markApprovalsSeen as stampApprovalsSeen,
  setApplicationDecision,
  upsertPilotApplication,
} from "./services/applications";
import type { ApplicationStatus } from "@/generated/prisma";

export const listMembershipsOfUser = async (
  userId: string,
): Promise<Membership[]> =>
  (await findMembersOfUser(userId)).map((m) => ({
    chapterId: m.organizationId,
    roles: parseRoles(m.role),
  }));

export const listMembersOfChapters = (chapterIds: string[]) =>
  findMembersOfChapters(chapterIds);

export const listChapterAdmins = async (chapterId: string) =>
  (await findAdminMembersOfChapter(chapterId)).filter((m) =>
    parseRoles(m.role).includes("admin"),
  );

export const getMemberRoles = async (userId: string, chapterId: string) =>
  parseRoles((await findMember(userId, chapterId))?.role);

// Roles stack on one member row (BetterAuth stores them comma-separated).
async function withRoles(
  userId: string,
  chapterId: string,
  mutate: (roles: ChapterRole[]) => ChapterRole[],
) {
  return withChapterLock(chapterId, async (db) => {
    const current = parseRoles((await findMember(userId, chapterId, db))?.role);
    const next = [...new Set(mutate(current))];

    if (current.includes("admin") && !next.includes("admin")) {
      const admins = (await findAdminMembersOfChapter(chapterId, db)).filter(
        (m) => parseRoles(m.role).includes("admin"),
      );
      if (admins.length <= 1) throw new DomainError("lastAdmin");
    }

    if (next.length === 0) return deleteMember(userId, chapterId, db);
    return upsertMemberRole(userId, chapterId, next.join(","), db);
  });
}

// Passengers are active the moment they join — no application, no approval.
export const joinAsPassenger = (userId: string, chapterId: string) =>
  mapping(
    () => withRoles(userId, chapterId, (roles) => [...roles, "passenger"]),
    {
      missingRelation: "unknownChapter",
    },
  );

export function grantChapterRoles(
  userId: string,
  chapterId: string,
  roles: ChapterRole[],
) {
  const granted = roles.map((role) => chapterRole.parse(role));
  return withRoles(userId, chapterId, (current) => [...current, ...granted]);
}

export function grantChapterRole(
  userId: string,
  chapterId: string,
  role: ChapterRole,
) {
  return grantChapterRoles(userId, chapterId, [role]);
}

// Only existing members can be promoted — a chapter admin who is not in the
// chapter would be invisible to every member-facing list.
export async function promoteToChapterAdmin(userId: string, chapterId: string) {
  if (!(await findMember(userId, chapterId)))
    throw new DomainError("notChapterMember");
  return grantChapterRole(userId, chapterId, "admin");
}

export function revokeChapterRole(
  userId: string,
  chapterId: string,
  role: ChapterRole,
) {
  const revoked = chapterRole.parse(role);
  return withRoles(userId, chapterId, (roles) =>
    roles.filter((r) => r !== revoked),
  );
}

export const removeFromChapter = (userId: string, chapterId: string) =>
  withRoles(userId, chapterId, () => []);

export type MemberRoleChange = "promote" | "demote" | "remove";

const ROLE_EVENT: Record<MemberRoleChange, ActivityType> = {
  promote: "roleGranted",
  demote: "roleRevoked",
  remove: "memberRemoved",
};

/**
 * An admin may promote themselves no further and may not demote or remove
 * themselves — losing your own last admin role locks you out of the chapter you
 * are standing in.
 */
export async function changeMemberRole({
  userId,
  chapterId,
  actorUserId,
  change,
}: {
  userId: string;
  chapterId: string;
  actorUserId: string;
  change: MemberRoleChange;
}) {
  if (userId === actorUserId && change !== "promote")
    throw new DomainError("selfChange");

  if (change === "promote") {
    await promoteToChapterAdmin(userId, chapterId);
  } else if (change === "demote") {
    await revokeChapterRole(userId, chapterId, "admin");
  } else {
    await removeFromChapter(userId, chapterId);
  }

  await activity.record({
    userId,
    actorUserId,
    chapterId,
    type: ROLE_EVENT[change],
  });
}

export const listApplications = (
  chapterIds: string[],
  status?: ApplicationStatus,
) => findApplicationsOfChapters(chapterIds, status);

export const getApplication = (id: string) => findApplicationById(id);

export const listApplicationsOfUser = (userId: string) =>
  findApplicationsOfUser(userId);

/** Applying to several chapters at once is one intent, so it is one call. */
export async function submitPilotApplications({
  userId,
  chapterIds,
}: {
  userId: string;
  chapterIds: string[];
}) {
  for (const chapterId of chapterIds) {
    await applyAsPilot({ userId, chapterId });
    await activity.record({
      userId,
      actorUserId: userId,
      chapterId,
      type: "applicationSubmitted",
    });
  }
}

export async function applyAsPilot(input: PilotApplicationInput) {
  const { userId, chapterId, message } = pilotApplicationInput.parse(input);
  if ((await getMemberRoles(userId, chapterId)).includes("pilot")) {
    throw new DomainError("alreadyPilot");
  }
  return mapping(() => upsertPilotApplication(userId, chapterId, message), {
    missingRelation: "unknownChapter",
  });
}

export async function decideApplication(input: ApplicationDecisionInput) {
  const { applicationId, decidedByUserId, approve, note } =
    applicationDecisionInput.parse(input);
  const application = await findApplicationById(applicationId);
  if (!application) throw new DomainError("unknownApplication");
  if (application.status !== "pending") throw new DomainError("alreadyDecided");
  // Chapter admins are appointed by a country admin or promoted from the member
  // list — approving an application must never be a path to admin.
  if (application.role === "admin") throw new DomainError("adminNotApplied");

  // Decide first, and only against a still-pending row: two admins racing cannot
  // both win, and the role is granted only for a decision that was recorded.
  const status = approve ? "approved" : "rejected";
  const { count } = await setApplicationDecision(
    applicationId,
    status,
    decidedByUserId,
    note,
  );
  if (count === 0) throw new DomainError("alreadyDecided");

  if (approve) {
    await grantChapterRole(
      application.userId,
      application.chapterId,
      application.role,
    );
  }

  return {
    id: application.id,
    userId: application.userId,
    chapterId: application.chapterId,
    role: application.role,
    status,
    decisionNote: note ?? null,
  };
}

export const markApprovalsSeen = async (userId: string) =>
  (await stampApprovalsSeen(userId)).count > 0;
