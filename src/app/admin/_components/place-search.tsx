"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AddressSearch,
  type AddressSearchStrings,
} from "@/components/address-search";
import type { ResolvedPlace } from "@/lib/mapbox";
import { haptics } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";
import { resolveChapterPlace, suggestChapterPlaces } from "../chapters/actions";

export function PlaceSearch({
  address,
  language,
  strings,
  failed,
  onPlace,
}: {
  address: string | null;
  language: string;
  strings: AddressSearchStrings;
  failed: string;
  onPlace: (place: ResolvedPlace) => void | Promise<void>;
}) {
  const sessionToken = useMemo(() => crypto.randomUUID(), []);
  const [resolving, setResolving] = useState(false);

  const pick = async (mapboxId: string) => {
    setResolving(true);
    const found = await resolveChapterPlace({ mapboxId, sessionToken });
    setResolving(false);
    if (!found) {
      haptics.error();
      toast.error(failed);
      return;
    }
    await onPlace(found);
  };

  return (
    <div
      aria-busy={resolving}
      className={cn(resolving && "pointer-events-none opacity-60")}
    >
      <AddressSearch
        key={address ?? ""}
        defaultQuery={address ?? ""}
        search={(query) =>
          suggestChapterPlaces({ query, sessionToken, language })
        }
        strings={strings}
        onPick={(suggestion) => void pick(suggestion.id)}
        inputClassName="h-11 rounded-(--r-card)"
      />
    </div>
  );
}
