import { hrefWith, type SearchParams } from "@/lib/search-params";

export type RidesView = "calendar" | "list";

export const TRANSIENT = {
  new: null,
  date: null,
  start: null,
  end: null,
  rideLocation: null,
} as const;

export const ridesView = (value: string | null | undefined): RidesView =>
  value === "list" ? "list" : "calendar";

export const ridesViewHrefs = (
  params: SearchParams | URLSearchParams,
): Record<RidesView, string> => ({
  calendar: hrefWith("/admin/rides", params, { ...TRANSIENT, view: null }),
  list: hrefWith("/admin/rides", params, {
    ...TRANSIENT,
    view: "list",
    week: null,
    day: null,
  }),
});

export const newRideHref = (params: SearchParams | URLSearchParams) =>
  hrefWith("/admin/rides", params, { ...TRANSIENT, new: "1" });
