import type { $Enums } from "@/generated/prisma";

export type PickupColumns = {
  residence: $Enums.Residence | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type Pickup = PickupColumns;

export type PickupSource = PickupColumns & { user?: PickupColumns | null };

/**
 * A rider with their own account keeps the pickup on their User; a rider
 * booked by someone else keeps it on the Passenger row.
 */
export function pickupOf(passenger: PickupSource): Pickup | null {
  const { residence, address, latitude, longitude } =
    passenger.user ?? passenger;
  if (!residence) return null;
  return {
    residence,
    address: address?.trim() || null,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
  };
}

export const shortAddress = (address: string) =>
  address.split(",")[0].trim() || address.trim();

export function pickupLabel(
  pickup: Pickup | null,
  careHome: string,
): string | null {
  if (!pickup) return null;
  if (pickup.residence === "careHome") return careHome;
  return pickup.address ? shortAddress(pickup.address) : null;
}
