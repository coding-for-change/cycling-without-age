import "server-only";
import { fleet, type LocationRow, type TrishawTypeRow } from "@/features/fleet";
import type { LocationOption } from "@/features/fleet/components/location-picker";
import type { TypeOption } from "@/features/fleet/components/type-picker";
import { allowsAdmin, type Access } from "@/lib/access";
import { formatPlural, wordsLocale } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import type { AdminTab } from "../../_components/admin-tabs";

export const fleetTabs = (
  labels: Dictionary["fleet"]["trishaws"]["tabs"],
): AdminTab[] => [
  { key: "trishaws", href: "/admin/trishaws", label: labels.trishaws },
  { key: "models", href: "/admin/trishaws/types", label: labels.models },
  { key: "timeline", href: "/admin/trishaws/timeline", label: labels.timeline },
];

export const typeOptions = (
  types: TrishawTypeRow[],
  dict: Dictionary,
  language: string,
): TypeOption[] =>
  types.map((type) => ({
    id: type.id,
    name: type.name,
    seats: formatPlural(
      type.seats,
      dict.fleet.common.seats,
      wordsLocale(language),
    ),
    wheelchairAccessible: type.wheelchairAccessible,
    scope:
      type.scope === "chapter"
        ? (type.chapter?.name ?? dict.fleet.common.scopes.chapter)
        : type.scope === "country"
          ? (type.country?.name ?? dict.fleet.common.scopes.country)
          : dict.fleet.common.scopes.global,
  }));

export const locationOwnerName = (location: {
  kind: LocationRow["kind"];
  country?: { name: string } | null;
  ownerChapter?: { name: string } | null;
}) =>
  location.kind === "pool"
    ? (location.country?.name ?? "")
    : (location.ownerChapter?.name ?? "");

export const locationOption = (location: {
  id: string;
  name: string;
  kind: LocationRow["kind"];
  country?: { name: string } | null;
  ownerChapter?: { name: string } | null;
}): LocationOption => ({
  id: location.id,
  name: location.name,
  kind: location.kind,
  owner: locationOwnerName(location),
});

export const manageableLocations = (access: Access, locations: LocationRow[]) =>
  locations.filter((location) =>
    allowsAdmin(access, fleet.trishawManagersOfLocation(location)),
  );
