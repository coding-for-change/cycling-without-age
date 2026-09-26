"use client";

import {
  useId,
  useState,
  useSyncExternalStore,
  useTransition,
  type ReactNode,
} from "react";
import { ArrowUpRight, CalendarPlus, LockKeyhole } from "lucide-react";
import { notify } from "@/components/action-feedback";
import { ConfirmButton } from "@/components/confirm-button";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  disableCalendarFeedAction,
  enableCalendarFeedAction,
  resetCalendarFeedAction,
  type CalendarFeedActionResult,
  type CalendarFeedState,
} from "@/features/calendar-feeds/actions";
import { formatRelativeTime, wordsLocale } from "@/lib/format";
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

export function CalendarSection({ data }: { data: AccountData }) {
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

  return (
    <div className="grid gap-4">
      <p className="max-w-prose text-sm text-ink-soft">{strings.body}</p>
      {feed ? (
        <FeedDetails
          feed={feed}
          strings={strings}
          language={data.language}
          onReset={() => change(resetCalendarFeedAction)}
          onDisable={() => change(disableCalendarFeedAction)}
        />
      ) : (
        <Button
          variant="outline"
          disabled={pending}
          onClick={enable}
          className="min-h-11 justify-self-start rounded-full border-line"
        >
          <CalendarPlus aria-hidden />
          {strings.enable}
        </Button>
      )}
    </div>
  );
}

function FeedDetails({
  feed,
  strings,
  language,
  onReset,
  onDisable,
}: {
  feed: CalendarFeedState;
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
      className="grid gap-4"
    >
      <div className="grid gap-2">
        <label
          htmlFor={id}
          className="text-2sm font-medium"
        >
          {strings.link}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id={id}
            readOnly
            value={feed.url}
            onFocus={(event) => event.currentTarget.select()}
            className="min-h-11 flex-1 basis-60 border-line bg-canvas-deep font-mono text-2sm text-ink-soft md:text-2sm"
          />
          <CopyButton
            value={feed.url}
            label={strings.copy}
            copiedLabel={strings.copied}
            className="border-line"
          />
        </div>
        <p className="text-2sm text-ink-soft">
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
      </div>

      <div className="grid gap-2">
        <span className="text-2sm font-medium">{strings.addTo}</span>
        <div className="flex flex-wrap gap-2">
          {platform !== "android" && (
            <AppLink href={links.apple}>{strings.apps.apple}</AppLink>
          )}
          {!phone && (
            <AppLink
              href={links.google}
              external
            >
              {strings.apps.google}
            </AppLink>
          )}
          <AppLink
            href={links.outlook}
            external
          >
            {strings.apps.outlook}
          </AppLink>
          <AppLink
            href={links.outlookWork}
            external
          >
            {strings.apps.outlookWork}
          </AppLink>
        </div>
        {phone && (
          <p className="text-2sm text-ink-soft">{strings.googleOnPhone}</p>
        )}
        <p className="text-2sm text-ink-soft">{strings.otherApps}</p>
      </div>

      <p className="flex items-start gap-3 rounded-(--r-card) bg-mint-tint p-3 text-2sm">
        <LockKeyhole
          aria-hidden
          className="mt-0.5 size-4 shrink-0"
        />
        {strings.private}
      </p>

      <div className="flex flex-wrap gap-2">
        <ConfirmButton
          variant="ghost"
          size="default"
          label={strings.reset.open}
          title={strings.reset.title}
          body={strings.reset.body}
          confirm={strings.reset.confirm}
          cancel={strings.cancel}
          done={strings.reset.done}
          errors={strings.errors}
          action={onReset}
          className="min-h-11 text-ink-soft hover:text-ink"
        />
        <ConfirmButton
          variant="ghost"
          size="default"
          label={strings.disable.open}
          title={strings.disable.title}
          body={strings.disable.body}
          confirm={strings.disable.confirm}
          cancel={strings.cancel}
          done={strings.disable.done}
          errors={strings.errors}
          action={onDisable}
          destructive
          className="min-h-11 text-ink-soft hover:text-ink"
        />
      </div>
    </div>
  );
}

function AppLink({
  href,
  external = false,
  children,
}: {
  href: string;
  external?: boolean;
  children: ReactNode;
}) {
  return (
    <Button
      asChild
      variant="outline"
      className="min-h-11 rounded-full border-line"
    >
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {children}
        {external && (
          <ArrowUpRight
            aria-hidden
            className="text-ink-soft"
          />
        )}
      </a>
    </Button>
  );
}
