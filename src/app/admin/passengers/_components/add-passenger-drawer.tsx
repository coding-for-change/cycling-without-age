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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { addAssistedPassenger } from "@/features/accounts/actions";
import { assistedPassengerInput } from "@/features/accounts/schemas";
import { parseIdentity, type CountryCode } from "@/lib/identity";
import { fill } from "@/lib/utils";
import { AdminDrawer, submitOnCmdEnter } from "../../_components/admin-drawer";
import { notify } from "../../_components/action-feedback";
import { useDrawerParam } from "../../_components/use-drawer-param";
import { TextField } from "../../_components/text-field";

const GENDERS = assistedPassengerInput.shape.gender.options;

const schemaOf = (country: CountryCode, invalid: string) => {
  const text = z.string().trim().min(1, invalid);
  return z
    .object({
      firstName: text,
      lastName: text,
      birthDate: text,
      gender: assistedPassengerInput.shape.gender,
      contact: text.refine(
        (value) => parseIdentity(value, country).ok,
        invalid,
      ),
      withHelper: z.boolean(),
      helperName: z.string().trim(),
      helperRelationship: z.string().trim(),
      helperContact: z.string().trim(),
    })
    .superRefine((values, ctx) => {
      if (!values.withHelper) return;
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
  helperIsAccountHolder: string;
  submit: string;
  another: string;
  anotherHint: string;
  added: string;
  errors: { exists: string; invalid: string; generic: string };
};

export function AddPassengerDrawer({
  chapterId,
  country,
  labels,
  person,
}: {
  chapterId: string;
  country: CountryCode;
  labels: AddPassengerLabels;
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

  const close = () => {
    form.reset();
    clearParam();
  };

  const [withHelper, contact, helperContact, helperName, firstName, lastName] =
    useWatch({
      control: form.control,
      name: [
        "withHelper",
        "contact",
        "helperContact",
        "helperName",
        "firstName",
        "lastName",
      ],
    });
  const helperOwns =
    withHelper &&
    helperName.trim() !== "" &&
    normalise(contact, country) !== null &&
    normalise(contact, country) === normalise(helperContact, country);

  const submit = form.handleSubmit((data) => {
    const identity = normalise(data.contact, country);
    if (!identity) return;
    startTransition(async () => {
      const result = await addAssistedPassenger({
        chapterId,
        firstName: data.firstName,
        lastName: data.lastName,
        birthDate: data.birthDate,
        gender: data.gender,
        contact: identity,
        helper: data.withHelper
          ? {
              name: data.helperName,
              relationship: data.helperRelationship,
              contact:
                normalise(data.helperContact, country) ?? data.helperContact,
            }
          : undefined,
      });
      notify(result, {
        done: fill(labels.added, {
          name: `${data.firstName} ${data.lastName}`.trim(),
        }),
        errors: labels.errors,
      });
      if (!result.ok) return;
      if (!another) {
        close();
        return;
      }
      form.reset();
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
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11 w-full border-line text-base">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GENDERS.map((option) => (
                          <SelectItem
                            key={option}
                            value={option}
                          >
                            {person.genders[option]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="sm:col-span-2">
                <TextField
                  control={form.control}
                  name="contact"
                  label={labels.contact}
                  autoComplete="off"
                />
              </div>
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
                {helperOwns ? (
                  <p
                    role="status"
                    className="rounded-xl bg-mint-tint px-3 py-2 text-sm text-ink sm:col-span-2"
                  >
                    {fill(labels.helperIsAccountHolder, {
                      helper: helperName.trim(),
                      passenger: `${firstName} ${lastName}`.trim(),
                    })}
                  </p>
                ) : null}
              </div>
            ) : null}
          </form>
        </Form>
      </AdminDrawer>
    </>
  );
}
