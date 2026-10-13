"use client";

import { useRouter } from "next/navigation";
import {
  useId,
  useState,
  useTransition,
  type FormEvent,
  type TransitionStartFunction,
} from "react";
import { toast } from "sonner";
import { notify } from "@/components/action-feedback";
import { AppDrawer, submitOnCmdEnter } from "@/components/app-drawer";
import { CountStepper } from "@/components/count-stepper";
import {
  MarkdownEditor,
  type MarkdownToolLabels,
} from "@/components/markdown-editor";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { createRideLocationAction } from "@/features/ride-locations/actions";
import {
  RIDE_LOCATION_KINDS,
  RIDE_LOCATION_LIMITS,
  type RideLocationKind,
} from "@/features/ride-locations/schemas";
import { useDrawerParam } from "@/hooks/use-drawer-param";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { haptics } from "@/lib/native/haptics";
import { Segmented } from "../../_components/segmented";
import {
  LocationPlace,
  type Place,
} from "../../locations/_components/location-place";

type Option = { id: string; name: string };
type Choice = { value: number; label: string };
type Strings = Dictionary["admin"]["rideLocations"];

const EMPTY_PLACE: Place = { address: null, latitude: null, longitude: null };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type RideLocationDrawerLabels = {
  strings: Strings;
  address: Dictionary["common"]["address"];
  errors: Dictionary["common"]["errors"] & Strings["errors"];
  markdown: MarkdownToolLabels;
};

export function RideLocationCreateDrawer({
  chapters,
  minutes,
  scopeQuery,
  mapEnabled,
  language,
  labels,
}: {
  chapters: Option[];
  minutes: Choice[];
  scopeQuery: string;
  mapEnabled: boolean;
  language: Locale;
  labels: RideLocationDrawerLabels;
}) {
  const router = useRouter();
  const { creating, close } = useDrawerParam();
  const formId = useId();
  const [pending, startTransition] = useTransition();
  const open = creating && chapters.length > 0;
  const create = labels.strings.create;

  return (
    <AppDrawer
      open={open}
      onOpenChange={(next) => {
        if (!next && !pending) close();
      }}
      dismissible={!pending}
      title={create.title}
      description={create.body}
      footer={
        <Button
          type="submit"
          form={formId}
          disabled={pending}
          variant="brand"
          className="min-h-11"
        >
          {create.submit}
        </Button>
      }
    >
      {open ? (
        <RideLocationForm
          formId={formId}
          chapters={chapters}
          minutes={minutes}
          mapEnabled={mapEnabled}
          language={language}
          labels={labels}
          pending={pending}
          startTransition={startTransition}
          onCreated={(id) =>
            router.push(`/admin/ride-locations/${id}${scopeQuery}`)
          }
        />
      ) : null}
    </AppDrawer>
  );
}

function RideLocationForm({
  formId,
  chapters,
  minutes,
  mapEnabled,
  language,
  labels,
  pending,
  startTransition,
  onCreated,
}: {
  formId: string;
  chapters: Option[];
  minutes: Choice[];
  mapEnabled: boolean;
  language: Locale;
  labels: RideLocationDrawerLabels;
  pending: boolean;
  startTransition: TransitionStartFunction;
  onCreated: (id: string) => void;
}) {
  const ids = {
    chapter: useId(),
    name: useId(),
    contactName: useId(),
    contactPhone: useId(),
    contactEmail: useId(),
    minutes: useId(),
    notes: useId(),
  };
  const { strings } = labels;
  const create = strings.create;
  const [chapterId, setChapterId] = useState(chapters[0]?.id ?? "");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<RideLocationKind>("careCenter");
  const [place, setPlace] = useState<Place>(EMPTY_PLACE);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [defaultMinutes, setDefaultMinutes] = useState<number | null>(null);
  const [trishaws, setTrishaws] = useState(1);
  const [pilots, setPilots] = useState(1);
  const [notes, setNotes] = useState("");

  const refuse = (message: string) => {
    haptics.warning();
    toast.error(message);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const trimmed = name.trim();
    if (!trimmed) return refuse(create.nameRequired);
    const email = contactEmail.trim();
    if (email && !EMAIL.test(email)) return refuse(create.invalidEmail);

    startTransition(async () => {
      const result = await createRideLocationAction({
        chapterId,
        kind,
        name: trimmed,
        address: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
        contactName: contactName.trim() || null,
        contactPhone: contactPhone.trim() || null,
        contactEmail: email || null,
        notes: notes.trim() || null,
        defaultMinutes,
        defaultTrishawCount: trishaws,
        defaultPilotCount: pilots,
      });
      notify(result, {
        done: formatMessage(create.created, { name: trimmed }, language),
        errors: labels.errors,
      });
      if (result.ok) onCreated(result.id);
    });
  };

  return (
    <form
      id={formId}
      onSubmit={submit}
      onKeyDown={submitOnCmdEnter}
      aria-busy={pending}
      className="grid gap-5"
    >
      {chapters.length > 1 ? (
        <Field>
          <FieldLabel htmlFor={ids.chapter}>{create.chapter}</FieldLabel>
          <NativeSelect
            id={ids.chapter}
            value={chapterId}
            onChange={(event) => setChapterId(event.target.value)}
            className="h-11 border-line text-base"
          >
            {chapters.map((chapter) => (
              <NativeSelectOption
                key={chapter.id}
                value={chapter.id}
              >
                {chapter.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      ) : null}

      <Field>
        <FieldLabel htmlFor={ids.name}>{create.name}</FieldLabel>
        <Input
          id={ids.name}
          autoFocus
          required
          maxLength={RIDE_LOCATION_LIMITS.name}
          autoComplete="off"
          placeholder={create.namePlaceholder}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-11 border-line text-base"
        />
      </Field>

      <div className="grid gap-2">
        <span className="text-sm font-medium">{create.kind}</span>
        <Segmented
          value={kind}
          options={RIDE_LOCATION_KINDS.map((value) => ({
            value,
            label: strings.kinds[value],
          }))}
          onChange={setKind}
          label={create.kind}
          className="w-fit max-w-full flex-wrap"
        />
      </div>

      <div className="grid gap-2">
        <span className="text-sm font-medium">{create.address}</span>
        <LocationPlace
          value={place}
          onChange={setPlace}
          mapEnabled={mapEnabled}
          language={language}
          strings={{
            map: {
              label: strings.detail.map,
              unavailable: strings.detail.mapUnavailable,
            },
            address: {
              ...labels.address,
              placeholder: create.addressPlaceholder,
              hint: create.addressHint,
            },
          }}
          failed={labels.errors.generic}
        />
      </div>

      <fieldset className="grid gap-3">
        <legend className="mb-2 text-sm font-medium">{create.contact}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel
              htmlFor={ids.contactName}
              className="text-2sm text-ink-soft"
            >
              {create.contactName}
            </FieldLabel>
            <Input
              id={ids.contactName}
              maxLength={RIDE_LOCATION_LIMITS.contactName}
              autoComplete="off"
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
              className="h-11 border-line text-base"
            />
          </Field>
          <Field>
            <FieldLabel
              htmlFor={ids.contactPhone}
              className="text-2sm text-ink-soft"
            >
              {create.contactPhone}
            </FieldLabel>
            <Input
              id={ids.contactPhone}
              type="tel"
              inputMode="tel"
              maxLength={RIDE_LOCATION_LIMITS.contactPhone}
              autoComplete="off"
              value={contactPhone}
              onChange={(event) => setContactPhone(event.target.value)}
              className="h-11 border-line text-base"
            />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel
              htmlFor={ids.contactEmail}
              className="text-2sm text-ink-soft"
            >
              {create.contactEmail}
            </FieldLabel>
            <Input
              id={ids.contactEmail}
              type="email"
              inputMode="email"
              maxLength={RIDE_LOCATION_LIMITS.contactEmail}
              autoComplete="off"
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
              className="h-11 border-line text-base"
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="text-sm font-medium">{create.defaults}</legend>
        <FieldDescription>{create.defaultsHint}</FieldDescription>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
          <Field>
            <FieldLabel
              htmlFor={ids.minutes}
              className="text-2sm text-ink-soft"
            >
              {create.defaultMinutes}
            </FieldLabel>
            <NativeSelect
              id={ids.minutes}
              value={defaultMinutes ?? ""}
              onChange={(event) =>
                setDefaultMinutes(
                  event.target.value === "" ? null : Number(event.target.value),
                )
              }
              className="h-11 border-line text-base"
            >
              <NativeSelectOption value="">
                {create.chapterDefault}
              </NativeSelectOption>
              {minutes.map((choice) => (
                <NativeSelectOption
                  key={choice.value}
                  value={choice.value}
                >
                  {choice.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <div className="grid gap-2">
            <span className="text-2sm text-ink-soft">
              {create.defaultTrishaws}
            </span>
            <CountStepper
              value={trishaws}
              min={1}
              max={RIDE_LOCATION_LIMITS.trishaws}
              onChange={setTrishaws}
              label={create.defaultTrishaws}
              fewer={create.fewer}
              more={create.more}
              className="h-11 text-sm"
            />
          </div>
          <div className="grid gap-2">
            <span className="text-2sm text-ink-soft">
              {create.defaultPilots}
            </span>
            <CountStepper
              value={pilots}
              min={1}
              max={RIDE_LOCATION_LIMITS.pilots}
              onChange={setPilots}
              label={create.defaultPilots}
              fewer={create.fewer}
              more={create.more}
              className="h-11 text-sm"
            />
          </div>
        </div>
      </fieldset>

      <Field>
        <FieldLabel htmlFor={ids.notes}>{create.notes}</FieldLabel>
        <MarkdownEditor
          id={ids.notes}
          minRows={3}
          maxLength={RIDE_LOCATION_LIMITS.notes}
          labels={labels.markdown}
          placeholder={create.notesPlaceholder}
          value={notes}
          onChange={setNotes}
        />
      </Field>
    </form>
  );
}
