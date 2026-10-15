import { formatDuration, wordsLocale } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";

export const rideErrors = (dict: Dictionary) => ({
  ...dict.common.errors,
  ...dict.rides.errors,
});

export const rideDetailStrings = (dict: Dictionary) => {
  const { detail, schedule, errors, when, people } = dict.rides;
  return {
    ...detail,
    ...dict.common.field,
    date: when.date,
    capacity: schedule.capacity,
    chapterLocation: schedule.chapterLocation,
    eventTitle: schedule.eventTitle,
    map: schedule.mapLabel,
    mapUnavailable: schedule.mapUnavailable,
    pilots: people.pilots.label,
    full: errors.rideFull,
    place: { ...dict.common.address, ...detail.place },
  };
};

export const rideHistoryStrings = (dict: Dictionary) => {
  const { history } = dict.rides;
  const { someone, nothing, change, fields } = dict.admin.history;
  return {
    ...history,
    someone,
    nothing,
    change,
    fields: { ...history.fields, description: fields.description },
  };
};

export type RideHistoryStrings = ReturnType<typeof rideHistoryStrings>;
export type RideErrors = ReturnType<typeof rideErrors>;
export type RideDetailStrings = ReturnType<typeof rideDetailStrings>;

export const rideDayErrors = (dict: Dictionary) => ({
  ...dict.common.errors,
  ...dict.rides.execution.errors,
});

export const checkInStrings = (
  dict: Dictionary,
  contact: { call?: string; via?: string } = {},
) => {
  const day = dict.rides.execution;
  return {
    attendance: day.attendance,
    walkUpBadge: day.walkUp.badge,
    checkInLabel: day.checkInLabel,
    checkedIn: day.checkedIn,
    checkedInCount: day.checkedInCount,
    undone: day.undone,
    undo: day.undo,
    removeWalkUp: day.removeWalkUp,
    removed: day.walkUp.removed,
    removeTitle: day.walkUp.removeTitle,
    removeBody: day.walkUp.removeBody,
    removeConfirm: day.walkUp.removeConfirm,
    cancel: day.walkUp.keep,
    noRiders: day.noRiders,
    nobodyRode: day.nobodyRode,
    ...contact,
    errors: rideDayErrors(dict),
  };
};

export const walkUpStrings = (dict: Dictionary) => {
  const { walkUp, addWalkUp } = dict.rides.execution;
  return {
    open: addWalkUp,
    title: walkUp.title,
    body: walkUp.body,
    firstName: walkUp.firstName,
    lastName: walkUp.lastName,
    submit: walkUp.submit,
    submitting: walkUp.submitting,
    added: walkUp.added,
    errors: rideDayErrors(dict),
  };
};

export const debriefStrings = (dict: Dictionary) => ({
  ...dict.rides.execution.debrief,
  errors: rideDayErrors(dict),
});

/** "3 riders checked in, 1 trishaw, 2 hr" — what closing the roster will count. */
export const rideTally = (
  dict: Dictionary,
  ride: {
    roster: { attendance: string }[];
    trishaws: unknown[];
    startsAt: Date;
    endsAt: Date;
  },
  language: string,
) =>
  formatMessage(
    dict.rides.execution.tally,
    {
      riders: ride.roster.filter((entry) => entry.attendance === "checkedIn")
        .length,
      trishaws: ride.trishaws.length,
      duration: formatDuration(
        (ride.endsAt.getTime() - ride.startsAt.getTime()) / 1000,
        wordsLocale(language),
      ),
    },
    language,
  );

export const completeStrings = (
  dict: Dictionary,
  tally: string,
  language: string,
) => {
  const { complete } = dict.rides.execution;
  return {
    ...complete,
    body: formatMessage(complete.body, { tally }, language),
  };
};
