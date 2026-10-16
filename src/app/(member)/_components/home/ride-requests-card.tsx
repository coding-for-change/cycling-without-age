import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import { perspectiveViewerSession } from "@/lib/auth-guards";
import { resolveLocale, wordsLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import {
  RideRequestsList,
  loadRideRequests,
} from "../../passenger/rides/_components/ride-requests-list";
import { MEMBER_LIFE } from "../instant";

/** The passenger start screen keeps every open request in sight. */
export async function RideRequestsCard() {
  "use cache: private";
  cacheLife(MEMBER_LIFE);

  const [session, dict, language, head] = await Promise.all([
    perspectiveViewerSession("passenger"),
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  if (!session) return null;
  const requests = await loadRideRequests(session.user.id);

  return (
    <RideRequestsList
      requests={requests}
      dict={dict}
      notation={resolveLocale(head.get("accept-language"))}
      words={wordsLocale(language)}
    />
  );
}
