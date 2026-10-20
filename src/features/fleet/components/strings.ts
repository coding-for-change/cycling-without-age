import type { Dictionary } from "@/lib/i18n";

export const fleetCommon = (dict: Dictionary) => ({
  ...dict.fleet.common,
  errors: { ...dict.common.errors, ...dict.fleet.common.errors },
  gallery: dict.common.gallery,
  address: dict.common.address,
});

export type FleetCommon = ReturnType<typeof fleetCommon>;
export type FleetErrors = FleetCommon["errors"];

export const storageAccessLabels = (dict: Dictionary) => {
  const { finish } = dict.fleet;
  return {
    openInMaps: finish.openInMaps,
    accessCode: finish.accessCode,
    entrance: finish.entrance,
    entrancePhoto: finish.entrancePhoto,
    accessNotes: finish.accessNotes,
    returnInstructions: finish.returnInstructions,
  };
};
