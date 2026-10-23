import { DomainError } from "@/lib/domain-error";
import { transaction } from "@/lib/events";
import { hasSuperadminRole, withoutSuperadmin, withSuperadmin } from "./roles";
import {
  createInviteInput,
  INVITE_TTL_DAYS,
  type AdminInviteKind,
  type CreateInviteInput,
  type InviteStatus,
} from "./schemas";
import {
  claimOpenInvite,
  findAcceptedInvitesOf,
  findInviteById,
  findLatestOpenInviteOf,
  findOpenInvites,
  insertInvite,
  releaseClaim,
  revokeOpenInvite,
  revokeOpenInvitesFor,
  revokeOpenInvitesSentBy,
} from "./services/invites";
import {
  findSuperadminCandidates,
  findUserRole,
  lockSuperadminCandidates,
  updateUserRole,
} from "./services/superadmins";

const DAY_MS = 24 * 60 * 60 * 1000;

export type AdminInvite = NonNullable<Awaited<ReturnType<typeof getInvite>>>;

export const inviteExpiry = (from: Date) =>
  new Date(from.getTime() + INVITE_TTL_DAYS * DAY_MS);

export function inviteStatusOf(
  invite: Pick<AdminInvite, "acceptedAt" | "revokedAt" | "expiresAt">,
  now = new Date(),
): InviteStatus {
  if (invite.acceptedAt) return "accepted";
  if (invite.revokedAt) return "revoked";
  if (invite.expiresAt.getTime() <= now.getTime()) return "expired";
  return "pending";
}

export const isSuperadmin = async (userId: string) =>
  hasSuperadminRole(await findUserRole(userId));

export async function createInvite(input: CreateInviteInput) {
  const data = createInviteInput.parse(input);
  const countryId = data.kind === "countryAdmin" ? data.countryId : null;
  const now = new Date();

  return transaction(async (tx, emit) => {
    if (
      data.kind === "superadmin" &&
      hasSuperadminRole(await findUserRole(data.userId, tx))
    )
      throw new DomainError("alreadyAdmin");

    await revokeOpenInvitesFor(
      { kind: data.kind, userId: data.userId, countryId },
      now,
      tx,
    );
    const { id } = await insertInvite(
      {
        kind: data.kind,
        countryId,
        userId: data.userId,
        invitedByUserId: data.actorUserId,
        expiresAt: inviteExpiry(now),
      },
      tx,
    );
    await emit({
      type: "adminInvite.created",
      inviteId: id,
      kind: data.kind,
      countryId,
      userId: data.userId,
      actorUserId: data.actorUserId,
    });
    return { inviteId: id };
  });
}

export const getInvite = (inviteId: string) => findInviteById(inviteId);

export const openInviteOf = (userId: string) =>
  findLatestOpenInviteOf(userId, new Date());

export const inviteHref = (inviteId: string) => `/admin-invite/${inviteId}`;

function closedReason(invite: AdminInvite | null, userId: string) {
  if (!invite || invite.userId !== userId) return new DomainError("notFound");
  const status = inviteStatusOf(invite);
  if (status === "expired") return new DomainError("inviteExpired");
  return new DomainError("inviteClosed");
}

export async function acceptSuperadminInvite(inviteId: string, userId: string) {
  const invite = await findInviteById(inviteId);
  if (!invite || invite.userId !== userId || invite.kind !== "superadmin")
    throw new DomainError("notFound");

  const now = new Date();
  const accepted = await transaction(async (tx, emit) => {
    const { count } = await claimOpenInvite(inviteId, userId, now, tx);
    if (count === 0) return false;
    await updateUserRole(
      userId,
      withSuperadmin(await findUserRole(userId, tx)),
      tx,
    );
    await emit({
      type: "superadmin.granted",
      inviteId,
      userId,
      actorUserId: invite.invitedByUserId ?? userId,
    });
    return true;
  });
  if (!accepted) throw closedReason(await findInviteById(inviteId), userId);
  return invite;
}

export async function claimCountryAdminInvite(
  inviteId: string,
  userId: string,
) {
  const invite = await findInviteById(inviteId);
  if (!invite || invite.userId !== userId || invite.kind !== "countryAdmin")
    throw new DomainError("notFound");
  const { count } = await claimOpenInvite(inviteId, userId, new Date());
  if (count === 0) throw closedReason(await findInviteById(inviteId), userId);
  if (!invite.countryId) throw new DomainError("unknownCountry");
  return { ...invite, countryId: invite.countryId };
}

export const releaseInvite = (inviteId: string) => releaseClaim(inviteId);

export async function revokeInvite(inviteId: string, kind: AdminInviteKind) {
  const { count } = await revokeOpenInvite(inviteId, kind, new Date());
  if (count === 0) throw new DomainError("inviteClosed");
}

export async function removeSuperadmin(userId: string, actorUserId: string) {
  return transaction(async (tx, emit) => {
    const superadmins = (await lockSuperadminCandidates(tx)).filter((row) =>
      hasSuperadminRole(row.role),
    );
    const target = superadmins.find((row) => row.id === userId);
    if (!target) throw new DomainError("notFound");
    if (superadmins.length <= 1) throw new DomainError("lastSuperadmin");

    await updateUserRole(userId, withoutSuperadmin(target.role), tx);
    await revokeOpenInvitesSentBy(userId, new Date(), tx);
    await emit({ type: "superadmin.removed", userId, actorUserId });
  });
}

export async function listSuperadmins() {
  const users = (await findSuperadminCandidates()).filter((user) =>
    hasSuperadminRole(user.role),
  );
  const accepted = await findAcceptedInvitesOf(
    "superadmin",
    users.map((user) => user.id),
  );
  const latest = new Map<string, (typeof accepted)[number]>();
  for (const invite of accepted)
    if (!latest.has(invite.userId)) latest.set(invite.userId, invite);

  return users.map((user) => {
    const invite = latest.get(user.id);
    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      hasPasskey: user._count.passkeys > 0,
      since: invite?.acceptedAt ?? null,
      invitedByName: invite?.invitedBy?.name ?? null,
    };
  });
}

export const listPendingSuperadminInvites = () =>
  findOpenInvites({ kind: "superadmin" }, new Date());

export const listPendingCountryAdminInvites = (countryIds: string[]) =>
  countryIds.length === 0
    ? Promise.resolve([])
    : findOpenInvites(
        { kind: "countryAdmin", countryId: { in: countryIds } },
        new Date(),
      );
