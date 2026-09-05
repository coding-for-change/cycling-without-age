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
  findMember,
  findMembersOfChapter,
  findMembersOfUser,
  upsertMemberRole,
} from "./services/members";
import {
  findApplicationById,
  findApplicationsOfChapter,
  findApplicationsOfUser,
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

export const listMembersOfChapter = (chapterId: string) =>
  findMembersOfChapter(chapterId);

export const getMemberRoles = async (userId: string, chapterId: string) =>
  parseRoles((await findMember(userId, chapterId))?.role);

// Roles stack on one member row (BetterAuth stores them comma-separated).
// ponytail: read-modify-write, no transaction — two admins racing on the same
// member row is not a real scenario. Wrap in prisma.$transaction if it becomes one.
async function withRoles(
  userId: string,
  chapterId: string,
  mutate: (roles: ChapterRole[]) => ChapterRole[],
) {
  const current = parseRoles((await findMember(userId, chapterId))?.role);
  const next = [...new Set(mutate(current))];
  if (next.length === 0) return deleteMember(userId, chapterId);
  return upsertMemberRole(userId, chapterId, next.join(","));
}

// Passengers are active the moment they join — no application, no approval.
export const joinAsPassenger = (userId: string, chapterId: string) =>
  withRoles(userId, chapterId, (roles) => [...roles, "passenger"]);

export function grantChapterRole(
  userId: string,
  chapterId: string,
  role: ChapterRole,
) {
  const granted = chapterRole.parse(role);
  return withRoles(userId, chapterId, (roles) => [...roles, granted]);
}

// Only existing members can be promoted — a chapter admin who is not in the
// chapter would be invisible to every member-facing list.
export async function promoteToChapterAdmin(userId: string, chapterId: string) {
  if (!(await findMember(userId, chapterId)))
    throw new Error("Not a chapter member");
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
  deleteMember(userId, chapterId);

export const listApplications = (
  chapterId: string,
  status?: ApplicationStatus,
) => findApplicationsOfChapter(chapterId, status);

export const listApplicationsOfUser = (userId: string) =>
  findApplicationsOfUser(userId);

export async function applyAsPilot(input: PilotApplicationInput) {
  const { userId, chapterId, message } = pilotApplicationInput.parse(input);
  if ((await getMemberRoles(userId, chapterId)).includes("pilot")) {
    throw new Error("Already a pilot of this chapter");
  }
  return upsertPilotApplication(userId, chapterId, message);
}

export async function decideApplication(input: ApplicationDecisionInput) {
  const { applicationId, decidedByUserId, approve } =
    applicationDecisionInput.parse(input);
  const application = await findApplicationById(applicationId);
  if (!application) throw new Error("Unknown application");
  if (application.status !== "pending")
    throw new Error("Application already decided");
  // Chapter admins are appointed by a country admin or promoted from the member
  // list — approving an application must never be a path to admin.
  if (application.role === "admin") throw new Error("Admin is not applied for");

  // Decide first, and only against a still-pending row: two admins racing cannot
  // both win, and the role is granted only for a decision that was recorded.
  const { count } = await setApplicationDecision(
    applicationId,
    approve ? "approved" : "rejected",
    decidedByUserId,
  );
  if (count === 0) throw new Error("Application already decided");

  if (approve) {
    await grantChapterRole(
      application.userId,
      application.chapterId,
      application.role,
    );
  }
}
