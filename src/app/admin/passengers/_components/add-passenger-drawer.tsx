"use client";

import Link from "next/link";
import { useId, useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { addAssistedPassenger } from "@/features/accounts/actions";
import { gender as genderSchema } from "@/features/profile/schemas";
import {
  looksLikePhone,
  parseIdentity,
  type CountryCode,
} from "@/lib/identity";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { AdminDrawer, submitOnCmdEnter } from "../../_components/admin-drawer";
import { notify } from "@/components/action-feedback";
import { useDrawerParam } from "../../_components/use-drawer-param";
import { TextField } from "../../_components/text-field";
import {
  PickupField,
  pickupPayload,
  type PickupStrings,
  type PickupValue,
} from "./pickup-field";

const GENDERS = genderSchema.options;

const schemaOf = (country: CountryCode, invalid: string) => {
  const text = z.string().trim().min(1, invalid);
  return z
    .object({
      firstName: text,
      lastName: text,
      birthDate: text,
      gender: genderSchema,
      contact: z.string().trim(),
      withHelper: z.boolean(),
      helperName: z.string().trim(),
      helperRelationship: z.string().trim(),
      helperContact: z.string().trim(),
    })
    .superRefine((values, ctx) => {
      if (!values.withHelper) {
        if (!parseIdentity(values.contact, country).ok)
          ctx.addIssue({ code: "custom", message: invalid, path: ["contact"] });
        return;
      }
      if (!values.helperName)
        ctx.addIssue({
          code: "custom",
          message: invalid,
          path: ["helperName"],
        });
      if (!values.helperRelationship)
        ctx.addIssue({
          code: "custom",
          message: invalid,
          path: ["helperRelationship"],
        });
      if (!parseIdentity(values.helperContact, country).ok)
        ctx.addIssue({
          code: "custom",
          message: invalid,
          path: ["helperContact"],
        });
    });
};

const CARE_HOME: PickupValue = { residence: "careHome" };

type FormValues = z.infer<ReturnType<typeof schemaOf>>;

const normalise = (value: string, country: CountryCode) => {
  const parsed = parseIdentity(value, country);
  return parsed.ok ? parsed.identity.value : null;
};

export type AddPassengerLabels = {
  open: string;
  title: string;
  body: string;
  contact: string;
  helper: string;
  helperName: string;
  helperRelationship: string;
  helperContact: string;
  helperNext: {
    title: string;
    existing: string;
    fresh: string;
    someone: string;
  };
  submit: string;
  another: string;
  anotherHint: string;
  added: string;
  sent: string;
  errors: {
    exists: string;
    tooMany: string;
    invalid: string;
    generic: string;
  };
};

export function AddPassengerDrawer({
  chapterId,
  country,
  labels,
  pickup: pickupStrings,
  relationships,
  person,
  locale,
}: {
  chapterId: string;
  country: CountryCode;
  labels: AddPassengerLabels;
  pickup: PickupStrings;
  relationships: Record<string, string>;
  locale: Locale;
  person: {
    firstName: string;
    lastName: string;
    birthDate: string;
    gender: string;
    genders: Record<(typeof GENDERS)[number], string>;
  };
}) {
  const { creating: open, openHref, close: clearParam } = useDrawerParam();
  const formId = useId();
  const anotherId = useId();
  const [another, setAnother] = useState(false);
  const [pickup, setPickup] = useState<PickupValue>(CARE_HOME);
  const [pickupMissing, setPickupMissing] = useState(false);
  const [pending, startTransition] = useTransition();
  const schema = useMemo(
    () => schemaOf(country, labels.errors.invalid),
    [country, labels.errors.invalid],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      birthDate: "",
      contact: "",
      withHelper: false,
      helperName: "",
      helperRelationship: "",
      helperContact: "",
    },
  });

  const resetPickup = () => {
    setPickup(CARE_HOME);
    setPickupMissing(false);
  };

  const close = () => {
    form.reset();
    resetPickup();
    clearParam();
  };

  const [withHelper, helperName, helperContact, firstName, lastName] = useWatch(
    {
      control: form.control,
      name: [
        "withHelper",
        "helperName",
        "helperContact",
        "firstName",
        "lastName",
      ],
    },
  );
  const next = {
    helper: helperName.trim() || labels.helperNext.someone,
    passenger: `${firstName} ${lastName}`.trim() || labels.helperNext.someone,
    channel: looksLikePhone(helperContact) ? "phone" : "email",
  };

  const submit = form.handleSubmit((data) => {
    const identity = data.withHelper ? null : normalise(data.contact, country);
    if (!data.withHelper && !identity) return;
    const place = pickupPayload(pickup);
    if (!place) {
      setPickupMissing(true);
      return;
    }
    startTransition(async () => {
      const result = await addAssistedPassenger({
        chapterId,
        firstName: data.firstName,
        lastName: data.lastName,
        birthDate: data.birthDate,
        gender: data.gender,
        ...(identity ? { contact: identity } : {}),
        helper: data.withHelper
          ? {
              name: data.helperName,
              relationship: data.helperRelationship,
              contact:
                normalise(data.helperContact, country) ?? data.helperContact,
            }
          : undefined,
        pickup: place,
      });
      notify(result, {
        done: formatMessage(
          !result.ok || result.outcome === "created"
            ? labels.added
            : labels.sent,
          {
            name: `${data.firstName} ${data.lastName}`.trim(),
            helper: data.helperName.trim(),
            channel: looksLikePhone(data.helperContact) ? "phone" : "email",
          },
          locale,
        ),
        errors: labels.errors,
      });
      if (!result.ok) return;
      if (!another) {
        close();
        return;
      }
      form.reset();
      resetPickup();
      form.setFocus("firstName");
    });
  });

  return (
    <>
      <Button
        asChild
        variant="brand"
        className="min-h-11"
      >
        <Link href={openHref}>
          <UserPlus aria-hidden />
          {labels.open}
        </Link>
      </Button>

      <AdminDrawer
        open={open}
        onOpenChange={(next) => {
          if (!next) close();
        }}
        title={labels.title}
        description={labels.body}
        footer={
          <>
            <div className="mr-auto flex items-center gap-3">
              <Switch
                id={anotherId}
                checked={another}
                onCheckedChange={setAnother}
              />
              <label
                htmlFor={anotherId}
                className="grid gap-1"
              >
                <span className="text-sm leading-none font-medium">
                  {labels.another}
                </span>
                <span className="text-2sm text-ink-soft">
                  {labels.anotherHint}
                </span>
              </label>
            </div>
            <Button
              type="submit"
              form={formId}
              disabled={pending}
              variant="brand"
              className="min-h-11"
            >
              {labels.submit}
            </Button>
          </>
        }
      >
        <Form {...form}>
          <form
            id={formId}
            onSubmit={submit}
            onKeyDown={submitOnCmdEnter}
            aria-busy={pending}
            className="grid gap-5"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                control={form.control}
                name="firstName"
                label={person.firstName}
                autoFocus
                autoComplete="off"
              />
              <TextField
                control={form.control}
                name="lastName"
                label={person.lastName}
                autoComplete="off"
              />
              <TextField
                control={form.control}
                name="birthDate"
                label={person.birthDate}
                type="date"
                max={new Date().toISOString().slice(0, 10)}
              />
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{person.gender}</FormLabel>
                    <FormControl>
                      <NativeSelect
                        value={field.value ?? ""}
                        onChange={(event) => field.onChange(event.target.value)}
                        onBlur={field.onBlur}
                        name={field.name}
                        wrapperClassName="w-full"
                        className="h-11 border-line text-base"
                      >
                        <NativeSelectOption
                          value=""
                          disabled
                        >
                          —
                        </NativeSelectOption>
                        {GENDERS.map((option) => (
                          <NativeSelectOption
                            key={option}
                            value={option}
                          >
                            {person.genders[option]}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="sm:col-span-2">
                <PickupField
                  value={pickup}
                  onChange={(next) => {
                    setPickupMissing(false);
                    setPickup(next);
                  }}
                  strings={pickupStrings}
                  invalid={pickupMissing}
                  language={locale}
                />
              </div>
              {withHelper ? null : (
                <div className="sm:col-span-2">
                  <TextField
                    control={form.control}
                    name="contact"
                    label={labels.contact}
                    autoComplete="off"
                  />
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="withHelper"
              render={({ field }) => (
                <FormItem className="flex min-h-11 flex-row items-center gap-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) =>
                        field.onChange(checked === true)
                      }
                      className="size-5 border-line data-[state=checked]:border-mint-deep data-[state=checked]:bg-mint-deep"
                    />
                  </FormControl>
                  <FormLabel className="font-normal">{labels.helper}</FormLabel>
                </FormItem>
              )}
            />

            {withHelper ? (
              <div className="grid gap-5 rounded-2xl bg-canvas-deep p-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="helperName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{labels.helperName}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          autoComplete="off"
                          className="h-11 border-line bg-canvas text-base"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="helperRelationship"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{labels.helperRelationship}</FormLabel>
                      <FormControl>
                        <NativeSelect
                          value={field.value}
                          onChange={(event) =>
                            field.onChange(event.target.value)
                          }
                          onBlur={field.onBlur}
                          name={field.name}
                          wrapperClassName="w-full"
                          className="h-11 border-line bg-canvas text-base"
                        >
                          <NativeSelectOption
                            value=""
                            disabled
                          >
                            —
                          </NativeSelectOption>
                          {Object.entries(relationships).map(
                            ([value, label]) => (
                              <NativeSelectOption
                                key={value}
                                value={value}
                              >
                                {label}
                              </NativeSelectOption>
                            ),
                          )}
                        </NativeSelect>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="sm:col-span-2">
                  <FormField
                    control={form.control}
                    name="helperContact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{labels.helperContact}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            autoComplete="off"
                            className="h-11 border-line bg-canvas text-base"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div
                  role="status"
                  className="grid gap-1.25 rounded-xl bg-mint-tint px-3 py-2.75 text-sm text-ink sm:col-span-2"
                >
                  <p className="font-medium">{labels.helperNext.title}</p>
                  <ul className="grid list-disc gap-1.25 pl-5">
                    <li>
                      {formatMessage(labels.helperNext.existing, next, locale)}
                    </li>
                    <li>
                      {formatMessage(labels.helperNext.fresh, next, locale)}
                    </li>
                  </ul>
                </div>
              </div>
            ) : null}
          </form>
        </Form>
      </AdminDrawer>
    </>
  );
}
