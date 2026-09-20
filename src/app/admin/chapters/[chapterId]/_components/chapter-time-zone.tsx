"use client";

import { useMemo, useState } from "react";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  reportSave,
  type SaveLabels,
} from "../../../_components/action-feedback";
import { useSaveStatus } from "../../../_components/save-status";
import { updateChapterAction } from "../../actions";

/**
 * The zone follows the pin, so this is the override rather than the usual way
 * to set it. It exists because the lookup is a raster: a chapter within a
 * kilometre or two of a zone border can land on the wrong side, and nudging the
 * pin to fix a display problem is a worse answer than saying which zone it is.
 *
 * The list comes from the server, not from `Intl.supportedValuesOf` here — the
 * two runtimes can know slightly different sets, which would hydrate as a
 * mismatch.
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
  const [override, setOverride] = useState<{
    id: string;
    from: string;
    to: string;
  } | null>(null);
  const zone =
    override && override.id === id && override.from === value
      ? override.to
      : value;
  const report = useSaveStatus();

  // Grouped by the part before the slash — "Europe", "America" — which is how
  // anyone hunting for their own zone in four hundred of them actually scans.
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

  const save = async (next: string, undoable: boolean) => {
    const previous = zone;
    if (next === previous) return;
    setOverride({ id, from: value, to: next });
    report("saving");

    const result = await updateChapterAction(id, { timeZone: next });
    const ok = reportSave(result, {
      report,
      labels: labels.field,
      undo: undoable ? () => void save(previous, false) : undefined,
    });
    if (!ok) setOverride(null);
  };

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
        onChange={(event) => void save(event.target.value, true)}
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
