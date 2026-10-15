import { cache } from "react";
import { passengers } from "@/features/passengers";
import { profile } from "@/features/profile";

export type AudienceWho = "self" | "one" | "many" | "withOne" | "withMany";

export type PassengerAudience = {
  who: AudienceWho;
  name: string;
  count: number;
};

export function audienceOf({
  managesOthers,
  ridesThemself,
  riderNames,
}: {
  managesOthers: boolean;
  ridesThemself: boolean;
  riderNames: string[];
}): PassengerAudience {
  const count = riderNames.length;
  const name = count === 1 ? riderNames[0] : "";
  if (count === 0 && (ridesThemself || !managesOthers))
    return { who: "self", name, count };
  if (ridesThemself)
    return { who: count === 1 ? "withOne" : "withMany", name, count };
  return { who: count === 1 ? "one" : "many", name, count };
}

export const getPassengerAudience = cache(
  async (userId: string): Promise<PassengerAudience> => {
    const [account, managed, own] = await Promise.all([
      profile.getProfile(userId),
      passengers.listPassengersManagedBy(userId),
      passengers.getOwnPassenger(userId),
    ]);
    return audienceOf({
      managesOthers: Boolean(account?.managesOthers),
      ridesThemself: own !== null,
      riderNames: passengers.othersOf(managed).map((rider) => rider.firstName),
    });
  },
);
