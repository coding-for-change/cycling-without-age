import type { RideDetailStrings } from "@/features/rides/components/strings";

type Detail = RideDetailStrings;
type Errors = { errors: { generic: string } & Record<string, string> };

export const PILOT_LABELS = [
  "pilots",
  "pilotsCount",
  "addPilot",
  "addPilotEmpty",
  "emptyPilots",
  "added",
  "removed",
  "remove",
] as const satisfies readonly (keyof Detail)[];

export const ROSTER_LABELS = [
  "riders",
  "ridersCount",
  "placesTaken",
  "full",
  "addRider",
  "addRiderFirst",
  "addRiderHere",
  "emptyRiders",
  "dragRider",
  "remove",
  "riderAdded",
  "removed",
  "saved",
  "undo",
  "undone",
] as const satisfies readonly (keyof Detail)[];

export const TRISHAW_LABELS = [
  "trishaws",
  "trishawCount",
  "noTrishaws",
  "notReady",
  "oneTrishaw",
  "addTrishaw",
  "addTrishawEmpty",
  "remove",
  "added",
  "removed",
] as const satisfies readonly (keyof Detail)[];

export type PilotLabels = Pick<Detail, (typeof PILOT_LABELS)[number]> &
  Errors & { full: string };
export type RosterLabels = Pick<Detail, (typeof ROSTER_LABELS)[number]> &
  Errors;
export type TrishawPanelLabels = Pick<Detail, (typeof TRISHAW_LABELS)[number]> &
  Errors & { search: string; noMatch: string };
