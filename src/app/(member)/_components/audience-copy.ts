import { formatMessage } from "@/lib/i18n/format";
import type { PassengerAudience } from "@/use-cases/passenger-audience";

export const audienceCopy = (
  audience: PassengerAudience | null,
  own: string,
  caretaker: string,
  locale: string,
) =>
  !audience || audience.who === "self"
    ? own
    : formatMessage(
        caretaker,
        { who: audience.who, name: audience.name },
        locale,
      );
