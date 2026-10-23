import { CircleCheck } from "lucide-react";
import { rides } from "@/features/rides";
import { CheckInList } from "@/features/rides/components/check-in-list";
import { CompleteRideButton } from "@/features/rides/components/complete-ride-button";
import { toPersonChoice } from "@/features/rides/components/crew-choices";
import {
  checkInStrings,
  completeStrings,
  rideDayErrors,
  rideTally,
  walkUpStrings,
} from "@/features/rides/components/strings";
import { WalkUpDrawer } from "@/features/rides/components/walk-up-drawer";
import type { Locale as Notation } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { fullName } from "@/lib/utils";
import { DetailNotice, DetailSection } from "../../../_components/detail-page";
import { RelativeTime } from "../../../_components/timeline";
import { RidePilotAttendance } from "./ride-pilot-attendance";

type Ride = NonNullable<Awaited<ReturnType<typeof rides.getRideDetail>>>;

/**
 * Lifecycle 6: the same check-in and roster closing the pilots have on their
 * phones, for an admin recording or correcting a ride — plus marking a pilot
 * who never came.
 */
export function RideDay({
  ride,
  scopeQuery,
  dict,
  language,
  notation,
  now,
}: {
  ride: Ride;
  scopeQuery: string;
  dict: Dictionary;
  language: Locale;
  notation: Notation;
  now: Date;
}) {
  const day = dict.rides.execution;
  const doorOpen = rides.checkInOpen(ride, "admin", now);
  const completable = rides.canComplete(ride, "admin", now);
  const completed = ride.status === "completed";
  const seated = ride.roster.filter(
    (entry) => entry.attendance !== "cancelled",
  );
  const pilots = ride.assignments.filter(
    (assignment) => assignment.role === "pilot",
  );

  return (
    <DetailSection
      title={day.onTheDay}
      description={day.onTheDayHint}
      action={
        completable ? (
          <CompleteRideButton
            rideId={ride.id}
            labels={completeStrings(
              dict,
              rideTally(dict, { ...ride, roster: seated }, language),
              language,
            )}
            errors={rideDayErrors(dict)}
          />
        ) : null
      }
    >
      {completed ? (
        <DetailNotice icon={CircleCheck}>
          <p className="font-medium">{day.completedNotice}</p>
          {ride.completedAt ? (
            <p className="text-ink-soft">
              {ride.completedBy
                ? formatMessage(
                    day.completedBy,
                    { name: ride.completedBy.name },
                    language,
                  )
                : day.completedByFormer}
              {" · "}
              <RelativeTime
                at={ride.completedAt}
                notation={notation}
                words={language}
                now={now}
                timeZone={ride.chapter.timeZone}
              />
            </p>
          ) : null}
        </DetailNotice>
      ) : null}

      <div className="grid gap-3">
        <h3 className="text-2sm font-medium">{day.riders}</h3>
        <CheckInList
          compact
          rideId={ride.id}
          entries={seated.map((entry) => ({
            id: entry.id,
            name: entry.passenger
              ? fullName(entry.passenger)
              : (entry.guestName ?? ""),
            walkUp: !entry.passenger,
            attendance: entry.attendance,
          }))}
          open={doorOpen}
          language={language}
          labels={checkInStrings(dict)}
        />
        {doorOpen ? (
          <WalkUpDrawer
            rideId={ride.id}
            language={language}
            labels={walkUpStrings(dict)}
            triggerClassName="h-8 min-h-8 w-fit rounded-md text-2sm"
          />
        ) : null}
      </div>

      {pilots.length && ride.startsAt <= now ? (
        <div className="grid gap-3">
          <h3 className="text-2sm font-medium">{day.pilots}</h3>
          <RidePilotAttendance
            rideId={ride.id}
            pilots={pilots.map(({ user, attendance }) => ({
              ...toPersonChoice(user),
              href: `/admin/members/${user.id}${scopeQuery}`,
              attendance,
            }))}
            language={language}
            labels={{
              attendance: day.pilotAttendance,
              noShow: day.pilotNoShow,
              noShowLabel: day.pilotNoShowLabel,
              marked: day.pilotNoShowMarked,
              cleared: day.pilotNoShowCleared,
              errors: rideDayErrors(dict),
            }}
          />
        </div>
      ) : null}
    </DetailSection>
  );
}
