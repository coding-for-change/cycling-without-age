"use client";

import { useMemo } from "react";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import type { SaveLabels } from "@/components/action-feedback";
import { useOptimisticSave } from "@/components/use-optimistic-save";
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
  labels: { timeZone: string; timeZoneHint: string; field: SaveLabels };
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
    <div className="grid gap-1">
      <label
        htmlFor={`time-zone-${id}`}
        className="text-2sm text-ink-soft"
      >
        {labels.timeZone}
      </label>
      <NativeSelect
        id={`time-zone-${id}`}
        value={zone}
        className="w-full max-w-sm"
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
                <NativeSelectOption
                  key={name}
                  value={name}
                >
                  {name.slice(region.length + 1).replace(/_/g, " ")}
                </NativeSelectOption>
              ))}
            </optgroup>
          ) : (
            names.map((name) => (
              <NativeSelectOption
                key={name}
                value={name}
              >
                {name}
              </NativeSelectOption>
            ))
          ),
        )}
      </NativeSelect>
      <p className="text-2sm text-ink-soft">{labels.timeZoneHint}</p>
    </div>
  );
}
