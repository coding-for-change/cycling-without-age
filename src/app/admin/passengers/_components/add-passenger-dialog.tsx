"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { addAssistedPassenger } from "@/features/accounts/actions";
import { assistedPassengerInput } from "@/features/accounts/schemas";
import { parseIdentity, type CountryCode } from "@/lib/identity";
import { fill } from "@/lib/utils";
import { notify } from "../../_components/action-feedback";

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
  added: string;
  errors: { exists: string; invalid: string; generic: string };
};

export function AddPassengerDialog({
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
  const router = useRouter();
  const [open, setOpen] = useState(false);
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
      form.reset();
      setOpen(false);
      router.refresh();
    });
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className="min-h-11 bg-red text-white hover:bg-red-hover">
          <UserPlus aria-hidden />
          {labels.open}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <Form {...form}>
          <form
            onSubmit={submit}
            aria-busy={pending}
            className="grid gap-5"
          >
            <DialogHeader>
              <DialogTitle>{labels.title}</DialogTitle>
              <DialogDescription className="text-ink-soft">
                {labels.body}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{person.firstName}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        autoComplete="off"
                        className="h-11 border-line text-base"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{person.lastName}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        autoComplete="off"
                        className="h-11 border-line text-base"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{person.birthDate}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        max={new Date().toISOString().slice(0, 10)}
                        className="h-11 border-line text-base"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
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
                <FormField
                  control={form.control}
                  name="contact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{labels.contact}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          autoComplete="off"
                          className="h-11 border-line text-base"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
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

            <DialogFooter>
              <Button
                type="submit"
                disabled={pending}
                className="min-h-11"
              >
                {labels.submit}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
