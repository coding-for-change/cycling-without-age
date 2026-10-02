"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AppDrawer, submitOnCmdEnter } from "@/components/app-drawer";
import { notify, type NotifyLabels } from "@/components/action-feedback";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { useDrawerParam } from "@/hooks/use-drawer-param";
import { haptics } from "@/lib/native/haptics";
import { formatMessage } from "@/lib/i18n/format";
import { createTypeAction } from "../actions";
import { parseOwnerKey } from "../schemas";
import { ManualField, type ManualFieldLabels } from "./manual-field";
import { Accessibility } from "lucide-react";
import {
  MarkdownEditor,
  type MarkdownToolLabels,
} from "@/components/markdown-editor";
import { PhotoGallery, type PhotoGalleryLabels } from "./photo-gallery";
import type { Locale } from "@/lib/i18n/locales";

export type TypeOwnerOption = { value: string; label: string };

export type TypeCreateLabels = {
  open: string;
  title: string;
  body: string;
  owner: string;
  ownerHint: string;
  name: string;
  namePlaceholder: string;
  seats: string;
  seatOptions: { value: number; label: string }[];
  wheelchair: string;
  wheelchairHint: string;
  description: string;
  descriptionPlaceholder: string;
  markdownHint: string;
  photo: string;
  manual: string;
  submit: string;
  created: string;
  nameRequired: string;
  gallery: PhotoGalleryLabels;
  markdown: MarkdownToolLabels;
  photoHint: string;
  manualHint: string;
  manualLabels: ManualFieldLabels;
  errors: NotifyLabels["errors"];
};

export function TypeCreateDrawer({
  owners,
  scopeQuery,
  labels,
  locale,
}: {
  owners: TypeOwnerOption[];
  scopeQuery: string;
  labels: TypeCreateLabels;
  locale: Locale;
}) {
  const router = useRouter();
  const { creating, openHref, close } = useDrawerParam();
  const formId = useId();
  const ownerId = useId();
  const nameId = useId();
  const seatsId = useId();
  const wheelchairId = useId();
  const descriptionId = useId();
  const [owner, setOwner] = useState(owners[0]?.value ?? "");
  const [name, setName] = useState("");
  const [seats, setSeats] = useState(2);
  const [wheelchair, setWheelchair] = useState(false);
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [manual, setManual] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setOwner(owners[0]?.value ?? "");
    setName("");
    setSeats(2);
    setWheelchair(false);
    setDescription("");
    setPhotos([]);
    setManual(null);
  };

  const dismiss = () => {
    reset();
    close();
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      haptics.warning();
      toast.error(labels.nameRequired);
      return;
    }
    startTransition(async () => {
      const result = await createTypeAction({
        owner: parseOwnerKey(owner),
        name: trimmed,
        seats,
        wheelchairAccessible: wheelchair,
        description: description.trim() || null,
        photoFileIds: photos,
        manualFileId: manual,
      });
      notify(result, {
        done: formatMessage(labels.created, { name: trimmed }, locale),
        errors: labels.errors,
      });
      if (!result.ok) return;
      reset();
      router.push(`/admin/trishaws/types/${result.id}${scopeQuery}`);
    });
  };

  if (owners.length === 0) return null;

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
        open={creating}
        onOpenChange={(next) => {
          if (!next && !pending) dismiss();
        }}
        dismissible={!pending}
        title={labels.title}
        description={labels.body}
        footer={
          <Button
            type="submit"
            form={formId}
            disabled={pending}
            variant="brand"
            className="min-h-11"
          >
            {labels.submit}
          </Button>
        }
      >
        <form
          id={formId}
          onSubmit={submit}
          onKeyDown={submitOnCmdEnter}
          aria-busy={pending}
          className="grid gap-5"
        >
          {owners.length > 1 ? (
            <Field>
              <FieldLabel htmlFor={ownerId}>{labels.owner}</FieldLabel>
              <NativeSelect
                id={ownerId}
                value={owner}
                onChange={(event) => setOwner(event.target.value)}
                className="h-11 border-line text-base"
              >
                {owners.map((option) => (
                  <NativeSelectOption
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldDescription>{labels.ownerHint}</FieldDescription>
            </Field>
          ) : null}

          <Field>
            <FieldLabel htmlFor={nameId}>{labels.name}</FieldLabel>
            <Input
              id={nameId}
              autoFocus
              required
              maxLength={80}
              autoComplete="off"
              placeholder={labels.namePlaceholder}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-11 border-line text-base"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor={seatsId}>{labels.seats}</FieldLabel>
            <NativeSelect
              id={seatsId}
              value={String(seats)}
              onChange={(event) => setSeats(Number(event.target.value))}
              className="h-11 border-line text-base"
            >
              {labels.seatOptions.map((option) => (
                <NativeSelectOption
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>

          <label
            htmlFor={wheelchairId}
            className="flex cursor-pointer items-center gap-3 rounded-(--r-card) border border-line px-3 py-3"
          >
            <Accessibility
              aria-hidden
              className="size-5 shrink-0 text-ink-soft"
            />
            <span className="grid min-w-0 flex-1 gap-1">
              <span className="text-sm leading-none font-medium">
                {labels.wheelchair}
              </span>
              <span className="text-2sm text-ink-soft">
                {labels.wheelchairHint}
              </span>
            </span>
            <Switch
              id={wheelchairId}
              checked={wheelchair}
              onCheckedChange={setWheelchair}
            />
          </label>

          <Field>
            <FieldLabel htmlFor={descriptionId}>
              {labels.description}
            </FieldLabel>
            <MarkdownEditor
              id={descriptionId}
              minRows={4}
              maxLength={10_000}
              labels={labels.markdown}
              placeholder={labels.descriptionPlaceholder}
              value={description}
              onChange={setDescription}
            />
          </Field>

          <div className="grid gap-2">
            <div className="grid gap-1">
              <span className="text-sm font-medium">{labels.photo}</span>
              <span className="text-2sm text-ink-soft">{labels.photoHint}</span>
            </div>
            <PhotoGallery
              kind="typePhoto"
              value={photos}
              alt={name}
              labels={labels.gallery}
              onChange={setPhotos}
              locale={locale}
            />
          </div>

          <div className="grid gap-2">
            <div className="grid gap-1">
              <span className="text-sm font-medium">{labels.manual}</span>
              <span className="text-2sm text-ink-soft">
                {labels.manualHint}
              </span>
            </div>
            <ManualField
              value={manual}
              onChange={setManual}
              labels={labels.manualLabels}
            />
          </div>
        </form>
      </AppDrawer>
    </>
  );
}
