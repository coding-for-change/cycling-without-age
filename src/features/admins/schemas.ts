import { z } from "zod";

export const INVITE_TTL_DAYS = 7;

export const adminInviteKind = z.enum(["superadmin", "countryAdmin"]);
export type AdminInviteKind = z.infer<typeof adminInviteKind>;

export const inviteStatus = z.enum([
  "pending",
  "accepted",
  "revoked",
  "expired",
]);
export type InviteStatus = z.infer<typeof inviteStatus>;

export const inviteId = z.uuid();

const id = z.string().min(1).max(64);

export const inviteeInput = z.object({
  name: z.string().trim().min(1).max(120),
  email: z
    .string()
    .trim()
    .max(254)
    .pipe(z.email().transform((value) => value.toLowerCase())),
});
export type InviteeInput = z.infer<typeof inviteeInput>;

export const countryAdminInviteInput = inviteeInput.extend({ countryId: id });
export type CountryAdminInviteInput = z.infer<typeof countryAdminInviteInput>;

export const createInviteInput = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("superadmin"),
    userId: id,
    actorUserId: id,
  }),
  z.object({
    kind: z.literal("countryAdmin"),
    countryId: id,
    userId: id,
    actorUserId: id,
  }),
]);
export type CreateInviteInput = z.infer<typeof createInviteInput>;
