import { calendarDate } from "./calendar";
import { formatDate, formatDateMedium, type Locale } from "./format";

export type DateStyle = "short" | "medium";

export const formatInstantDate = (
  value: Date | string,
  notation: Locale,
  timeZone: string,
  style: DateStyle = "short",
) => {
  const day = calendarDate(new Date(value), timeZone);
  return style === "medium"
    ? formatDateMedium(day, notation)
    : formatDate(day, notation);
};
