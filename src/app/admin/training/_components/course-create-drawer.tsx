"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { useDrawerParam } from "@/hooks/use-drawer-param";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { haptics } from "@/lib/native/haptics";
import { createCourseAction } from "@/features/training/actions";
import {
  parseOwnerKey,
  type ContentLanguage,
} from "@/features/training/schemas";
import { Segmented } from "../../_components/segmented";

export type CourseFamilyOption = {
  id: string;
  label: string;
  languages: string[];
};

export type CourseCreateLabels = {
  open: string;
  title: string;
  body: string;
  kindLabel: string;
  kinds: { family: string; translation: string };
  family: string;
  familyHint: string;
  language: string;
  languageTaken: string;
  courseTitle: string;
  titlePlaceholder: string;
  owner: string;
  ownerHint: string;
  submit: string;
  created: string;
  titleRequired: string;
  familyRequired: string;
  noFreeLanguage: string;
  errors: NotifyLabels["errors"];
};

type Kind = "family" | "translation";

export function CourseCreateDrawer({
  owners,
  defaultOwnerKey,
  families,
  languages,
  defaultLanguage,
  scopeQuery,
  labels,
  locale,
  trigger = true,
}: {
  owners: { key: string; label: string }[];
  defaultOwnerKey: string;
  families: CourseFamilyOption[];
  languages: { value: ContentLanguage; label: string }[];
  defaultLanguage: ContentLanguage;
  scopeQuery: string;
  labels: CourseCreateLabels;
  locale: Locale;
  trigger?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { creating, openHref, go } = useDrawerParam();
  const presetFamily = searchParams.get("family");
  const preset = families.find((family) => family.id === presetFamily);

  if (owners.length === 0 && families.length === 0) return null;

  return (
    <>
      {trigger && owners.length > 0 ? (
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
      ) : null}
      {creating ? (
        <CreateForm
          key={presetFamily ?? "new"}
          owners={owners}
          defaultOwnerKey={defaultOwnerKey}
          families={families}
          languages={languages}
          defaultLanguage={defaultLanguage}
          preset={preset ?? null}
          labels={labels}
          locale={locale}
          onClose={() =>
            go((params) => {
              params.delete("new");
              params.delete("family");
            })
          }
          onCreated={(courseId) =>
            router.push(`/admin/training/courses/${courseId}${scopeQuery}`)
          }
        />
      ) : null}
    </>
  );
}

function firstFree(
  languages: { value: ContentLanguage }[],
  taken: string[],
  preferred: ContentLanguage,
) {
  if (!taken.includes(preferred)) return preferred;
  return (
    languages.find((language) => !taken.includes(language.value))?.value ??
    preferred
  );
}

function CreateForm({
  owners,
  defaultOwnerKey,
  families,
  languages,
  defaultLanguage,
  preset,
  labels,
  locale,
  onClose,
  onCreated,
}: {
  owners: { key: string; label: string }[];
  defaultOwnerKey: string;
  families: CourseFamilyOption[];
  languages: { value: ContentLanguage; label: string }[];
  defaultLanguage: ContentLanguage;
  preset: CourseFamilyOption | null;
  labels: CourseCreateLabels;
  locale: Locale;
  onClose: () => void;
  onCreated: (courseId: string) => void;
}) {
  const formId = useId();
  const familyId = useId();
  const languageId = useId();
  const titleId = useId();
  const ownerId = useId();
  const canCreateFamily = owners.length > 0;
  const [kind, setKind] = useState<Kind>(
    preset || !canCreateFamily ? "translation" : "family",
  );
  const [family, setFamily] = useState(preset?.id ?? families[0]?.id ?? "");
  const taken =
    kind === "translation"
      ? (families.find((row) => row.id === family)?.languages ?? [])
      : [];
  const [language, setLanguage] = useState<ContentLanguage>(
    firstFree(languages, preset?.languages ?? [], defaultLanguage),
  );
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState(defaultOwnerKey);
  const [pending, startTransition] = useTransition();

  const pickFamily = (next: string) => {
    setFamily(next);
    const nextTaken = families.find((row) => row.id === next)?.languages ?? [];
    setLanguage((current) => firstFree(languages, nextTaken, current));
  };

  const pickKind = (next: Kind) => {
    setKind(next);
    if (next === "translation") pickFamily(family);
  };

  const noFreeLanguage =
    kind === "translation" &&
    languages.every((option) => taken.includes(option.value));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      haptics.warning();
      toast.error(labels.titleRequired);
      return;
    }
    if (kind === "translation" && !family) {
      haptics.warning();
      toast.error(labels.familyRequired);
      return;
    }
    startTransition(async () => {
      const result = await createCourseAction(
        kind === "family"
          ? { kind, owner: parseOwnerKey(owner), language, title: trimmed }
          : { kind, familyId: family, language, title: trimmed },
      );
      notify(result, {
        done: formatMessage(labels.created, { name: trimmed }, locale),
        errors: labels.errors,
      });
      if (result.ok) onCreated(result.courseId);
    });
  };

  return (
    <AppDrawer
      open
      onOpenChange={(next) => {
        if (!next && !pending) onClose();
      }}
      dismissible={!pending}
      title={labels.title}
      description={labels.body}
      footer={
        <Button
          type="submit"
          form={formId}
          disabled={pending || noFreeLanguage}
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
        {canCreateFamily && families.length > 0 ? (
          <Field>
            <FieldLabel>{labels.kindLabel}</FieldLabel>
            <Segmented
              value={kind}
              onChange={pickKind}
              label={labels.kindLabel}
              wide
              options={[
                { value: "family", label: labels.kinds.family },
                { value: "translation", label: labels.kinds.translation },
              ]}
            />
          </Field>
        ) : null}

        {kind === "translation" ? (
          <Field>
            <FieldLabel htmlFor={familyId}>{labels.family}</FieldLabel>
            <NativeSelect
              id={familyId}
              value={family}
              onChange={(event) => pickFamily(event.target.value)}
              className="h-11 border-line text-base"
            >
              {families.map((option) => (
                <NativeSelectOption
                  key={option.id}
                  value={option.id}
                >
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldDescription>
              {noFreeLanguage ? labels.noFreeLanguage : labels.familyHint}
            </FieldDescription>
          </Field>
        ) : null}

        <Field>
          <FieldLabel htmlFor={languageId}>{labels.language}</FieldLabel>
          <NativeSelect
            id={languageId}
            value={language}
            onChange={(event) =>
              setLanguage(event.target.value as ContentLanguage)
            }
            className="h-11 border-line text-base"
          >
            {languages.map((option) => {
              const exists = taken.includes(option.value);
              return (
                <NativeSelectOption
                  key={option.value}
                  value={option.value}
                  disabled={exists}
                >
                  {exists
                    ? formatMessage(
                        labels.languageTaken,
                        { language: option.label },
                        locale,
                      )
                    : option.label}
                </NativeSelectOption>
              );
            })}
          </NativeSelect>
        </Field>

        <Field>
          <FieldLabel htmlFor={titleId}>{labels.courseTitle}</FieldLabel>
          <Input
            id={titleId}
            value={title}
            maxLength={160}
            autoFocus
            autoComplete="off"
            placeholder={labels.titlePlaceholder}
            onChange={(event) => setTitle(event.target.value)}
            className="h-11 border-line text-base"
          />
        </Field>

        {kind === "family" && owners.length > 1 ? (
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
                  key={option.key}
                  value={option.key}
                >
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldDescription>{labels.ownerHint}</FieldDescription>
          </Field>
        ) : null}
      </form>
    </AppDrawer>
  );
}
