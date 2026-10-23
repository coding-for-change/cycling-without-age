"use client";

import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import type { SaveLabels } from "@/components/action-feedback";
import { useOptimisticSave } from "@/components/use-optimistic-save";
import { cn } from "@/lib/utils";
import { QUIET_CONTROL } from "../../../_components/properties";
import { updateChapterAction } from "../../actions";

/**
 * The zone follows the pin, so this is the override rather than the usual way
 * to set it. It exists because the lookup is a raster: a chapter within a
 * kilometre or two of a zone border can land on the wrong side, and nudging the
 * pin to fix a display problem is a worse answer than saying which zone it is.
 */
export function ChapterTimeZone({
  id,
  value,
  zones,
  labels,
}: {
  id: string;
  value: string;
  zones: readonly string[];
  labels: { timeZoneHint: string; field: SaveLabels };
}) {
  const { shown: zone, persist } = useOptimisticSave(
    value,
    (next) => updateChapterAction(id, { timeZone: next }),
    labels.field,
  );

  const groups = useMemo(() => {
    const byRegion = new Map<string, string[]>();
    for (const name of zones) {
      const region = name.includes("/") ? name.slice(0, name.indexOf("/")) : "";
      const bucket = byRegion.get(region);
      if (bucket) bucket.push(name);
      else byRegion.set(region, [name]);
    }
    return [...byRegion.entries()];
  }, [zones]);

  return (
    <div className="group/select relative">
      <select
        id={`time-zone-${id}`}
        value={zone}
        title={labels.timeZoneHint}
        className={cn(QUIET_CONTROL, "cursor-pointer appearance-none pr-7")}
        onChange={(event) => {
          if (event.target.value !== zone)
            void persist(event.target.value, zone);
        }}
      >
        {groups.map(([region, names]) =>
          region ? (
            <optgroup
              key={region}
              label={region}
            >
              {names.map((name) => (
                <option
                  key={name}
                  value={name}
                >
                  {name.slice(region.length + 1).replace(/_/g, " ")}
                </option>
              ))}
            </optgroup>
          ) : (
            names.map((name) => (
              <option
                key={name}
                value={name}
              >
                {name}
              </option>
            ))
          ),
        )}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 -right-1 size-3.5 -translate-y-1/2 text-ink-soft opacity-0 transition-opacity group-hover/select:opacity-100 group-focus-within/select:opacity-100 pointer-coarse:opacity-100"
      />
    </div>
  );
}
