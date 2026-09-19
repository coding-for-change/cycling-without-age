import type { Prisma } from "@/generated/prisma";
import { DomainError, mapping } from "@/lib/domain-error";
import { transaction } from "@/lib/events";
import { parseRoles } from "@/lib/access";
import type { ChapterRole, Membership } from "@/lib/access";
import {
  applicationDecisionInput,
  chapterRole,
  inviteMemberInput,
  pilotApplicationInput,
} from "./schemas";
import type {
  ApplicationDecisionInput,
  InviteMemberInput,
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

async function withRoles(
  userId: string,
  chapterId: string,
  mutate: (roles: ChapterRole[]) => ChapterRole[],
  tx?: Prisma.TransactionClient,
): Promise<{ before: ChapterRole[]; roles: ChapterRole[] }> {
  return withChapterLock(
    chapterId,
    async (db) => {
      const before = parseRoles(
        (await findMember(userId, chapterId, db))?.role,
      );
      const roles = [...new Set(mutate(before))];

      if (before.includes("admin") && !roles.includes("admin")) {
        const admins = (await findAdminMembersOfChapter(chapterId, db)).filter(
          (m) => parseRoles(m.role).includes("admin"),
        );
        if (admins.length <= 1) throw new DomainError("lastAdmin");
      }

      if (roles.length === 0) await deleteMember(userId, chapterId, db);
      else await upsertMemberRole(userId, chapterId, roles.join(","), db);

      return { before, roles };
    },
    tx,
  );
}

export const joinAsPassenger = (
  userId: string,
  chapterId: string,
  actorUserId: string | null = null,
) =>
  mapping(
    () =>
      transaction(async (tx, emit) => {
        const { before } = await withRoles(
          userId,
          chapterId,
          (roles) => [...roles, "passenger"],
          tx,
        );
        if (before.includes("passenger")) return;
        await emit({
          type: "chapter.memberJoined",
          chapterId,
          userId,
          actorUserId,
        });
      }),
    { missingRelation: "unknownChapter" },
  );

export function grantChapterRoles(
  userId: string,
  chapterId: string,
  roles: ChapterRole[],
  tx?: Prisma.TransactionClient,
) {
  const granted = roles.map((role) => chapterRole.parse(role));
  return withRoles(
    userId,
    chapterId,
    (current) => [...current, ...granted],
    tx,
  );
}

export function grantChapterRole(
  userId: string,
  chapterId: string,
  role: ChapterRole,
  tx?: Prisma.TransactionClient,
) {
  return grantChapterRoles(userId, chapterId, [role], tx);
}

export async function promoteToChapterAdmin(
  userId: string,
  chapterId: string,
  tx?: Prisma.TransactionClient,
) {
  if (!(await findMember(userId, chapterId, tx)))
    throw new DomainError("notChapterMember");
  return grantChapterRole(userId, chapterId, "admin", tx);
}

export function revokeChapterRole(
  userId: string,
  chapterId: string,
  role: ChapterRole,
  tx?: Prisma.TransactionClient,
) {
  const revoked = chapterRole.parse(role);
  return withRoles(
    userId,
    chapterId,
    (roles) => roles.filter((r) => r !== revoked),
    tx,
  );
}

export const removeFromChapter = (
  userId: string,
  chapterId: string,
  tx?: Prisma.TransactionClient,
) => withRoles(userId, chapterId, () => [], tx);

export type MemberRoleChange = "promote" | "demote" | "remove";

export function inviteMember(input: InviteMemberInput) {
  const { userId, chapterId, actorUserId, roles } =
    inviteMemberInput.parse(input);
  return transaction(async (tx, emit) => {
    await grantChapterRoles(userId, chapterId, roles, tx);
    await emit({
      type: "member.invited",
      chapterId,
      userId,
      actorUserId,
      roles,
    });
  });
}

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

  return transaction(async (tx, emit) => {
    const { roles } =
      change === "promote"
        ? await promoteToChapterAdmin(userId, chapterId, tx)
        : change === "demote"
          ? await revokeChapterRole(userId, chapterId, "admin", tx)
          : await removeFromChapter(userId, chapterId, tx);

    await emit({
      type: "member.roleChanged",
      chapterId,
      userId,
      actorUserId,
      change,
      roles,
    });
  });
}

export const listApplications = (
  chapterIds: string[],
  status?: ApplicationStatus,
) => findApplicationsOfChapters(chapterIds, status);

export const getApplication = (id: string) => findApplicationById(id);

export const listApplicationsOfUser = (userId: string) =>
  findApplicationsOfUser(userId);

export async function submitPilotApplications({
  userId,
  chapterIds,
}: {
  userId: string;
  chapterIds: string[];
}) {
  for (const chapterId of chapterIds) {
    await applyAsPilot({ userId, chapterId });
  }
}

export async function applyAsPilot(input: PilotApplicationInput) {
  const { userId, chapterId, message } = pilotApplicationInput.parse(input);
  if ((await getMemberRoles(userId, chapterId)).includes("pilot")) {
    throw new DomainError("alreadyPilot");
  }
  return mapping(
    () =>
      transaction(async (tx, emit) => {
        const application = await upsertPilotApplication(
          userId,
          chapterId,
          message,
          tx,
        );
        await emit({
          type: "pilotApplication.submitted",
          applicationId: application.id,
          chapterId,
          userId,
          actorUserId: userId,
        });
        return application;
      }),
    { missingRelation: "unknownChapter" },
  );
}

export async function decideApplication(input: ApplicationDecisionInput) {
  const { applicationId, decidedByUserId, approve, note } =
    applicationDecisionInput.parse(input);

  return transaction(async (tx, emit) => {
    const application = await findApplicationById(applicationId, tx);
    if (!application) throw new DomainError("unknownApplication");
    if (application.status !== "pending")
      throw new DomainError("alreadyDecided");
    if (application.role === "admin") throw new DomainError("adminNotApplied");

    const status = approve ? "approved" : "rejected";
    const { count } = await setApplicationDecision(
      applicationId,
      status,
      decidedByUserId,
      note,
      tx,
    );
    if (count === 0) throw new DomainError("alreadyDecided");

    if (approve) {
      await grantChapterRole(
        application.userId,
        application.chapterId,
        application.role,
        tx,
      );
    }

    await emit({
      type: "pilotApplication.decided",
      applicationId: application.id,
      chapterId: application.chapterId,
      userId: application.userId,
      actorUserId: decidedByUserId,
      approved: approve,
      note: note ?? null,
    });

    return {
      id: application.id,
      userId: application.userId,
      chapterId: application.chapterId,
      role: application.role,
      status,
      decisionNote: note ?? null,
    };
  });
}

export const markApprovalsSeen = async (userId: string) =>
  (await stampApprovalsSeen(userId)).count > 0;
