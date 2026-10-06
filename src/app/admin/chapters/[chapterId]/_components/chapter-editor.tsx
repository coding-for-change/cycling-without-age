"use client";

import type { ReactNode } from "react";
import type { AddressSearchStrings } from "@/components/address-search";
import type { Locale } from "@/lib/format";
import type { Coords } from "@/lib/geo";
import { DetailTitle } from "../../../_components/detail-title";
import {
  DETAIL_MEDIA,
  DetailEditorShell,
  DetailHeader,
  DetailHeaderActions,
  DetailMeta,
  DetailSection,
} from "../../../_components/detail-page";
import { PropertyList, PropertyRow } from "../../../_components/properties";
import {
  CHAPTER_DESCRIPTION_MAX,
  isHttpUrl,
} from "@/features/chapters/schemas";
import { InlineField, type InlineFieldLabels } from "@/components/inline-field";
import { cn } from "@/lib/utils";
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
  trash: ReactNode;
  panels: ReactNode;
  children: ReactNode;
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
  trash,
  panels,
  children,
}: ChapterEditorProps) {
  return (
    <DetailEditorShell
      header={
        <DetailHeader
          media={
            <ChapterLogo
              logo={logo}
              name={name}
              className={cn(DETAIL_MEDIA, "text-lg")}
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
            <DetailHeaderActions
              saveStatus={{ labels: labels.status, words: language }}
            >
              {trash}
            </DetailHeaderActions>
          }
        >
          <DetailMeta>
            {city}
            {countryName || null}
            {careHomeName}
          </DetailMeta>
        </DetailHeader>
      }
      panels={panels}
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
        <PropertyList className="gap-2">
          <PropertyRow label={labels.fields.careHomeName}>
            <InlineField
              compact
              value={careHomeName}
              label={labels.fields.careHomeName}
              placeholder={labels.placeholders.careHome}
              onSave={(next) => updateChapterAction(id, { careHomeName: next })}
              labels={labels.field}
              className="text-2sm"
            />
          </PropertyRow>
          <PropertyRow
            label={labels.fields.description}
            align="start"
          >
            <InlineField
              compact
              multiline
              maxLength={CHAPTER_DESCRIPTION_MAX}
              value={description}
              label={labels.fields.description}
              placeholder={labels.placeholders.description}
              onSave={(next) => updateChapterAction(id, { description: next })}
              labels={labels.field}
              className="text-2sm"
            />
          </PropertyRow>
          <PropertyRow
            label={labels.fields.logo}
            align="start"
          >
            <div className="flex items-start gap-3">
              <ChapterLogo
                logo={logo}
                name={name}
                className="mt-0.5 size-8"
              />
              <InlineField
                compact
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
            </div>
          </PropertyRow>
        </PropertyList>
      </DetailSection>

      {children}
    </DetailEditorShell>
  );
}
