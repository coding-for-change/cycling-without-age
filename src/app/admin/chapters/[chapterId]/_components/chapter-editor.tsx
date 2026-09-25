"use client";

import type { ReactNode } from "react";
import type { AddressSearchStrings } from "@/components/address-search";
import type { Locale } from "@/lib/format";
import type { Coords } from "@/lib/geo";
import { DetailTitle } from "../../../_components/detail-title";
import {
  DetailHeader,
  DetailLayout,
  DetailSection,
} from "../../../_components/detail-page";
import {
  CHAPTER_DESCRIPTION_MAX,
  isHttpUrl,
} from "@/features/chapters/schemas";
import { InlineField, type InlineFieldLabels } from "@/components/inline-field";
import { SaveStatus, SaveStatusProvider } from "@/components/save-status";
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
  timeZone: string;
  timeZoneHint: string;
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
  timeZone: string;
  zones: readonly string[];
  others: MapPin[];
  mapEnabled: boolean;
  language: string;
  notation: Locale;
  labels: ChapterLabels;
  history: ReactNode;
  properties: ReactNode;
};

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
  timeZone,
  zones,
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
      <DetailLayout
        header={
          <DetailHeader
            media={
              <ChapterLogo
                logo={logo}
                name={name}
                className="size-14 text-lg"
              />
            }
            title={
              <DetailTitle
                value={name}
                label={labels.fields.name}
                onSave={(next) => updateChapterAction(id, { name: next })}
                labels={labels.field}
              />
            }
            aside={
              <SaveStatus
                labels={labels.status}
                words={language}
              />
            }
          >
            <p className="text-2sm text-ink-soft">{subline}</p>
          </DetailHeader>
        }
        sidebar={properties}
      >
        <ChapterLocation
          id={id}
          server={{ coords, address, city, radiusKm }}
          timeZone={timeZone}
          zones={zones}
          others={others}
          mapEnabled={mapEnabled}
          language={language}
          notation={notation}
          labels={labels}
        />

        <DetailSection title={labels.about}>
          <dl className="grid gap-4">
            <AboutRow label={labels.fields.careHomeName}>
              <InlineField
                value={careHomeName}
                label={labels.fields.careHomeName}
                placeholder={labels.placeholders.careHome}
                onSave={(next) =>
                  updateChapterAction(id, { careHomeName: next })
                }
                labels={labels.field}
              />
            </AboutRow>
            <AboutRow label={labels.fields.description}>
              <InlineField
                multiline
                maxLength={CHAPTER_DESCRIPTION_MAX}
                value={description}
                label={labels.fields.description}
                placeholder={labels.placeholders.description}
                onSave={(next) =>
                  updateChapterAction(id, { description: next })
                }
                labels={labels.field}
              />
            </AboutRow>
            <AboutRow
              label={labels.fields.logo}
              className="flex items-start gap-4"
            >
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
                validate={isHttpUrl}
                onSave={(next) => updateChapterAction(id, { logo: next })}
                labels={labels.field}
                className="min-w-0 flex-1 font-mono text-2sm break-all"
              />
            </AboutRow>
          </dl>
        </DetailSection>

        {history}
      </DetailLayout>
    </SaveStatusProvider>
  );
}

function AboutRow({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
      <dt className="pt-2 text-2sm text-ink-soft">{label}</dt>
      <dd className={className}>{children}</dd>
    </div>
  );
}
