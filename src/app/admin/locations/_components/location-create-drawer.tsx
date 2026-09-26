"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  useId,
  useState,
  useTransition,
  type FormEvent,
  type TransitionStartFunction,
} from "react";
import { toast } from "sonner";
import { AppDrawer, submitOnCmdEnter } from "@/components/app-drawer";
import { notify } from "@/components/action-feedback";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import {
  MarkdownEditor,
  type MarkdownToolLabels,
} from "@/components/markdown-editor";
import {
  createLocationAction,
  createPoolAction,
} from "@/features/fleet/actions";
import { PhotoGallery } from "@/features/fleet/components/photo-gallery";
import { useDrawerParam } from "@/hooks/use-drawer-param";
import type { Dictionary } from "@/lib/i18n";
import { haptics } from "@/lib/native/haptics";
import { fill } from "@/lib/utils";
import { LocationPlace, type Place } from "./location-place";

type Option = { id: string; name: string };

const EMPTY_PLACE: Place = { address: null, latitude: null, longitude: null };

type Strings = Dictionary["fleet"]["locations"];
type Common = Dictionary["fleet"]["common"];
type Kind = "pool" | "location";

export function LocationCreateDrawer({
  chapters,
  countries,
  scopeQuery,
  mapEnabled,
  language,
  strings,
  common,
  markdown,
}: {
  chapters: Option[];
  countries: Option[];
  scopeQuery: string;
  mapEnabled: boolean;
  language: string;
  strings: Strings;
  common: Common;
  markdown: MarkdownToolLabels;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { go } = useDrawerParam();
  const mode = searchParams.get("new");
  const kind: Kind | null =
    mode === "pool" && countries.length > 0
      ? "pool"
      : mode === "location" && chapters.length > 0
        ? "location"
        : null;

  const formId = useId();
  const [pending, startTransition] = useTransition();
  const create = strings.create;

  return (
    <AppDrawer
      open={kind !== null}
      onOpenChange={(next) => {
        if (!next && !pending) go((params) => params.delete("new"));
      }}
      dismissible={!pending}
      title={kind === "pool" ? create.poolTitle : create.locationTitle}
      description={kind === "pool" ? create.poolBody : create.locationBody}
      footer={
        <Button
          type="submit"
          form={formId}
          disabled={pending}
          variant="brand"
          className="min-h-11"
        >
          {kind === "pool" ? create.submitPool : create.submit}
        </Button>
      }
    >
      <LocationCreateForm
        key={kind ?? "closed"}
        formId={formId}
        kind={kind ?? "location"}
        chapters={chapters}
        countries={countries}
        mapEnabled={mapEnabled}
        language={language}
        strings={strings}
        common={common}
        markdown={markdown}
        pending={pending}
        startTransition={startTransition}
        onCreated={(id) => router.push(`/admin/locations/${id}${scopeQuery}`)}
      />
    </AppDrawer>
  );
}

function LocationCreateForm({
  formId,
  kind,
  chapters,
  countries,
  mapEnabled,
  language,
  strings,
  common,
  markdown,
  pending,
  startTransition,
  onCreated,
}: {
  formId: string;
  kind: Kind;
  chapters: Option[];
  countries: Option[];
  mapEnabled: boolean;
  language: string;
  strings: Strings;
  common: Common;
  markdown: MarkdownToolLabels;
  pending: boolean;
  startTransition: TransitionStartFunction;
  onCreated: (id: string) => void;
}) {
  const ownerId = useId();
  const nameId = useId();
  const entranceId = useId();
  const codeId = useId();
  const notesId = useId();
  const returnId = useId();
  const manageId = useId();
  const [chapterId, setChapterId] = useState(chapters[0]?.id ?? "");
  const [countryId, setCountryId] = useState(countries[0]?.id ?? "");
  const [name, setName] = useState("");
  const [place, setPlace] = useState<Place>(EMPTY_PLACE);
  const [entrance, setEntrance] = useState("");
  const [entrancePhoto, setEntrancePhoto] = useState<string | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [accessNotes, setAccessNotes] = useState("");
  const [returnInstructions, setReturnInstructions] = useState("");
  const [membersMayManage, setMembersMayManage] = useState(false);
  const create = strings.create;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      haptics.warning();
      toast.error(create.nameRequired);
      return;
    }
    const fields = {
      name: trimmed,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      entrance: entrance.trim() || null,
      entrancePhotoFileId: entrancePhoto,
      accessCode: accessCode.trim() || null,
      accessNotes: accessNotes.trim() || null,
      returnInstructions: returnInstructions.trim() || null,
    };
    startTransition(async () => {
      const result =
        kind === "pool"
          ? await createPoolAction({ ...fields, countryId, membersMayManage })
          : await createLocationAction({ ...fields, chapterId });
      notify(result, {
        done: fill(create.created, { name: trimmed }),
        errors: common.errors,
      });
      if (result.ok) onCreated(result.id);
    });
  };

  const owners = kind === "pool" ? countries : chapters;

  return (
    <form
      id={formId}
      onSubmit={submit}
      onKeyDown={submitOnCmdEnter}
      aria-busy={pending}
      className="grid gap-5"
    >
      {owners.length > 1 ? (
        <Field>
          <FieldLabel htmlFor={ownerId}>
            {kind === "pool" ? create.country : create.chapter}
          </FieldLabel>
          <NativeSelect
            id={ownerId}
            value={kind === "pool" ? countryId : chapterId}
            onChange={(event) =>
              kind === "pool"
                ? setCountryId(event.target.value)
                : setChapterId(event.target.value)
            }
            className="h-11 border-line text-base"
          >
            {owners.map((owner) => (
              <NativeSelectOption
                key={owner.id}
                value={owner.id}
              >
                {owner.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      ) : null}

      <Field>
        <FieldLabel htmlFor={nameId}>{create.name}</FieldLabel>
        <Input
          id={nameId}
          autoFocus
          required
          maxLength={120}
          autoComplete="off"
          placeholder={create.namePlaceholder}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-11 border-line text-base"
        />
      </Field>

      <LocationPlace
        value={place}
        onChange={setPlace}
        mapEnabled={mapEnabled}
        language={language}
        strings={strings}
        failed={common.errors.generic}
      />

      <Field>
        <FieldLabel htmlFor={entranceId}>{create.entrance}</FieldLabel>
        <Input
          id={entranceId}
          maxLength={500}
          autoComplete="off"
          placeholder={create.entrancePlaceholder}
          value={entrance}
          onChange={(event) => setEntrance(event.target.value)}
          className="h-11 border-line text-base"
        />
      </Field>

      <div className="grid gap-2">
        <span className="text-sm font-medium">{create.entrancePhoto}</span>
        <PhotoGallery
          kind="entrancePhoto"
          max={1}
          camera
          value={entrancePhoto ? [entrancePhoto] : []}
          alt={create.entrancePhoto}
          labels={{ ...common.gallery, errors: common.errors }}
          onChange={(next) => setEntrancePhoto(next[0] ?? null)}
        />
      </div>

      <Field>
        <FieldLabel htmlFor={codeId}>{create.accessCode}</FieldLabel>
        <Input
          id={codeId}
          maxLength={64}
          autoComplete="off"
          spellCheck={false}
          value={accessCode}
          onChange={(event) => setAccessCode(event.target.value)}
          className="h-11 border-line font-mono text-base"
        />
        <FieldDescription>{create.accessCodeHint}</FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor={notesId}>{create.accessNotes}</FieldLabel>
        <MarkdownEditor
          id={notesId}
          minRows={3}
          maxLength={5_000}
          labels={markdown}
          placeholder={create.accessNotesPlaceholder}
          value={accessNotes}
          onChange={setAccessNotes}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={returnId}>{create.returnInstructions}</FieldLabel>
        <MarkdownEditor
          id={returnId}
          minRows={3}
          maxLength={5_000}
          labels={markdown}
          placeholder={create.returnInstructionsPlaceholder}
          value={returnInstructions}
          onChange={setReturnInstructions}
        />
      </Field>

      {kind === "pool" ? (
        <div className="flex min-h-11 items-start gap-3">
          <Switch
            id={manageId}
            checked={membersMayManage}
            onCheckedChange={setMembersMayManage}
          />
          <label
            htmlFor={manageId}
            className="grid gap-1"
          >
            <span className="text-sm leading-none font-medium">
              {strings.membersMayManage.label}
            </span>
            <span className="text-2sm text-ink-soft">
              {strings.membersMayManage.hint}
            </span>
          </label>
        </div>
      ) : null}
    </form>
  );
}
