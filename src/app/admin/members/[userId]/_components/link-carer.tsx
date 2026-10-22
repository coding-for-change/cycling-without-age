"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { HeartHandshake } from "lucide-react";
import { notify } from "@/components/action-feedback";
import { AppDrawer, submitOnCmdEnter } from "@/components/app-drawer";
import {
  PeoplePicker,
  type PeoplePickerStrings,
  type PersonOption,
} from "@/components/people-picker";
import { Button } from "@/components/ui/button";
import { requestCarerLinkAction } from "@/features/passengers/actions";
import { useDrawerParam } from "@/hooks/use-drawer-param";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { PROPERTY_BUTTON } from "../../../_components/properties";

const PARAM = "link-carer";

type Strings = {
  open: string;
  drawerTitle: string;
  drawerBody: string;
  noMembers: string;
  submit: string;
  done: string;
  picker: PeoplePickerStrings;
};

export function LinkCarer({
  passengerId,
  rider,
  chapter,
  members,
  strings,
  errors,
  language,
}: {
  passengerId: string;
  rider: string;
  chapter: string;
  members: PersonOption[];
  strings: Strings;
  errors: Record<string, string> & { generic: string };
  language: Locale;
}) {
  const formId = useId();
  const { go, withParam } = useDrawerParam();
  const open = useSearchParams().get(PARAM) === "1";
  const [picked, setPicked] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const say = (template: string, values: Record<string, string> = {}) =>
    formatMessage(template, { rider, chapter, ...values }, language);

  const close = () => go((params) => params.delete(PARAM));

  const openFresh = () => {
    setPicked([]);
    go((params) => params.set(PARAM, "1"));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending || !picked.length) return;
    const name = members.find((member) => member.id === picked[0])?.name ?? "";
    startTransition(async () => {
      const result = await requestCarerLinkAction({
        passengerId,
        caretakerUserId: picked[0],
      });
      notify(result, { done: say(strings.done, { name }), errors });
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
          href={withParam(PARAM, "1")}
          onClick={(event) => {
            event.preventDefault();
            openFresh();
          }}
        >
          <HeartHandshake aria-hidden />
          {strings.open}
        </a>
      </Button>
      <AppDrawer
        open={open}
        onOpenChange={(next) => {
          if (!next && !pending) close();
        }}
        dismissible={!pending}
        title={say(strings.drawerTitle)}
        description={say(strings.drawerBody)}
        footer={
          <Button
            type="submit"
            form={formId}
            variant="brand"
            disabled={pending || !picked.length}
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
          {members.length ? (
            <PeoplePicker
              options={members}
              value={picked}
              onChange={(ids) => setPicked(ids.slice(-1))}
              strings={strings.picker}
              locale={language}
              max={1}
            />
          ) : (
            <p className="text-2sm text-ink-soft">{say(strings.noMembers)}</p>
          )}
        </form>
      </AppDrawer>
    </>
  );
}
