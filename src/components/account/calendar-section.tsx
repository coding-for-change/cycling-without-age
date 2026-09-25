"use client";

import { useId, useState, useSyncExternalStore, useTransition } from "react";
import {
  CalendarPlus,
  Check,
  Copy,
  LockKeyhole,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import {
  notify,
  type ActionResult,
  type NotifyLabels,
} from "@/components/action-feedback";
import {
  SettingsGroup,
  SettingsItem,
  SettingsRow,
  SettingsRowButton,
  SettingsRowLink,
  type SettingsRowTone,
} from "@/components/settings-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
  disableCalendarFeedAction,
  enableCalendarFeedAction,
  resetCalendarFeedAction,
  type CalendarFeedActionResult,
  type CalendarFeedState,
} from "@/features/calendar-feeds/actions";
import { formatRelativeTime, wordsLocale } from "@/lib/format";
import { haptics } from "@/lib/native/haptics";
import { nativePlatform } from "@/lib/native/platform";
import { fill } from "@/lib/utils";
import type { AccountData } from "./types";

type CalendarStrings = AccountData["strings"]["calendar"];

const unchanging = () => () => {};
const onServer = () => "web" as const;
const notOnServer = () => false;

/**
 * Google subscribes to a calendar by link only from a computer; on a phone the
 * same link opens the Google Calendar app, which has no way to take it.
 */
const onPhone = () =>
  nativePlatform() !== "web" || window.matchMedia("(pointer: coarse)").matches;

const subscribeLinks = (url: string) => {
  const webcal = url.replace(/^https?:/, "webcal:");
  return {
    apple: webcal,
    google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`,
    outlook: `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(url)}`,
    outlookWork: `https://outlook.office.com/calendar/0/addfromweb?url=${encodeURIComponent(url)}`,
  };
};

export function CalendarSection({
  data,
  label,
}: {
  data: AccountData;
  label?: string;
}) {
  const strings = data.strings.calendar;
  const [feed, setFeed] = useState<CalendarFeedState | null>(data.calendarFeed);
  const [pending, startTransition] = useTransition();

  const change = async (action: () => Promise<CalendarFeedActionResult>) => {
    const result = await action();
    if (result.ok) setFeed(result.feed);
    return result;
  };

  const enable = () =>
    startTransition(async () => {
      notify(await change(enableCalendarFeedAction), {
        done: strings.enabled,
        errors: strings.errors,
      });
    });

  if (!feed)
    return (
      <SettingsGroup
        label={label}
        footer={strings.body}
      >
        <SettingsRow
          icon={CalendarPlus}
          tone="action"
          label={strings.enable}
          disabled={pending}
          onClick={enable}
        />
      </SettingsGroup>
    );

  return (
    <FeedDetails
      feed={feed}
      label={label}
      strings={strings}
      language={data.language}
      onReset={() => change(resetCalendarFeedAction)}
      onDisable={() => change(disableCalendarFeedAction)}
    />
  );
}

function FeedDetails({
  feed,
  label,
  strings,
  language,
  onReset,
  onDisable,
}: {
  feed: CalendarFeedState;
  label?: string;
  strings: CalendarStrings;
  language: string;
  onReset: () => Promise<CalendarFeedActionResult>;
  onDisable: () => Promise<CalendarFeedActionResult>;
}) {
  const id = useId();
  const links = subscribeLinks(feed.url);
  const platform = useSyncExternalStore(unchanging, nativePlatform, onServer);
  const phone = useSyncExternalStore(unchanging, onPhone, notOnServer);

  return (
    <div
      data-sentry-block
      className="grid min-w-0 gap-5"
    >
      <SettingsGroup
        label={label}
        footer={
          <p>
            {feed.lastFetchedAt
              ? fill(strings.checked, {
                  when: formatRelativeTime(
                    feed.lastFetchedAt,
                    wordsLocale(language),
                  ),
                })
              : strings.waiting}{" "}
            {strings.cadence}
          </p>
        }
      >
        <SettingsItem className="focus-within:bg-canvas-deep">
          <label
            htmlFor={id}
            className="sr-only"
          >
            {strings.link}
          </label>
          <Input
            id={id}
            readOnly
            value={feed.url}
            onFocus={(event) => event.currentTarget.select()}
            className="h-11 rounded-none border-0 bg-transparent px-0 font-mono text-base text-ink-soft shadow-none focus-visible:ring-0 md:text-sm"
          />
        </SettingsItem>
        <CopyRow
          value={feed.url}
          label={strings.copy}
          copiedLabel={strings.copied}
        />
      </SettingsGroup>

      <SettingsGroup
        label={strings.addTo}
        footer={
          <>
            {phone && <p>{strings.googleOnPhone}</p>}
            <p>{strings.otherApps}</p>
          </>
        }
      >
        {platform !== "android" && (
          <SettingsItem>
            <SettingsRowLink
              href={links.apple}
              label={strings.apps.apple}
              chevron
            />
          </SettingsItem>
        )}
        {!phone && (
          <SettingsItem>
            <SettingsRowLink
              href={links.google}
              label={strings.apps.google}
              external
            />
          </SettingsItem>
        )}
        <SettingsItem>
          <SettingsRowLink
            href={links.outlook}
            label={strings.apps.outlook}
            external
          />
        </SettingsItem>
        <SettingsItem>
          <SettingsRowLink
            href={links.outlookWork}
            label={strings.apps.outlookWork}
            external
          />
        </SettingsItem>
      </SettingsGroup>

      <SettingsGroup
        footer={
          <p className="flex items-start gap-2">
            <LockKeyhole
              aria-hidden
              className="mt-0.5 size-4 shrink-0"
            />
            {strings.private}
          </p>
        }
      >
        <ConfirmRow
          icon={RefreshCw}
          tone="action"
          label={strings.reset.open}
          title={strings.reset.title}
          body={strings.reset.body}
          confirm={strings.reset.confirm}
          cancel={strings.cancel}
          done={strings.reset.done}
          errors={strings.errors}
          action={onReset}
        />
        <ConfirmRow
          tone="destructive"
          label={strings.disable.open}
          title={strings.disable.title}
          body={strings.disable.body}
          confirm={strings.disable.confirm}
          cancel={strings.cancel}
          done={strings.disable.done}
          errors={strings.errors}
          action={onDisable}
        />
      </SettingsGroup>
    </div>
  );
}

function CopyRow({
  value,
  label,
  copiedLabel,
}: {
  value: string;
  label: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(value).then(
      () => {
        haptics.tap();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {},
    );
  };

  return (
    <SettingsRow
      icon={copied ? Check : Copy}
      tone="action"
      label={copied ? copiedLabel : label}
      aria-live="polite"
      onClick={copy}
    />
  );
}

function ConfirmRow({
  icon,
  tone,
  label,
  title,
  body,
  confirm,
  cancel,
  done,
  errors,
  action,
}: {
  icon?: LucideIcon;
  tone: SettingsRowTone;
  label: string;
  title: string;
  body: string;
  confirm: string;
  cancel: string;
  done: string;
  errors: NotifyLabels["errors"];
  action: () => Promise<ActionResult>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const destructive = tone === "destructive";

  const run = () => {
    if (destructive) haptics.tap();
    startTransition(async () => {
      const result = await action();
      notify(result, { done, errors });
      if (result.ok) setOpen(false);
    });
  };

  return (
    <SettingsItem>
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (!pending) setOpen(next);
        }}
      >
        <AlertDialogTrigger asChild>
          <SettingsRowButton
            icon={icon}
            tone={tone}
            label={label}
            disabled={pending}
          />
        </AlertDialogTrigger>
        <AlertDialogContent aria-busy={pending}>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription className="text-ink-soft">
              {body}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={pending}
              className="min-h-11 border-line"
            >
              {cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                run();
              }}
              variant={destructive ? "brand" : "default"}
              className="min-h-11"
            >
              {confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsItem>
  );
}
