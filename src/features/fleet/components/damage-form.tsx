"use client";

import { useId, useState, type FormEvent } from "react";
import { notify, type NotifyLabels } from "@/components/action-feedback";
import { submitOnCmdEnter } from "@/components/app-drawer";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { haptics } from "@/lib/native/haptics";
import type { FleetResult } from "../actions";
import { PhotoGallery, type PhotoGalleryLabels } from "./photo-gallery";
import type { Locale } from "@/lib/i18n/locales";

export type DamageFormLabels = {
  description: string;
  descriptionPlaceholder: string;
  photo: string;
  ground: string;
  groundHint: string;
  submit: string;
  submitting: string;
  sent: string;
  gallery: PhotoGalleryLabels;
  errors: NotifyLabels["errors"];
};

export type DamageFormValues = {
  description: string;
  photoFileId: string | null;
  grounding: boolean;
};

export function DamageForm({
  trishawName,
  onSubmit,
  onDone,
  labels,
  locale,
}: {
  trishawName: string;
  onSubmit: (values: DamageFormValues) => Promise<FleetResult>;
  onDone: () => void;
  labels: DamageFormLabels;
  locale: Locale;
}) {
  const ids = { description: useId(), ground: useId() };
  const [description, setDescription] = useState("");
  const [photoFileId, setPhotoFileId] = useState<string | null>(null);
  const [grounding, setGrounding] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || description.trim().length < 3) return;
    setPending(true);
    const result = await onSubmit({ description, photoFileId, grounding });
    setPending(false);
    notify(result, { done: labels.sent, errors: labels.errors });
    if (!result.ok) return;
    setDescription("");
    setPhotoFileId(null);
    setGrounding(false);
    onDone();
  }

  return (
    <form
      onSubmit={submit}
      onKeyDown={submitOnCmdEnter}
      className="flex flex-col gap-5"
    >
      <Field>
        <FieldLabel htmlFor={ids.description}>{labels.description}</FieldLabel>
        <Textarea
          id={ids.description}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={labels.descriptionPlaceholder}
          minLength={3}
          maxLength={2000}
          rows={4}
          required
        />
      </Field>
      <Field>
        <FieldLabel>{labels.photo}</FieldLabel>
        <PhotoGallery
          kind="damagePhoto"
          max={1}
          value={photoFileId ? [photoFileId] : []}
          alt={trishawName}
          labels={labels.gallery}
          camera
          onChange={(next) => setPhotoFileId(next[0] ?? null)}
          locale={locale}
        />
      </Field>
      <Field orientation="horizontal">
        <Switch
          id={ids.ground}
          checked={grounding}
          onCheckedChange={(next) => {
            haptics.tap();
            setGrounding(next);
          }}
        />
        <div className="flex flex-col gap-1">
          <FieldLabel htmlFor={ids.ground}>{labels.ground}</FieldLabel>
          <FieldDescription>{labels.groundHint}</FieldDescription>
        </div>
      </Field>
      <Button
        type="submit"
        disabled={pending || description.trim().length < 3}
        variant={grounding ? "destructive" : "default"}
      >
        {pending ? labels.submitting : labels.submit}
      </Button>
    </form>
  );
}
