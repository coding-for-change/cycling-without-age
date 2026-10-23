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
import {
  PropertyList,
  PropertyRow,
  PropertyValue,
} from "../../../_components/properties";
import { SidePanel } from "../../../_components/side-panel";
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
import { ChapterTimeZone } from "./chapter-time-zone";

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
  properties: string;
  slug: string;
  country: string;
  createdLabel: string;
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
  slug: string;
  city: string;
  careHomeName: string | null;
  address: string | null;
  description: string | null;
  logo: string | null;
  countryName: string;
  created: string;
  coords: Coords;
  radiusKm: number;
  timeZone: string;
  zones: readonly string[];
  others: MapPin[];
  mapEnabled: boolean;
  editable: boolean;
  language: string;
  notation: Locale;
  labels: ChapterLabels;
  trash: ReactNode;
  panels: ReactNode;
  children: ReactNode;
};

const EMPTY = "–";

export function ChapterEditor({
  id,
  name,
  slug,
  city,
  careHomeName,
  address,
  description,
  logo,
  countryName,
  created,
  coords,
  radiusKm,
  timeZone,
  zones,
  others,
  mapEnabled,
  editable,
  language,
  notation,
  labels,
  trash,
  panels,
  children,
}: ChapterEditorProps) {
  const save = editable
    ? (input: Parameters<typeof updateChapterAction>[1]) =>
        updateChapterAction(id, input)
    : null;

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
              onSave={save ? (next) => save({ name: next }) : undefined}
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
      panels={
        <>
          <SidePanel title={labels.properties}>
            <PropertyList>
              <PropertyRow label={labels.slug}>
                <PropertyValue className="font-mono">{slug}</PropertyValue>
              </PropertyRow>
              <PropertyRow label={labels.country}>
                <PropertyValue>{countryName || EMPTY}</PropertyValue>
              </PropertyRow>
              <PropertyRow label={labels.fields.careHomeName}>
                {save ? (
                  <InlineField
                    compact
                    value={careHomeName}
                    label={labels.fields.careHomeName}
                    placeholder={labels.placeholders.careHome}
                    onSave={(next) => save({ careHomeName: next })}
                    labels={labels.field}
                    className="text-2sm"
                  />
                ) : (
                  <PropertyValue muted={!careHomeName}>
                    {careHomeName ?? EMPTY}
                  </PropertyValue>
                )}
              </PropertyRow>
              <PropertyRow
                label={labels.fields.logo}
                align="start"
              >
                {save ? (
                  <InlineField
                    compact
                    type="url"
                    inputMode="url"
                    value={logo}
                    label={labels.fields.logo}
                    placeholder={labels.placeholders.logo}
                    validate={isHttpUrl}
                    onSave={(next) => save({ logo: next })}
                    labels={labels.field}
                    className="min-w-0 font-mono text-2sm break-all"
                  />
                ) : (
                  <PropertyValue
                    muted={!logo}
                    className="font-mono"
                  >
                    {logo ?? EMPTY}
                  </PropertyValue>
                )}
              </PropertyRow>
              <PropertyRow
                label={labels.timeZone}
                htmlFor={save ? `time-zone-${id}` : undefined}
              >
                {save ? (
                  <ChapterTimeZone
                    id={id}
                    value={timeZone}
                    zones={zones}
                    labels={{
                      timeZoneHint: labels.timeZoneHint,
                      field: labels.field,
                    }}
                  />
                ) : (
                  <PropertyValue>{timeZone.replace(/_/g, " ")}</PropertyValue>
                )}
              </PropertyRow>
              <PropertyRow label={labels.createdLabel}>
                <PropertyValue>{created}</PropertyValue>
              </PropertyRow>
            </PropertyList>
          </SidePanel>

          <ChapterLocation
            id={id}
            server={{ coords, address, city, radiusKm }}
            others={others}
            mapEnabled={mapEnabled}
            editable={editable}
            language={language}
            notation={notation}
            labels={labels}
          />

          {panels}
        </>
      }
    >
      <DetailSection
        title={labels.about}
        bordered={false}
      >
        {save ? (
          <InlineField
            multiline
            maxLength={CHAPTER_DESCRIPTION_MAX}
            value={description}
            label={labels.fields.description}
            placeholder={labels.placeholders.description}
            onSave={(next) => save({ description: next })}
            labels={labels.field}
            className="text-sm"
          />
        ) : (
          <p
            className={cn(
              "max-w-prose text-sm whitespace-pre-line",
              !description && "text-ink-faint",
            )}
          >
            {description ?? EMPTY}
          </p>
        )}
      </DetailSection>

      {children}
    </DetailEditorShell>
  );
}
