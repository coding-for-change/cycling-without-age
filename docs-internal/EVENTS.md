# Domain events, queue and worker

The pipeline that turns "something happened" into inbox rows, push and email. The decisions
behind it live in [ARCHITECTURE.md](ARCHITECTURE.md) (*The Worker*, *Notification bell*,
*Chat*); the Firebase credential is documented next to `FIREBASE_SERVICE_ACCOUNT` in
`.env.example` and read only by `src/lib/push.ts`. This file is how it works and how to add
to it.

The promise: an event is **defined once, emitted once**, and any number of listeners run
from it, asynchronously and with retries. Adding a listener never touches the code that
emitted the event.

## The path of one event

```mermaid
flowchart LR
  F["membership.decideApplication<br/>business write + Event row<br/>ONE transaction"] -->|after commit| EQ[("events queue")]
  SW["sweeper, every 60s<br/>Event rows with processedAt null"] --> EQ
  EQ --> D["dispatcher<br/>one job per listener"]
  D --> HQ[("handlers queue")]
  HQ --> N[notify]
  HQ --> RA[recordActivity]
  N --> NR[("Notification rows<br/>the bell reads these")]
  N --> PQ[("push queue")]
  N --> EMQ[("email queue<br/>rate limited")]
  PQ --> DP["deliverPush<br/>Delivery row + FCM"]
  EMQ --> DE["deliverEmail<br/>Delivery row + Resend"]
```

Nothing in the request path waits for any of that. `decideApplication` returns as soon as
its transaction commits.

## Adding an event

1. **Define it** in `src/lib/events/catalog.ts`. Ids and facts only, never a message.
   `scopeOf` in `store.ts` copies `actorUserId` and `chapterId` onto the row when the
   event carries them. The two `countryAdmin.*` events have no chapter at all, so they
   store **`chapterId: null`** — the country and the appointee live in the payload. The
   history line they produce is global for the same reason, visible only to a reader whose
   scope is global.
2. **Emit it** from the facade that owns the write, inside `transaction`:

   ```ts
   return transaction(async (tx, emit) => {
     const ride = await insertRide(tx, data);
     await emit({ type: "ride.requested", rideId: ride.id, chapterId: ride.chapterId });
     return ride;
   });
   ```

   Every service on that path needs a `db: Prisma.TransactionClient = prisma` parameter.
   Emit **once**: guard the emit on the write having actually changed something, the way
   `joinAsPassenger` stays silent when the member already had the role.
3. **Decide who listens** in `src/worker/handlers.ts`. This file will not compile until you
   do — the registry is exhaustive over `EventType`. That is the feature, not a nuisance.
4. **If `notify` is one of them**, add a kind in `src/use-cases/notifications/kinds/` and
   list it in that folder's `index.ts`. A kind is the whole notification in one file: the
   event, category, delivery policy, recipients, the payload schema and how to fill it,
   the href, and `message`, which turns the payload, the recipient's strings and their
   locale into a subject, heading, body, note and call to action. The inbox row, the push
   banner and the mail all render from that one message.
5. **Copy** goes into `src/messages/email/{en,da,de}.json`. When the message sets a
   `template`, that id must exist under `admin.history.templates` in
   `src/messages/app/{en,da,de}.json` too — the activity feed falls back to "approval" for an
   id it does not know. `src/use-cases/notifications/kinds/messages.test.ts` pins the set.
6. **If it should show in the member history**, add a builder to
   `src/worker/listeners/record-activity.ts` and list `recordActivity` next to `notify` in
   `handlers.ts`. The listener throws for an event without a builder, so the two always
   agree.

`notify`, `deliverEmail` and `deliverPush` are generic and never change for a new kind. A
new *category* is only a new value in the Zod enum in
`src/features/notifications/schemas.ts`; the column is a string, so there is no migration.
A new category does need an icon in the bell's map
(`src/components/notifications/notification-bell-menu.tsx`), which is typed over the enum
and will not compile without one.

## What a kind decides

```ts
type DeliveryPolicy = {
  push: boolean;
  email: "always" | "ifNoPush" | "never";
  optional: boolean;
};
```

- The **inbox row is always created**, whatever the policy says. Push and email are
  deliveries derived from it.
- `optional: true` hands the decision to the recipient's `notifyPush` / `notifyEmail`.
  Essential kinds (an invite, a decision on an application) ignore both.
- `notify` enqueues a `push` job immediately when `policy.push`, an `email` job
  immediately when `email === "always"`, and an `email` job **delayed by
  `EMAIL_FALLBACK_DELAY_MS` (2 min)** when `email === "ifNoPush"`. The jobId is
  `${notificationId}-${channel}`, so a re-dispatch of the same event enqueues nothing new.
- Every preference and reachability check runs **at delivery time**, in the delivery use
  case, so every outcome is a `Delivery` row rather than a silence: `"opted out"`,
  `"no email address"`, `"no device"`, `"push not configured"`,
  `"email disabled for kind"`, `"disabled by chapter"`.
- The fallback rule lives in `deliverEmail`. When the delayed `ifNoPush` job wakes up it
  skips with `"already read"` if the notification has a `readAt`, and with
  `"push delivered"` if the sibling `push` delivery is `sent`. Otherwise the mail goes out.
- `collapseKey?(event)` is optional and lands on the `Notification` row. It is the handle
  for "five ride requests become one card" later. `trishawDamageReported`, `rideOpened`,
  `ridePilotWithdrew`, `rideAnnounced`, `rideRequestSubmitted` and `rideRequestWithdrawn`
  (`requests:{chapterId}`) set one, but nothing reads the column yet:
  `deliverPush` does not pass it to `sendPush` and the bell does not group by it, so no
  notification collapses today. Which kinds should replace each other's banners is COD-267.
- `chapterAllowsPush?(chapterId)` is optional too: the **chapter's** say on the push
  channel, read in `deliverPush` right after the recipient's own preference, so a chapter
  that switched the alert off still leaves a `Delivery` row — `"disabled by chapter"` —
  instead of a silence. A kind without the hook has no chapter switch.
  `pilotApplication.submitted` answers it from
  `chapters.getSettings(chapterId).applicationAlertPush`; an event with `chapterId: null`
  always passes, because there is no chapter to ask.
- A kind may instead consult `chapters.getSettings` in **`recipients`** and suppress itself
  entirely: `chapter.memberJoined` returns `[]` when the chapter turned
  `notifyOnMemberJoined` off, so no inbox row is written at all. Use that when the chapter
  is switching off *the notification*, and `chapterAllowsPush` when it is switching off
  *one channel* and the bell should still fill.
- `deliverEmail` looks up `replyToEmail` for the event's chapter and sets the mail's
  `Reply-To` when the chapter named one, so a reply reaches the chapter rather than the
  platform sender. An event with no chapter keeps the platform sender.
- All three read `features/chapters`' `ChapterSettings` row through the facade, which
  answers with the defaults while the chapter has no row. See
  [ARCHITECTURE.md](ARCHITECTURE.md) → *Chapter settings*.
- `attachments?(params, strings, locale)` is optional: calendar files the mail carries, as
  `{ filename, calendar }`. `deliverEmail` renders each `calendar` with `lib/ics` and hands it
  to `sendMail` as `text/calendar`; push and the inbox ignore it.
- `Message` is email-shaped. `heading` and `body` carry the mail; `title` is the shorter
  line the bell and the push banner use when a kind sets it (the welcome card reads
  "Welcome to München" while the mail keeps its heading). `steps` renders the numbered
  "how it works" card in `NotificationEmail` and a numbered list in the plain-text part.

## The queues

`src/lib/events/queues.ts` defines five:

| Queue      | Consumer                              | Why it is its own queue                                        |
| ---------- | ------------------------------------- | -------------------------------------------------------------- |
| `events`   | dispatcher + the 60 s sweeper         | one job per event, fans out to listeners                        |
| `handlers` | `runListener`, concurrency 10         | one job per (event, listener)                                   |
| `email`    | `runEmailDelivery`, rate limited      | Resend allows 10 requests/s per team                            |
| `push`     | `runPushDelivery`, concurrency 5      | FCM has no such limit, and mail must never hold a push back     |
| `media`    | `runMediaJob`, concurrency 1, `media-worker` container | ffmpeg transcodes take minutes of CPU and must not share a process with delivery |

The email worker runs with `limiter: { max: RESEND_RATE_LIMIT, duration: 1000 }` and the
same number as its concurrency, where `RESEND_RATE_LIMIT` defaults to **8** — the two
requests left over are the sign-in OTPs the Next.js app sends directly, outside this
pipeline. When Resend answers `429` anyway, `sendMail` throws `MailRateLimitedError` with
the wait Resend named; `runEmailDelivery` parks the whole email worker with
`queue.rateLimit(ms)` and throws `Worker.RateLimitError()`, which returns the job to
waiting without spending one of its five attempts. `deliverEmail` lets that error through
untouched, so a throttle never shows up as a failed delivery.

## Maintenance jobs

The `events` queue also carries the jobs nobody emitted. `worker/index` routes them through
a `MAINTENANCE` map keyed by job name and falls back to the dispatcher, so a maintenance job
can never be mistaken for an event id:

| Scheduler       | When                    | What it does                                                                   |
| --------------- | ----------------------- | ------------------------------------------------------------------------------ |
| `sweep`         | every 60 s              | re-queues `Event` rows Redis never heard about                                  |
| `prune-devices` | `0 4 * * *` (04:00 UTC) | deletes `Device` rows whose `lastSeenAt` is older than `STALE_DEVICE_DAYS` (270) |
| `prune-chat`    | `0 3 * * *` (03:00 UTC) | deletes `chat_message` rows older than 12 months in 1,000-row batches, then conversations with no members left |
| `prune-training-uploads` | `30 3 * * *` (03:30 UTC) | aborts multipart uploads of training videos still `uploading` after 24 h and deletes their rows |

`notifications.registerDevice` bumps `lastSeenAt` on every app open, so the cutoff means
"no sign of this install for nine months", not "no push has been sent to it". 270 days is
FCM's own expiry for an inactive token, so the prune only removes rows FCM would reject
anyway — a volunteer who does not open the app over the winter keeps their push. That is one
half of token hygiene; the other half is FCM answering a send with *not registered*, which
`deliverPush` turns into `notifications.removeDeviceTokens` on the spot. Both schedulers are
registered with `upsertJobScheduler`, so restarting the worker does not stack them up.

## Chat: one event, no bell row (COD-245)

`chat.messageSent { conversationId, messageId, seq, actorUserId, chapterId }` is the one event
in the catalog whose entry in `handlers.ts` is a single listener, `{ chatNotify }`. No `notify`,
so **no `Notification` row and no bell card**; no `recordActivity`, so no history line. A message
is either live in front of you, a banner, or a line in tomorrow's mail — it is never something
waiting in an inbox. Unread is arithmetic (`lastSeq > lastReadSeq` per membership), which is why
nothing needs to be counted.

Everything below the bell is reused as-is. `notify-chat-message` loads the members through the
chat facade, drops the sender, and for each remaining recipient — in chunks of 25 — skips anyone
muted or currently focused on that conversation (`presence.isFocusedOn`), then:

| Queue   | `job.name`     | Data                                                 | Id |
| ------- | -------------- | ---------------------------------------------------- | -- |
| `push`  | `chat`         | `{ recipientUserId, conversationId, messageId }`      | jobId `chat-<messageId>-<recipientUserId>` |
| `email` | `chat-digest`  | `{ recipientUserId, conversationId, windowStartedAt }` | deduplication id `chat-digest-<recipientUserId>-<conversationId>` |

`worker/index.ts` routes both delivery queues by `job.name`, so `chat` and `chat-digest` sit
beside the generic `runPushDelivery` / `runEmailDelivery` without touching them. The digest goes
through the same `parkOnRateLimit` wrapper as every other mail, so a Resend `429` parks the
worker rather than failing the job.

**The digest debounce.** Email is only for a recipient push cannot reach — no device, or push
switched off. Those recipients get one grouped mail per conversation, not one per message. The
job is enqueued with BullMQ's trailing-edge deduplication (`{ id, extend: true, replace: true }`)
and a delay from `digest-window.ts`: **5 minutes after the last message, capped at 15 minutes
after the first unread one**. A plain `jobId` would not reset the delay, which is why the
deduplication form is load-bearing. The producer reads the live job through
`queue.getDeduplicationJobId` + `Job.fromId` and carries its `windowStartedAt` forward, so the
15-minute cap survives every replacement.

Both deliveries re-decide at wake-up rather than trusting what was true at enqueue time:
`deliver-chat-push` re-checks read position, mute and `notifyChatPush` before sending and
collapses a conversation's banners into one (`collapseKey`, which becomes FCM's
`android.collapseKey` + `notification.tag` and APNs' `apns-collapse-id` + `thread-id`);
`deliver-chat-digest` re-checks membership, unread, mute, `notifyChatEmail` and *still no push*,
then decrypts only the recipient's own unread rows and renders `src/emails/chat-digest.tsx`.
Neither writes a `Delivery` row — chat has no inbox row to hang one off. Instead
`deliver-chat-digest` returns what happened (`sent`, `already read`, `muted`, `push available`,
…), which Bull Board shows as the job's return value, so a quiet mailbox can be explained
from the `email` queue's *completed* tab.

## Rides: events and who hears them (COD-258, COD-259, COD-262, COD-263)

Every write in `features/rides/facade.ts` emits exactly one event per ride it changes, inside
the same transaction as the write and its `RideLogEntry`. The payload is ids and facts only,
and every one carries `rideId`, `chapterId` and `actorUserId` (`null` for the seed and, later,
the worker):

| Event | Extra payload | Emitted by |
| --- | --- | --- |
| `ride.scheduled` | `returnLegId` (the way back of a round trip, or `null`), `requestId` (the Ride Request it was scheduled from, or `null`) | `scheduleRide`, once for both legs |
| `ride.rescheduled` | `changes`: `time` · `location` · `destination` | `rescheduleRide` (once per leg it moves: moving the way there moves a scheduled way back too), `updateRideDetails` (a new place only; the note and pilots needed are history, not news) |
| `ride.cancelled` | `reasonCode` | `cancelRide`, once per leg it cancels |
| `ride.deleted` | — | `deleteRide`, once per leg it deletes (a cancelled other leg of a round trip goes too); the ride's history goes with it, so this row is what records who deleted it |
| `ride.pilotAssigned` | `userId`, `self` | `assignVolunteer`, `selfAssign` (per leg it takes: signing up for a round trip takes the other leg too while it still needs a pilot) |
| `ride.pilotUnassigned` | `userId`, `self` | `unassignVolunteer`, `withdraw` (per leg it leaves: stepping back from a round trip leaves the other leg too while it is outside the staffing window) |
| `ride.riderBooked` | `passengerId`, `requestId` (null unless booked from a Ride Request) | `bookRider`, `bookSeats`, and `confirmSeat` when it takes back a seat given up |
| `ride.riderRemoved` | `passengerId`, `self` (the rider's own account gave the seat up), `rosterNowEmpty` (nobody is left to ride), `pair` | `cancelBooking` (an admin takes the rider off, the row goes), `cancelSeat` (the rider's side gives the seat up, the row stays as `cancelled`; per leg of a round trip it leaves) |
| `ride.opened` | — | `scheduleRide`, per leg, when the chapter lets pilots sign up and the ride is still ahead and short of pilots |
| `ride.understaffed` | `assigned`, `required` | `checkStaffing` (the worker's staffing check), once per ride, with `actorUserId: null`; the way there checks its way back along |
| `ride.announced` | — | `scheduleRide` with `announced`, `setAnnounced` when it is switched on the first time; only for an event still ahead |
| `ride.rosterRefilled` | `passengerId` | `confirmSeat` when taking a seat back fills a roster that had emptied, once per outing |
| `ride.riderReminderDue` | `pair` | `sendReminder("riderReminderSentAt")` (the worker's rider reminder), once per ride, with `actorUserId: null`; stamped in the same transaction |
| `ride.volunteerReminderDue` | `pair` | `sendReminder("volunteerReminderSentAt")` (the worker's pilot reminder), likewise |
| `ride.noDemand` | `pair` | `checkDemand` (the worker's demand check, 4C), once per ride whose roster is empty inside the chapter's `demandCheckLeadHours` |
| `ride.completed` | `riders`, `noShows` | `closeRoster` (6D): the roster is closed and the ride counts |
| `ride.reopened` | — | `reopenRide`: an admin takes a closed roster back |

Some ride-day writes are history, not news, and only add a `RideLogEntry`: a check-in and
its undo (`setCheckedIn`), a walk-up added or removed (`addWalkUp`, `removeWalkUp`), a pilot
marked as a no-show (`setPilotNoShow`), a debrief (`submitDebrief`) and confirming a seat
already held (`confirmSeat` emits `ride.riderBooked` only when it takes back a seat given up).
`rosterReordered` was already one of them.

`self` is true when the pilot acted for themself: `selfAssign` and `withdraw` emit
`ride.pilotAssigned` / `ride.pilotUnassigned` with `self: true`, and `bookSeats` emits one
`ride.riderBooked` per seat.
The note for pilots and anyone's name never enter a payload; a kind that needs a name looks it
up through the facades, the way the existing kinds do.

Five of them have a `notify` listener, all in `src/use-cases/notifications/kinds/rides.ts`,
category `ride`:

| Kind | Event | Who hears it | Policy | Link |
| --- | --- | --- | --- | --- |
| `ridePilotAssigned` | `ride.pilotAssigned`, not `self` | the pilot | push, mail if no push | `/pilot/rides/{id}` |
| `rideCancelled` | `ride.cancelled` | pilots, riders' accounts and chapter admins, minus the actor (Report 14) | push, mail always | `/rides/{id}` |
| `rideRescheduled` | `ride.rescheduled` | pilots and riders' accounts, minus the actor | push, mail if no push | `/rides/{id}` |
| `rideBookingConfirmed` | `ride.riderBooked` | the account managing the rider, and the rider's own account | push, mail always | `/passenger/rides/{id}` |
| `rideBookingCancelled` | `ride.riderRemoved` with `self` | chapter admins | push, mail if no push, opt-out-able | `/admin/rides/{id}` |

PR 5 added four more, in `kinds/staffing.ts`, and widened `ridePilotAssigned`:

| Kind | Event | Who hears it | Policy | Link |
| --- | --- | --- | --- | --- |
| `ridePilotAssigned` | `ride.pilotAssigned` with `self` | the pilot ("you're signed up", 3C) and the riders' accounts ("{pilot} pilots your ride", story 24b) | push, mail if no push | `/rides/{id}` |
| `rideOpened` | `ride.opened` | the chapter's pilots not on the ride, minus the actor | push, mail if no push, opt-out-able | `/pilot/rides/{id}` |
| `rideUnderstaffed` | `ride.understaffed` | chapter admins | push, mail if no push | `/admin/rides/{id}` |
| `ridePilotWithdrew` | `ride.pilotUnassigned` with `self` | chapter admins minus the actor | push, mail if no push, opt-out-able | `/admin/rides/{id}` |
| `rideAnnounced` | `ride.announced` | the accounts behind the chapter's riders, minus the actor | push, mail if no push, opt-out-able | `/passenger/rides/{id}` |

PR 6 added four more, in `kinds/reminders.ts`, and widened `rideBookingCancelled`:

| Kind | Event | Who hears it | Policy | Link |
| --- | --- | --- | --- | --- |
| `rideRiderReminder` | `ride.riderReminderDue` | the accounts behind the ride's riders still holding a seat, on either leg (5B-b): "Confirm or cancel the seat" | push, mail always, essential | `/passenger/rides/{id}` |
| `ridePilotReminder` | `ride.volunteerReminderDue` | the ride's pilots still piloting in its chapter (stories 29, 30), with each trishaw and where it waits — never the access code | push, mail if no push, essential | `/pilot/rides/{id}` |
| `rideNoDemand` | `ride.noDemand` | chapter admins: flag for cancellation (4C) | push, mail if no push | `/admin/rides/{id}` |
| `rideRosterRefilled` | `ride.rosterRefilled` | chapter admins minus the actor: the ride they were told was empty has a rider again | push, mail if no push, opt-out-able | `/admin/rides/{id}` |
| `rideBookingCancelled` | `ride.riderRemoved` with `self` **or** `rosterNowEmpty` | chapter admins minus the actor; "nobody is left to ride" when the roster emptied (5B-b), worded as "was taken off" when an admin removed the last rider | push, mail if no push, opt-out-able | `/admin/rides/{id}` |

**Every reminder is its own event.** A `Notification` is unique per event and reader, so a
reminder cannot ride on an existing event; the marker (`riderReminderSentAt`,
`volunteerReminderSentAt`, `demandCheckedAt`) is stamped in the same `transaction()` as the
emit under the ride's lock, so neither a retried sweep nor a retried dispatch tells anyone
twice. Moving a ride's start clears all three and asks confirmed or checked-in seats again,
so the reminders go again for its new time; a new end clears only the staffing stamp.
`ride.completed` has a `freezeRideChat` listener that wraps the ride's chat up
(`chat.freezeRideConversation`). The roster closes and emits in one transaction, so the freeze
rides the outbox and its retries: a freeze that fails tries again and never takes the closed
roster back. A second tap on a closed roster emits nothing, so a chat its people kept going
stays open. `ride.reopened` has no listener.

**A ride already over is history.** `ridePilotAssigned`, `rideBookingConfirmed`,
`rideBookingCancelled` and `rideRequestScheduled` tell nobody when the ride has ended
(`rideNotOver`), so an admin
recording last Monday's crew and riders doesn't send "you're piloting on Monday".

**One event, two readers.** A self sign-up reaches the pilot and the riders' side with
different words. A kind may define `forRecipient(params, recipientUserId)`; `notify` stores
each recipient's row with what it returns, so `ridePilotAssigned` remembers `audience: "pilot"`
or `"rider"` per row and the bell, the push and the mail read it back.

`ride.deleted` still has no listener and is marked processed without a job.
`ride.scheduled` has one, `linkRideRequest` (COD-261): a ride scheduled from a Ride Request
links that request if the scheduling use case stopped between writing the ride and linking
it; `rideRequests.markScheduled` does nothing when the link is already there. The four roster events (`ride.pilotAssigned`, `ride.pilotUnassigned`,
`ride.riderBooked`, `ride.riderRemoved`) also have a `syncRideChat` listener that keeps the
ride's chat members in step (`use-cases/ride-chat.ts`); `rider.handedOver` has it too and
syncs the chat of every ride still ahead that the rider is booked on (`syncRiderChats`), so the
old manager leaves those chats and the new one joins. `member.roleChanged` has a
`leaveRideCrews` listener: a demotion or removal checks the person's upcoming rides for pilots
again and syncs every ride chat of the chapter they are in (`use-cases/leave-ride-crews.ts`).

**A round trip is announced once.** When one change reaches both legs — cancelling the way
there with the way back, moving the way there (which moves the way back), or scheduling a
round trip with riders and pilots, or a pilot signing up for or stepping back from both legs —
each leg still emits its own event, but `ride.cancelled`, `ride.rescheduled`, `ride.riderBooked`,
`ride.riderRemoved`, `ride.pilotAssigned`, `ride.pilotUnassigned`, `ride.opened`, `ride.understaffed`,
`ride.riderReminderDue`, `ride.volunteerReminderDue` and `ride.noDemand` carry a `pair`: the way there's
event is `{ role: "lead", otherRideId }` and the way back's `{ role: "follow", otherRideId }`.
A kind sends nothing for a follower, and the lead's message says "and the way back" and goes
to everyone on either leg. `pair` defaults to `null`, so events stored before it parse as
single rides.

**A seat given up is the rider's side's news.** `ride.riderRemoved` carries `self`: true when
the actor is the rider's own account or the account managing them, and `rosterNowEmpty` when
nobody is left to ride. The chapter admins hear about it when the rider's side gave the seat
up, or when the roster is left empty — then also when an admin of the chapter, of its country
or a superadmin took the last rider off, in its own "was taken off" words. Any other removal
by an admin is already known to the admins, and no role lookup in the worker has to guess
which.

**People are named when the message is written.** The ride kinds store a rider as `riderId`
and an admin as `actorUserId`, never their names; a kind's optional `hydrate` looks the names
up right before `message` runs — in the bell (`inbox`), in `deliver-email` and in
`deliver-push`. A notification can sit in a bell for months, and deleting a rider then leaves
"a rider" behind instead of their name. Older kinds still store names in their payloads.

**A change is told as what it is.** `rideRescheduled` picks one change in the order time,
start, destination, and says that: a destination edit names the new destination instead of
reading as a moved meeting point.

A ride message is about one ride but reaches people who read it in different places, so the
two kinds whose audience is mixed link to `/rides/{id}`. That route (`app/rides/[rideId]`,
like `app/chat/[conversationId]`) asks `use-cases/ride-link` where *this* reader sees the ride
— the assigned pilot's page first, then the rider's account's page — falls back to the admin
page for an admin of the ride's chapter, and otherwise to the reader's home. The page it lands
on guards itself again.

The params carry the ride's start and end as ISO strings plus the chapter's zone, and
`rideWords` writes them per recipient, in their language, on the chapter's wall clock: a carer
abroad still reads the time the ride starts in Munich. German copy is du-form for pilots,
Sie-form for riders' accounts and admins, and impersonal where one mail reaches all of them.

## Ride requests and hand-overs (COD-261)

| Event | Payload | Emitted by |
| --- | --- | --- |
| `rideRequest.submitted` | `requestId`, `chapterId`, `actorUserId` (the requester) | `rideRequests.submit`, or `announce` once automatic scheduling found no free trishaw |
| `rideRequest.scheduled` | `requestId`, `chapterId`, `actorUserId` (`null` when automatic), `requesterUserId`, `rideId`, `returnLegId` | `rideRequests.markScheduled` |
| `rideRequest.declined` | `requestId`, `chapterId`, `actorUserId`, `requesterUserId` | `rideRequests.decline` |
| `rideRequest.withdrawn` | `requestId`, `chapterId`, `actorUserId` | `rideRequests.withdraw`, `withdrawOpenRequests` (an account or its riders leaving) |
| `rider.handedOver` | `passengerId`, `chapterId`, `actorUserId`, `fromUserId`, `toUserId`, `invited` | `passengers.handOverRider` |

`ride.riderBooked` gained `requestId` (default `null`): set when the rider was booked by
scheduling that request.

| Kind | Event | Who hears it | Policy | Link |
| --- | --- | --- | --- | --- |
| `rideRequestSubmitted` | `rideRequest.submitted` | chapter admins minus the requester — nobody once the request is no longer pending | push (chapter switch `requestAlertPush`), mail if no push, opt-out-able, collapsed `requests:{chapterId}` | `/admin/rides/requests/{id}` |
| `rideRequestWithdrawn` | `rideRequest.withdrawn` | chapter admins minus the actor | as above | `/admin/rides/requests/{id}` |
| `rideRequestScheduled` | `rideRequest.scheduled` | the requester | push, mail always, with `ride.ics` (one VEVENT per leg, no names) | `/passenger/rides/{rideId}` |
| `rideRequestDeclined` | `rideRequest.declined` | the requester, with the admin's note | push, mail always | `/passenger/rides/requests/{id}` |
| `riderHandedOver` | `rider.handedOver` | the new and the old manager minus the actor (not the new one when they were just invited — the invitation speaks for it); each reads their own words (`forRecipient`) | push, mail always | `/passenger/profile/people` |

`rideBookingConfirmed` leaves out the requester of a `ride.riderBooked` that carries a
`requestId`: `rideRequestScheduled` already told them, with the calendar file. A rider's own
account, when it is not the requester, still hears it. `rider.handedOver` also has a
`recordActivity` listener that writes a `riderHandedOver` line into both managers' histories,
and a `moveRequests` listener (`use-cases/move-handed-over-requests`) that
moves the rider's open requests to the new manager should the hand-over have stopped before it
did — only while the rider is still with that manager, so a hand-over undone in the meantime
keeps its requests; a second run finds nothing left to move.

## Training videos: events that start media jobs

| Event | Payload | Listener → `media` job |
| --- | --- | --- |
| `trainingVideo.uploaded` | `videoId`, `revision`, `chapterId`, `actorUserId` | `transcode` → `transcode` (jobId `transcode-<videoId>-<revision>`) |
| `trainingVideo.posterRequested` | `videoId`, `revision`, `seconds`, `chapterId`, `actorUserId` | `poster` → `poster` (jobId `poster-<eventId>`) |
| `trainingVideo.deleted` | `videoId`, `mediaKey`, `sourceKey`, `uploadId`, `chapterId`, `actorUserId` | `purge` → `purge` (jobId `purge-<videoId>`) |

`markUploaded` and `retryVideo` emit `uploaded` (a retry with the bumped revision), so the
same listener covers both. Media jobs run with 3 attempts and a 30 s exponential backoff; a
`MediaFailure` (bad file) is final on the first attempt and marks the video `failed` with its
code, while an unexpected error (S3, network) retries and marks `transcodeFailed` only on the
last attempt. Each job re-reads the row and does nothing when its revision is no longer
current. `chapterId` is `null` for global and country videos.

## Training: course passed

| Event | Payload | Listener |
| --- | --- | --- |
| `training.coursePassed` | `userId`, `courseId`, `familyId`, `attemptId` (the passing quiz attempt, `null` when the last open element was a lesson), `chapterId` (the chapter the course was taken in, or `null`), `actorUserId` (the pilot) | `recordActivity` → `trainingPassed` history line with the course title (`worker/listeners/training.ts`) |
| `training.exemptionGranted` | `userId`, `familyId` (`null` = blanket), `reason` (`experienced` · `manual` · `migration`), `chapterId` (where it was granted, or `null`), `actorUserId` (`null` = system) | `recordActivity` → `trainingExemptionGranted` |
| `training.exemptionRevoked` | `userId`, `familyId` (`null` = blanket), `chapterId`, `actorUserId` | `recordActivity` → `trainingExemptionRevoked` |

Emitted inside the transaction that completes the course's last open element (a passing
`submitAttempt`, or the heartbeat / mark-read finishing the last lesson), only by the write that
sets `passedAt`, so a later pass of the same course or of another language variant of an already passed family still
emits once per course. The exemption events are emitted by `training.grantExemption` /
`revokeExemption` only when a row was actually created or deleted. The migration's backfill
writes rows directly and emits nothing. There is no "pilot is now ready" notification yet:
none of the existing kinds can compute readiness cheaply, so it waits for its own kind.

Deleting a chapter or country emits `trainingVideo.deleted` (with `chapterId: null`) for each
video the cascade removed, from `training.purgeOwnerMedia`, so the same `purge` job cleans up.

## Watching the queues

The worker serves [Bull Board](https://github.com/felixmosh/bull-board) at
**<http://localhost:3001/queues>** (`WORKER_PORT`). It lists every job per queue and per
state — waiting, active, completed, failed, delayed — with its payload, attempt count,
error and stack, and it can retry or promote a job by hand. A delayed `ifNoPush` mail sits
in the `email` queue's *delayed* tab for its two minutes; promoting it there is the fastest
way to test the fallback.

The same server answers **`GET /health`**: `200 {"ok":true}` while every BullMQ worker
is running and Redis answers a queue count within two seconds, otherwise `503` with a `reason`.
The compose files probe it every 30 s, so `docker compose ps` shows the worker as
`unhealthy` when it hangs. Docker does not restart an unhealthy container by itself;
`restart: unless-stopped` only covers a process that exits.
