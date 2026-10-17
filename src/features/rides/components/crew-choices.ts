import {
  pickupLabel,
  pickupOf,
  type PickupSource,
} from "@/features/passengers/pickup";
import { parseRoles } from "@/lib/access";
import { avatarSvg, seedOf } from "@/lib/avatar";
import { fullName } from "@/lib/utils";

export const toPassengerChoice = (
  passenger: {
    id: string;
    firstName: string;
    lastName: string;
    user: { email: string; avatarSeed: string | null } | null;
  } & Partial<PickupSource>,
  careHome?: string,
) => {
  const hint =
    careHome && passenger.residence !== undefined
      ? pickupLabel(pickupOf(passenger as PickupSource), careHome)
      : null;
  return {
    id: passenger.id,
    name: fullName(passenger),
    avatar: avatarSvg(passenger.user ? seedOf(passenger.user) : passenger.id),
    ...(hint ? { hint } : {}),
  };
};

export const toPersonChoice = (user: {
  id: string;
  name: string | null;
  email: string;
  avatarSeed: string | null;
}) => ({
  id: user.id,
  name: user.name || user.email,
  avatar: avatarSvg(seedOf(user)),
});

export const isPilot = (member: { role: string | null }) =>
  parseRoles(member.role).includes("pilot");

export const toPilotChoice = (member: {
  userId: string;
  user: { name: string | null; email: string; avatarSeed: string | null };
}) => toPersonChoice({ ...member.user, id: member.userId });
