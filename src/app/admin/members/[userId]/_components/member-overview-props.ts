import {
  formatDate,
  formatNumber,
  formatRelativeTime,
  wordsLocale,
  type Locale as Notation,
} from "@/lib/format";
import { calendarDate } from "@/lib/calendar";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import {
  attentionItems,
  readinessOf,
  trainingPercent,
  type AttentionItem,
} from "./member-overview";
import type { OverviewStripView } from "./member-overview-strip";
import type { TrainingCourseView } from "./pilot-training";

const SHOWN_ITEMS = 3;

export function memberOverviewProps({
  dict,
  notation,
  words,
  timeZone,
  now,
  training,
  rides,
}: {
  dict: Dictionary;
  notation: Notation;
  words: string;
  timeZone: string;
  now: Date;
  training: {
    trainingRequired: boolean;
    chapters: { name: string; ready: boolean }[];
    inPerson: { confirmed: boolean };
    courses: TrainingCourseView[];
    readyLabels: { ready: string; notReady: string };
  } | null;
  rides: { done: number; upcoming: number; lastRideAt: Date | null };
}): OverviewStripView {
  const labels = dict.admin.person.overview;
  const say = (template: string, values: Record<string, string | number>) =>
    formatMessage(template, values, words);
  const showRides = training !== null || rides.done > 0 || rides.upcoming > 0;

  const gauge = training?.trainingRequired
    ? (() => {
        const percent = trainingPercent(
          training.courses,
          training.inPerson.confirmed,
        );
        const percentLabel = formatNumber(percent / 100, notation, {
          style: "percent",
          maximumFractionDigits: 0,
        });
        const readiness = readinessOf(training.chapters);
        return {
          title: labels.training,
          percent,
          percentLabel,
          gaugeLabel: say(labels.percentDone, { percent: percentLabel }),
          ready: readiness.state === "ready",
          readyLabel:
            readiness.state === "ready"
              ? labels.ready
              : readiness.state === "partial"
                ? say(labels.readyIn, {
                    ready: readiness.ready,
                    total: readiness.total,
                  })
                : labels.notReady,
          readyTitle: training.chapters
            .map(
              (chapter) =>
                `${chapter.name}: ${
                  chapter.ready
                    ? training.readyLabels.ready
                    : training.readyLabels.notReady
                }`,
            )
            .join("\n"),
        };
      })()
    : null;

  const items = training
    ? attentionItems({
        trainingRequired: training.trainingRequired,
        inPersonConfirmed: training.inPerson.confirmed,
        courses: training.courses,
      })
    : [];
  const itemLabel = (item: AttentionItem) =>
    item.kind === "inPerson"
      ? labels.items.inPerson
      : say(labels.items[item.kind], { course: item.course });
  const hidden = items.length - SHOWN_ITEMS;

  return {
    label: labels.label,
    training: gauge,
    rides: showRides
      ? {
          title: labels.rides,
          value: formatNumber(rides.done, notation),
          detail: say(labels.upcoming, { count: rides.upcoming }),
        }
      : null,
    lastRide: showRides
      ? rides.lastRideAt
        ? {
            title: labels.lastRide,
            label: formatRelativeTime(
              rides.lastRideAt,
              wordsLocale(words),
              now,
            ),
            at: rides.lastRideAt.toISOString(),
            absolute: formatDate(
              calendarDate(rides.lastRideAt, timeZone),
              notation,
            ),
          }
        : {
            title: labels.lastRide,
            label: labels.noRide,
            at: null,
            absolute: null,
          }
      : null,
    attention: training
      ? {
          title: labels.attention,
          count: formatNumber(items.length, notation),
          items: items.slice(0, SHOWN_ITEMS).map(itemLabel),
          more: hidden > 0 ? say(labels.more, { count: hidden }) : null,
          allGood: labels.allGood,
        }
      : null,
  };
}
