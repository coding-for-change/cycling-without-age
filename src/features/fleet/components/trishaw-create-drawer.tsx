"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { AppDrawer, submitOnCmdEnter } from "@/components/app-drawer";
import { notify, type NotifyLabels } from "@/components/action-feedback";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDrawerParam } from "@/hooks/use-drawer-param";
import { fill } from "@/lib/utils";
import { createTrishawAction } from "../actions";
import {
  LocationPicker,
  type LocationOption,
  type LocationPickerLabels,
} from "./location-picker";
import { PhotoGallery, type PhotoGalleryLabels } from "./photo-gallery";
import {
  TypePicker,
  type TypeOption,
  type TypePickerLabels,
} from "./type-picker";

export type TrishawCreateLabels = {
  open: string;
  title: string;
  body: string;
  name: string;
  namePlaceholder: string;
  model: string;
  location: string;
  photo: string;
  note: string;
  notePlaceholder: string;
  submit: string;
  created: string;
  typePicker: TypePickerLabels;
  locationPicker: LocationPickerLabels;
  gallery: PhotoGalleryLabels;
  photoHint: string;
  frameNumber: string;
  frameNumberHint: string;
  frameNumberPlaceholder: string;
  errors: NotifyLabels["errors"];
};

export function TrishawCreateDrawer({
  types,
  locations,
  defaultLocationId,
  scopeQuery,
  labels,
}: {
  types: TypeOption[];
  locations: LocationOption[];
  defaultLocationId: string;
  scopeQuery: string;
  labels: TrishawCreateLabels;
}) {
  const router = useRouter();
  const { creating: open, openHref, close: clearParam } = useDrawerParam();
  const ids = {
    form: useId(),
    name: useId(),
    model: useId(),
    location: useId(),
    note: useId(),
    frame: useId(),
  };
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  const [name, setName] = useState("");
  const [typeId, setTypeId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(
    defaultLocationId,
  );
  const [photoFileIds, setPhotoFileIds] = useState<string[]>([]);
  const [frameNumber, setFrameNumber] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setName("");
    setTypeId(null);
    setLocationId(defaultLocationId);
    setPhotoFileIds([]);
    setFrameNumber("");
    setNote("");
  };

  const close = () => {
    reset();
    clearParam();
  };

  const ready = name.trim().length > 0 && locationId !== null;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ready || pending || !locationId) return;
    startTransition(async () => {
      const result = await createTrishawAction({
        name,
        typeId,
        storageLocationId: locationId,
        photoFileIds,
        frameNumber,
        note,
      });
      notify(result, {
        done: fill(labels.created, { name: name.trim() }),
        errors: labels.errors,
      });
      if (!result.ok) return;
      reset();
      router.replace(`/admin/trishaws/${result.id}${scopeQuery}`);
    });
  };

  return (
    <>
      <Button
        asChild
        variant="brand"
        className="min-h-11"
      >
        <Link href={openHref}>
          <Plus aria-hidden />
          {labels.open}
        </Link>
      </Button>
      <AppDrawer
        open={open}
        onOpenChange={(next) => {
          if (!next) close();
        }}
        title={labels.title}
        description={labels.body}
        footer={
          <Button
            type="submit"
            form={ids.form}
            disabled={pending || !ready}
            variant="brand"
            className="min-h-11"
          >
            {labels.submit}
          </Button>
        }
      >
        <form
          id={ids.form}
          ref={(node) =>
            setPortal(node?.closest<HTMLElement>("[data-vaul-drawer]") ?? null)
          }
          onSubmit={submit}
          onKeyDown={submitOnCmdEnter}
          aria-busy={pending}
          className="grid gap-5"
        >
          <Field>
            <FieldLabel htmlFor={ids.name}>{labels.name}</FieldLabel>
            <Input
              id={ids.name}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={labels.namePlaceholder}
              maxLength={80}
              autoFocus
              autoComplete="off"
              required
              className="h-11 border-line text-base"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={ids.frame}>{labels.frameNumber}</FieldLabel>
            <Input
              id={ids.frame}
              value={frameNumber}
              onChange={(event) => setFrameNumber(event.target.value)}
              placeholder={labels.frameNumberPlaceholder}
              maxLength={64}
              autoComplete="off"
              className="h-11 border-line font-mono text-base"
            />
            <FieldDescription>{labels.frameNumberHint}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor={ids.model}>{labels.model}</FieldLabel>
            <TypePicker
              id={ids.model}
              types={types}
              value={typeId}
              onChange={setTypeId}
              labels={labels.typePicker}
              container={portal}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={ids.location}>{labels.location}</FieldLabel>
            <LocationPicker
              id={ids.location}
              locations={locations}
              value={locationId}
              onChange={setLocationId}
              labels={labels.locationPicker}
              container={portal}
            />
          </Field>
          <Field>
            <FieldLabel>{labels.photo}</FieldLabel>
            <FieldDescription>{labels.photoHint}</FieldDescription>
            <PhotoGallery
              kind="trishawPhoto"
              value={photoFileIds}
              alt={name || labels.photo}
              labels={labels.gallery}
              camera
              onChange={setPhotoFileIds}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={ids.note}>{labels.note}</FieldLabel>
            <Textarea
              id={ids.note}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={labels.notePlaceholder}
              maxLength={2000}
              rows={3}
              className="border-line text-base"
            />
          </Field>
        </form>
      </AppDrawer>
    </>
  );
}
