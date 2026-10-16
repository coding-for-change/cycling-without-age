"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRightLeft, UserPlus, Users } from "lucide-react";
import { notify } from "@/components/action-feedback";
import { AppDrawer, submitOnCmdEnter } from "@/components/app-drawer";
import { PeoplePicker, type PersonOption } from "@/components/people-picker";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { handOverRiderAction } from "@/features/passengers/actions";
import { useDrawerParam } from "@/hooks/use-drawer-param";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { parseIdentity, type CountryCode } from "@/lib/identity";
import { PROPERTY_BUTTON } from "../../../_components/properties";
import { Segmented } from "../../../_components/segmented";

type Strings = Dictionary["admin"]["passengers"]["handOver"];
type Mode = "member" | "invite";

/**
 * Handing a rider over is a change of who books for them, made in a drawer
 * whose open state is the URL (`?handover=1`): someone already in the chapter,
 * or someone new who gets an account and an invitation.
 */
export function HandOverRider({
  passengerId,
  rider,
  chapter,
  members,
  country,
  strings,
  errors,
  language,
}: {
  passengerId: string;
  rider: string;
  chapter: string;
  members: PersonOption[];
  country: CountryCode;
  strings: Strings;
  errors: Record<string, string> & { generic: string };
  language: Locale;
}) {
  const formId = useId();
  const nameId = useId();
  const contactId = useId();
  const hintId = useId();
  const errorId = useId();
  const { go, withParam } = useDrawerParam();
  const open = useSearchParams().get("handover") === "1";
  const [mode, setMode] = useState<Mode>(members.length ? "member" : "invite");
  const [picked, setPicked] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [pending, startTransition] = useTransition();

  const nameMissing = invalid && !name.trim();
  const contactWrong = invalid && !parseIdentity(contact, country).ok;

  const close = () =>
    go((params) => {
      params.delete("handover");
    });

  const openFresh = () => {
    setMode(members.length ? "member" : "invite");
    setPicked([]);
    setName("");
    setContact("");
    setInvalid(false);
    go((params) => params.set("handover", "1"));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const identity = parseIdentity(contact, country);
    if (mode === "invite" && (!name.trim() || !identity.ok)) {
      setInvalid(true);
      return;
    }
    if (mode === "member" && !picked.length) return;
    const next =
      mode === "member"
        ? (members.find((member) => member.id === picked[0])?.name ?? "")
        : name.trim();
    startTransition(async () => {
      const result = await handOverRiderAction({
        passengerId,
        target:
          mode === "member"
            ? { kind: "member", userId: picked[0] }
            : {
                kind: "invite",
                name: name.trim(),
                contact: identity.ok ? identity.identity.value : contact,
              },
      });
      notify(result, {
        done: formatMessage(
          result.ok && result.invited ? strings.invited : strings.done,
          { rider, name: next },
          language,
        ),
        errors,
      });
      if (result.ok) close();
    });
  };

  return (
    <>
      <Button
        asChild
        variant="outline"
        className={PROPERTY_BUTTON}
      >
        <a
          href={withParam("handover", "1")}
          onClick={(event) => {
            event.preventDefault();
            openFresh();
          }}
        >
          <ArrowRightLeft aria-hidden />
          {strings.open}
        </a>
      </Button>
      <AppDrawer
        open={open}
        onOpenChange={(next) => {
          if (!next && !pending) close();
        }}
        dismissible={!pending}
        title={formatMessage(strings.title, { rider }, language)}
        description={formatMessage(strings.body, { rider }, language)}
        footer={
          <Button
            type="submit"
            form={formId}
            variant="brand"
            disabled={pending || (mode === "member" && !picked.length)}
            className="min-h-11"
          >
            {strings.submit}
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
          <Segmented
            wide
            label={strings.modeLabel}
            value={mode}
            onChange={setMode}
            options={[
              {
                value: "member",
                label: strings.member,
                icon: Users,
              },
              { value: "invite", label: strings.invite, icon: UserPlus },
            ]}
          />
          {mode === "member" ? (
            members.length ? (
              <PeoplePicker
                options={members}
                value={picked}
                onChange={(ids) => setPicked(ids.slice(-1))}
                strings={strings.picker}
                locale={language}
                max={1}
              />
            ) : (
              <p className="text-2sm text-ink-soft">
                {formatMessage(strings.noMembers, { chapter }, language)}
              </p>
            )
          ) : (
            <>
              <Field data-invalid={nameMissing || undefined}>
                <FieldLabel htmlFor={nameId}>{strings.name}</FieldLabel>
                <Input
                  id={nameId}
                  autoComplete="off"
                  maxLength={120}
                  value={name}
                  aria-invalid={nameMissing || undefined}
                  aria-describedby={invalid ? errorId : undefined}
                  onChange={(event) => {
                    setInvalid(false);
                    setName(event.target.value);
                  }}
                />
              </Field>
              <Field data-invalid={contactWrong || undefined}>
                <FieldLabel htmlFor={contactId}>{strings.contact}</FieldLabel>
                <Input
                  id={contactId}
                  autoComplete="off"
                  value={contact}
                  aria-invalid={contactWrong || undefined}
                  aria-describedby={invalid ? `${hintId} ${errorId}` : hintId}
                  onChange={(event) => {
                    setInvalid(false);
                    setContact(event.target.value);
                  }}
                />
                <FieldDescription id={hintId}>
                  {strings.contactHint}
                </FieldDescription>
              </Field>
              {invalid ? (
                <FieldError id={errorId}>{strings.invalid}</FieldError>
              ) : null}
            </>
          )}
        </form>
      </AppDrawer>
    </>
  );
}
