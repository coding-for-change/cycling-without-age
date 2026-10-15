"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCharacter } from "@/components/character";
import { Field } from "@/components/person-fields";
import {
  RiderCard,
  RiderSummary,
  emptyRider,
  isRiderComplete,
  riderPayload,
  type RiderCardStrings,
  type RiderDraft,
} from "@/components/riders/rider-card";
import { MAX_MANAGED_RIDERS } from "@/features/passengers/schemas";
import { formatDate, resolveLocale } from "@/lib/format";
import { formatMessage } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/locales";
import { haptics } from "@/lib/native/haptics";
import { Step, StepError, type StepProgress } from "../../_components/step";
import { resolveAddress, suggestAddresses } from "@/features/profile/actions";
import { submitRiders } from "../actions";

type Strings = Omit<RiderCardStrings, "rider"> & {
  title: string;
  body: string;
  you: string;
  rider: string;
  add: string;
  addFirst: string;
  bornOn: string;
  submit: string;
  relationship: { label: string; options: Record<string, string> };
  errors: Record<string, string>;
};

const lookup = {
  search: (input: { query: string; sessionToken: string }) =>
    suggestAddresses(input),
  resolve: resolveAddress,
};

export function RidersStep({
  progress,
  defaults,
  strings,
  continueLabel,
  locale,
}: {
  progress: StepProgress | null;
  continueLabel: string;
  defaults: { firstName: string; lastName: string };
  strings: Strings;
  locale: Locale;
}) {
  const router = useRouter();
  const { oops } = useCharacter();
  const [firstName, setFirstName] = useState(defaults.firstName);
  const [lastName, setLastName] = useState(defaults.lastName);
  const [relationship, setRelationship] = useState("");
  const [riders, setRiders] = useState<RiderDraft[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const editing = riders.find((rider) => rider.key === open) ?? null;
  const settled = !editing || isRiderComplete(editing);
  const complete =
    Boolean(firstName.trim() && lastName.trim()) &&
    riders.length > 0 &&
    riders.every(isRiderComplete);

  const patch = (key: string, next: Partial<RiderDraft>) => {
    setError(null);
    setRiders((current) =>
      current.map((rider) =>
        rider.key === key ? { ...rider, ...next } : rider,
      ),
    );
  };

  const add = () => {
    haptics.tap();
    const rider = emptyRider();
    setRiders((current) => [...current, rider]);
    setOpen(rider.key);
  };

  const edit = (key: string) => {
    if (!settled) {
      haptics.warning();
      return;
    }
    setOpen(key);
  };

  const remove = (key: string) => {
    setRiders((current) => current.filter((rider) => rider.key !== key));
    if (open === key) setOpen(null);
  };

  const notation = resolveLocale(locale);
  const meta = (rider: RiderDraft) =>
    [
      rider.residence === "home" && rider.home
        ? rider.home.address.split(",")[0]
        : strings.pickup.careHome,
      rider.birthDate
        ? formatMessage(
            strings.bornOn,
            { date: formatDate(rider.birthDate, notation) },
            locale,
          )
        : null,
    ]
      .filter(Boolean)
      .join(" · ");

  const submit = () =>
    startTransition(async () => {
      const result = await submitRiders({
        firstName,
        lastName,
        relationship: relationship || undefined,
        riders: riders.map(riderPayload),
      });
      if (!result.ok) {
        haptics.error();
        oops();
        setError(strings.errors[result.error] ?? strings.errors.generic);
        return;
      }
      haptics.success();
      router.push(result.next, { transitionTypes: ["nav-forward"] });
    });

  return (
    <Step
      title={strings.title}
      description={strings.body}
      progress={progress ?? undefined}
      action={
        <>
          {error && <StepError>{error}</StepError>}
          <Button
            disabled={!complete || pending}
            onClick={submit}
            variant="brand"
            size="hero"
          >
            {riders.length > 0
              ? formatMessage(strings.submit, { count: riders.length }, locale)
              : continueLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-ink-soft">{strings.you}</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field
              id="caretaker-first-name"
              label={strings.firstName}
            >
              <Input
                id="caretaker-first-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                autoComplete="given-name"
                className="h-11 rounded-(--r-card) border-line text-base"
              />
            </Field>
            <Field
              id="caretaker-last-name"
              label={strings.lastName}
            >
              <Input
                id="caretaker-last-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                autoComplete="family-name"
                className="h-11 rounded-(--r-card) border-line text-base"
              />
            </Field>
          </div>
          <div>
            <Label
              htmlFor="relationship"
              className="mb-1.5 text-sm font-medium text-ink-soft"
            >
              {strings.relationship.label}
            </Label>
            <select
              id="relationship"
              value={relationship}
              onChange={(event) => setRelationship(event.target.value)}
              className="h-11 w-full rounded-(--r-card) border border-line bg-canvas px-3 text-base text-ink focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
            >
              <option value="">—</option>
              {Object.entries(strings.relationship.options).map(
                ([key, label]) => (
                  <option
                    key={key}
                    value={key}
                  >
                    {label}
                  </option>
                ),
              )}
            </select>
          </div>
        </section>

        <section className="space-y-1.25">
          {riders.map((rider, index) =>
            rider.key === open ? (
              <RiderCard
                key={rider.key}
                rider={rider}
                title={
                  `${rider.firstName} ${rider.lastName}`.trim() ||
                  formatMessage(strings.rider, { number: index + 1 }, locale)
                }
                strings={strings}
                lookup={lookup}
                onChange={(next) => patch(rider.key, next)}
                onRemove={() => remove(rider.key)}
                onDone={() => setOpen(null)}
              />
            ) : (
              <RiderSummary
                key={rider.key}
                rider={rider}
                meta={meta(rider)}
                strings={strings}
                onEdit={() => edit(rider.key)}
                onRemove={() => remove(rider.key)}
              />
            ),
          )}

          {settled && riders.length < MAX_MANAGED_RIDERS && (
            <button
              type="button"
              onClick={() => {
                setOpen(null);
                add();
              }}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-full border border-mint bg-mint-tint px-4 text-base font-medium text-ink transition-colors hover:bg-mint focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none",
                riders.length === 0 ? "h-14" : "mt-2 h-12",
              )}
            >
              <Plus
                className="size-4"
                aria-hidden
              />
              {riders.length === 0 ? strings.addFirst : strings.add}
            </button>
          )}
        </section>
      </div>
    </Step>
  );
}
