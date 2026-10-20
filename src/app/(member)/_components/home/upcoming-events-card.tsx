import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import { perspectiveViewerSession } from "@/lib/auth-guards";
import { resolveLocale, wordsLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import {
  UpcomingEvents,
  loadUpcomingEvents,
} from "../../passenger/rides/_components/upcoming-events";
import { MEMBER_LIFE } from "../instant";

/** The passenger start screen's invitation to the chapter's next events. */
export async function UpcomingEventsCard() {
  "use cache: private";
  cacheLife(MEMBER_LIFE);

  const [session, dict, language, head] = await Promise.all([
    perspectiveViewerSession("passenger"),
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  if (!session) return null;
  const events = await loadUpcomingEvents(session.user.id);

  return (
    <UpcomingEvents
      events={events}
      dict={dict}
      locale={resolveLocale(head.get("accept-language"))}
      words={wordsLocale(language)}
    />
  );
}
