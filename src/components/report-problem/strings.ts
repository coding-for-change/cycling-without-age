import type { ReportProblemStrings } from "@/lib/i18n/error-strings";

export type { ReportProblemStrings };

export type SupportStrings = {
  title: string;
  body: string;
  open: string;
  drawer: ReportProblemStrings;
};

export const REPORT_MIN_LENGTH = 10;
export const REPORT_MAX_LENGTH = 2000;
