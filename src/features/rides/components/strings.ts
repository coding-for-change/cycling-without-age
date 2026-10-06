import type { Dictionary } from "@/lib/i18n";

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
