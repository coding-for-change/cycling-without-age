"use client";

import type { ReactNode } from "react";
import type { AddressSearchStrings } from "@/components/address-search";
import type { Locale } from "@/lib/format";
import type { Coords } from "@/lib/geo";
import {
  InlineField,
  type InlineFieldLabels,
} from "../../../_components/inline-field";
import {
  SaveStatus,
  SaveStatusProvider,
} from "../../../_components/save-status";
import type { MapPin } from "../../_components/chapter-map";
import { ChapterLogo } from "../../_components/chapter-logo";
import { updateChapterAction } from "../../actions";
import { ChapterLocation } from "./chapter-location";

export type ChapterLabels = {
  field: InlineFieldLabels;
  status: { saving: string; saved: string };
  fields: {
    name: string;
    careHomeName: string;
    description: string;
    logo: string;
  };
  placeholders: {
    careHome: string;
    description: string;
    logo: string;
  };
  location: string;
  about: string;
  address: AddressSearchStrings;
  map: { label: string; unavailable: string };
  radius: string;
  radiusValue: string;
  overlap: string;
};

export type ChapterEditorProps = {
  id: string;
  name: string;
  city: string;
  careHomeName: string | null;
  address: string | null;
  description: string | null;
  logo: string | null;
  countryName: string;
  coords: Coords;
  radiusKm: number;
  others: MapPin[];
  mapEnabled: boolean;
  language: string;
  notation: Locale;
  labels: ChapterLabels;
  history: ReactNode;
  properties: ReactNode;
};

const isUrl = (value: string) => /^https?:\/\//.test(value);

export function ChapterEditor({
  id,
  name,
  city,
  careHomeName,
  address,
  description,
  logo,
  countryName,
  coords,
  radiusKm,
  others,
  mapEnabled,
  language,
  notation,
  labels,
  history,
  properties,
}: ChapterEditorProps) {
  const subline = [city, countryName, careHomeName].filter(Boolean).join(" · ");

  return (
    <SaveStatusProvider>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-x-12">
        <header className="flex flex-wrap items-start gap-4">
          <ChapterLogo
            logo={logo}
            name={name}
            className="size-14 text-lg"
          />
          <div className="grid min-w-0 flex-1 gap-1">
            <h1 className="leading-none">
              <InlineField
                required
                value={name}
                label={labels.fields.name}
                placeholder={labels.fields.name}
                onSave={(next) =>
                  updateChapterAction(id, { name: next ?? undefined })
                }
                labels={labels.field}
                className="-my-1 min-h-0 py-1 font-display text-xl leading-tight font-bold tracking-tight md:text-2xl"
                inputClassName="h-12 font-display text-xl font-bold tracking-tight md:text-2xl"
              />
            </h1>
            <p className="text-2sm text-ink-soft">{subline}</p>
          </div>
          <SaveStatus
            labels={labels.status}
            words={language}
            className="ml-auto"
          />
        </header>

        {properties}

        <div className="grid gap-6 lg:col-start-1">
          <ChapterLocation
            id={id}
            server={{ coords, address, city, radiusKm }}
            others={others}
            mapEnabled={mapEnabled}
            language={language}
            notation={notation}
            labels={labels}
          />

          <section className="grid gap-4 border-t border-line pt-6">
            <h2 className="text-base font-medium">{labels.about}</h2>
            <dl className="grid gap-4">
              <div className="grid gap-1 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
                <dt className="pt-2 text-2sm text-ink-soft">
                  {labels.fields.careHomeName}
                </dt>
                <dd>
                  <InlineField
                    value={careHomeName}
                    label={labels.fields.careHomeName}
                    placeholder={labels.placeholders.careHome}
                    onSave={(next) =>
                      updateChapterAction(id, { careHomeName: next })
                    }
                    labels={labels.field}
                  />
                </dd>
              </div>
              <div className="grid gap-1 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
                <dt className="pt-2 text-2sm text-ink-soft">
                  {labels.fields.description}
                </dt>
                <dd>
                  <InlineField
                    multiline
                    maxLength={600}
                    value={description}
                    label={labels.fields.description}
                    placeholder={labels.placeholders.description}
                    onSave={(next) =>
                      updateChapterAction(id, { description: next })
                    }
                    labels={labels.field}
                  />
                </dd>
              </div>
              <div className="grid gap-1 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
                <dt className="pt-2 text-2sm text-ink-soft">
                  {labels.fields.logo}
                </dt>
                <dd className="flex items-start gap-4">
                  <ChapterLogo
                    logo={logo}
                    name={name}
                    className="mt-1 size-11"
                  />
                  <InlineField
                    type="url"
                    inputMode="url"
                    value={logo}
                    label={labels.fields.logo}
                    placeholder={labels.placeholders.logo}
                    validate={isUrl}
                    onSave={(next) => updateChapterAction(id, { logo: next })}
                    labels={labels.field}
                    className="min-w-0 flex-1 font-mono text-2sm break-all"
                  />
                </dd>
              </div>
            </dl>
          </section>

          {history}
        </div>
      </div>
    </SaveStatusProvider>
  );
}
