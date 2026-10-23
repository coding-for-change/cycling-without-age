import type { ReactNode } from "react";
import { chapters } from "@/features/chapters";
import { markdownToolLabels } from "@/components/markdown-editor";
import { Skeleton } from "@/components/ui/skeleton";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/locales";
import { DetailSection } from "../../../_components/detail-page";
import { BookingSettings } from "./booking-settings";
import { NotificationSettings } from "./notification-settings";
import { PostRideInstructions } from "./post-ride-instructions";
import { ReminderSettings } from "./reminder-settings";
import { RidingHoursSettings } from "./riding-hours-settings";
import { StaffingSettings } from "./staffing-settings";

function SettingsGroup({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <h3 className="text-2sm font-medium">{title}</h3>
      <p className="max-w-prose text-2sm text-ink-soft">{body}</p>
      {children}
    </div>
  );
}

export async function ChapterSettings({
  chapterId,
  dict,
  language,
}: {
  chapterId: string;
  dict: Dictionary;
  language: Locale;
}) {
  const settings = await chapters.getSettings(chapterId);
  const strings = dict.admin.settings;
  const sections = dict.admin.chapters.detail.sections;
  const field = strings.notifications.field;

  return (
    <>
      <DetailSection
        title={sections.booking}
        description={strings.booking.body}
      >
        <BookingSettings
          chapterId={chapterId}
          settings={settings}
          dict={dict}
          language={language}
        />
        <RidingHoursSettings
          chapterId={chapterId}
          dict={dict}
          language={language}
        />
      </DetailSection>

      <DetailSection
        title={strings.staffing.title}
        description={strings.staffing.body}
      >
        <StaffingSettings
          chapterId={chapterId}
          settings={settings}
          language={language}
          labels={{ ...strings.staffing, field }}
        />
      </DetailSection>

      <DetailSection title={sections.notifications}>
        <SettingsGroup
          title={strings.reminders.title}
          body={strings.reminders.body}
        >
          <ReminderSettings
            chapterId={chapterId}
            settings={settings}
            language={language}
            labels={{ ...strings.reminders, field }}
          />
        </SettingsGroup>
        <SettingsGroup
          title={strings.notifications.title}
          body={strings.notifications.body}
        >
          <NotificationSettings
            chapterId={chapterId}
            settings={settings}
            labels={strings.notifications}
          />
        </SettingsGroup>
      </DetailSection>

      <DetailSection
        title={strings.postRide.title}
        description={strings.postRide.body}
      >
        <PostRideInstructions
          chapterId={chapterId}
          value={settings.postRideInstructions}
          labels={{
            ...strings.postRide,
            markdown: markdownToolLabels(dict),
            field,
          }}
        />
      </DetailSection>
    </>
  );
}

const SECTION_LINES = [
  ["w-44", "w-72", "w-64", "w-56"],
  ["w-32", "w-64", "w-52"],
  ["w-52", "w-72", "w-60", "w-48"],
  ["w-36", "w-64"],
];

export function ChapterSettingsSkeleton() {
  return SECTION_LINES.map(([heading, ...lines], index) => (
    <div
      key={index}
      className="grid gap-3 border-t border-line pt-6"
    >
      <Skeleton className={`h-5 ${heading}`} />
      {lines.map((width) => (
        <Skeleton
          key={width}
          className={`h-10 ${width} max-w-full`}
        />
      ))}
    </div>
  ));
}
