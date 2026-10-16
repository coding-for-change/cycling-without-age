# Passenger view — plan on top of main's ride domain

Status: plan, nothing implemented. Replaces the earlier ride-request plan, which built on a
`RideRequest` model that main does not have.

## Starting point (main)

- The rider area lives in `src/app/(member)/passenger/` and shares the member shell
  (`member-shell`, `member-page`, `nav.ts`, tab bar) with the pilot area.
- **Home** works: `Greeting`, `NextRideCard` (28 days via `rides.listRidesForPassengers`), `ChapterCards`.
- **Rides** and **Calendar** are `MemberPage` placeholders. **Chat** is fully built.
- Booking = a `RideRosterEntry` on a scheduled `Ride`. History = `RideLogEntry`.
  Ride status: `scheduled | cancelled | completed`, with a structured `cancellationReasonCode`.
- Every ride action in `features/rides/actions.ts` is admin-only (`adminOfRide`). A passenger
  cannot book or cancel a ride for themselves yet.
- No ride notification kind exists in `use-cases/notifications/kinds/`.
- Strings live in `src/messages/app/{en,da,de}.json`. Use `formatMessage` from `@/lib/i18n/format`.

## Who "the passenger" is

A user can be a rider themselves (`Passenger.userId`) and/or manage riders (`managedByUserId`:
relatives, care staff). Every passenger surface works on the set
`[getOwnPassenger(userId), ...listPassengersManagedBy(userId)]`. The same set is the authorization
scope for every passenger action.

## Increments

Each increment ships on its own: schemas → services → facade → action → UI → commands → security check.

### P1 — Rides list (`/passenger/rides`)
- Replaces the placeholder. Shows upcoming and past rides of all riders in the scope, grouped by
  day. Each row shows which rider is booked.
- Data: `rides.listRidesForPassengers(passengerIds, from, to)`. Past rides are paged by cursor
  (needs a passenger variant of `listRidesForList`, filtered by roster).
- Shows status badges (scheduled / cancelled with reason / completed) and the ride model
  (event / pleasure / functional, including destination and return leg).
- Skeleton via `loading.tsx` plus `<Suspense>`. ViewTransition from row to detail.

### P2 — Ride detail (`/passenger/rides/[rideId]`)
- Header: when, where (map link, destination for functional rides), model.
- Story column: a timeline from `rides.listRideLog`, **filtered to events meant for riders**
  (scheduled, rescheduled, cancelled, riderBooked/Removed, pilotAssigned). Internal notes and
  roster reordering are not shown.
- Properties column: status, booked riders from the scope, pilot with all details,
  a calendar button (single-event `.ics` via `lib/ics.ts`).
- Guard: the ride must have a `RideRosterEntry` for a passenger in the scope, otherwise `notFound()`.
  No access by guessing an ID.

### P3 — Book yourself / a managed rider (phase 4, Ride Roster Booking)
- New: a list of bookable rides (`status = scheduled`, capacity left, chapter of the rider, in the
  future). Is this a page or a section under Rides? Open question.
- New action `bookOwnRideAction(rideId, passengerId)` in `features/rides/actions.ts`:
  `requirePerspective("passenger")` → passenger is in the scope → `use-cases/book-rider.ts`
  (already checks chapter membership; `requireRoom` checks capacity). Booking person =
  `bookedByUserId`.
- Which ride models a rider may book themselves must be **configurable per chapter**
  (Event = usually booked by the coordinator; Pleasure / public = self-enrol).

### P4 — Cancel your own booking
- New action `cancelOwnBookingAction(rideId, passengerId)` → `rides.cancelBooking`, same scope
  guard, only while `scheduled` and no later than 4 h before `startsAt`.
- Confirmation dialog (not a drawer). Haptic `warning` plus toast.
- RFP 5.b: if every rider cancels, the scheduler is told → see P6.

### P5 — Calendar (`/passenger/calendar`)
- Replaces the placeholder. A month/agenda view over the same data as P1 (the `RideAgenda`
  component is already there).
- Calendar subscription: use `features/calendar-feeds` (`enableCalendarFeedAction` …), check that
  `listRidesForCalendarFeed` covers passenger rides (managed riders included).

### P6 — Notifications
- New notification kinds in `use-cases/notifications/kinds/` for the outbox events
  `ride.rescheduled`, `ride.cancelled`, `ride.riderBooked`, `ride.riderRemoved`. Recipients: the
  rider's user plus the `managedByUserId` of every rider on the roster.
- Reminder before the ride (RFP phase 5 pre-ride: "confirm or cancel") — needs a scheduled job;
  check whether the worker supports delayed events.
- Shows up in the existing bell (`notifications.*`) and via push (`lib/push.ts`).

### P7 — Chat on the ride (postponed)
- `Conversation.origin = ride` already exists. Decide whether booked riders / managers join the
  ride's chat, or only the pilot ↔ rider direct chat (`startDirectChatAction`).

### P8 — Profile and riders
- Own rider details via `updateOwnRiderDetails` (birthDate, gender) and `saveOwnPassenger`.
- Managing riders: list, add (`addPassenger`), edit — inline editing per AGENTS.md.
- Notification settings: `setNotificationPreferencesAction`.
- Our old UI (text size, editable rows, "empty character") is in tag `backup/cod-176-pre-merge`
  and can be reused as reference.

## Decisions (2026-10-13)

1. **Self-booking**: configurable per chapter — the chapter decides which ride models riders may
   book themselves. Needs a chapter setting (P3).
2. **Cancellation**: possible up to **4 h** before `startsAt`; enforced in the facade, not only in the UI.
   Whether a reason is required is still open.
3. **Pilot**: riders see all of the assigned pilot's details.
4. **Ride Request**: not coming back — **no new model**. Riders only book existing rides.
   Waiver, Care Center and preferred time of day stay out of scope too.
5. **Chat**: not now. P7 is dropped from this round.

## Recommended order

P1 → P2 → P4 → P3 → P6 → P5 → P8. (P7 chat later.)
