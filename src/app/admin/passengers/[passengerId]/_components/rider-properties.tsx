"use client";

import type { ReactNode } from "react";
import { Building2, Cake, MapPin, UserMinus } from "lucide-react";
import {
  ConfirmDeleteDialog,
  type ConfirmDeleteLabels,
} from "@/components/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { removeManagedRiderAction } from "@/features/passengers/actions";
import { formatDate, type Locale as Notation } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locales";
import {
  PROPERTY_BUTTON_DANGER,
  PropertyList,
  PropertyRow,
  PropertyValue,
} from "../../../_components/properties";

type Gender = "female" | "male" | "other";

export type RiderPropertiesData = {
  id: string;
  name: string;
  birthDate: string;
  gender: Gender;
  chapterName: string;
  pickup: { residence: "careHome" | "home" | null; address: string | null };
};

export type RiderPropertiesStrings = {
  chapter: string;
  born: string;
  gender: string;
  genders: Record<Gender, string>;
  pickup: string;
  careHome: string;
  home: string;
  remove: ConfirmDeleteLabels;
  cancel: string;
};

export function RiderProperties({
  rider,
  removable,
  consequences,
  strings,
  language,
  notation,
  backHref,
  children,
}: {
  rider: RiderPropertiesData;
  removable: boolean;
  consequences: string[];
  strings: RiderPropertiesStrings;
  language: Locale;
  notation: Notation;
  backHref: string;
  children?: ReactNode;
}) {
  return (
    <>
      <PropertyList>
        <PropertyRow label={strings.chapter}>
          <PropertyValue icon={Building2}>{rider.chapterName}</PropertyValue>
        </PropertyRow>
        <PropertyRow label={strings.born}>
          <PropertyValue icon={Cake}>
            <time dateTime={rider.birthDate}>
              {formatDate(rider.birthDate, notation)}
            </time>
          </PropertyValue>
        </PropertyRow>
        <PropertyRow label={strings.gender}>
          <PropertyValue>{strings.genders[rider.gender]}</PropertyValue>
        </PropertyRow>
        <PropertyRow
          label={strings.pickup}
          align="start"
        >
          <PropertyValue
            icon={MapPin}
            muted={!rider.pickup.residence}
            className="whitespace-normal"
          >
            {rider.pickup.residence === "home"
              ? (rider.pickup.address ?? strings.home)
              : rider.pickup.residence === "careHome"
                ? strings.careHome
                : "–"}
          </PropertyValue>
        </PropertyRow>
      </PropertyList>

      {children}

      {removable ? (
        <ConfirmDeleteDialog
          name={rider.name}
          consequences={consequences}
          labels={strings.remove}
          locale={language}
          cancel={strings.cancel}
          action={removeManagedRiderAction}
          input={rider.id}
          redirectTo={backHref}
          trigger={
            <Button
              type="button"
              variant="outline"
              className={PROPERTY_BUTTON_DANGER}
            >
              <UserMinus aria-hidden />
              {strings.remove.open}
            </Button>
          }
        />
      ) : null}
    </>
  );
}
