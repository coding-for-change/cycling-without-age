import type { Dictionary } from "@/lib/i18n";

export const fleetCommon = (dict: Dictionary) => ({
  ...dict.fleet.common,
  errors: { ...dict.common.errors, ...dict.fleet.common.errors },
  gallery: dict.common.gallery,
  address: dict.common.address,
});

export type FleetCommon = ReturnType<typeof fleetCommon>;
export type FleetErrors = FleetCommon["errors"];
