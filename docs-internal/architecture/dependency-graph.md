# Dependency graph

Which Use Cases call which Facades. Update this whenever a feature or use case is added.

The audit log is **infrastructure**, not a feature: it lives in `src/lib/activity` beside
`lib/auth-guards` and `lib/mailer`, so any layer may write a history line. That is why
`change-member-role`, `submit-pilot-applications` and `claim-account` are gone — each
coordinated exactly one feature plus the log, which AGENTS.md says is not a use case. Their
logic sits in the facade that owns the domain rule (`membership.changeMemberRole` carries the
"cannot change your own role" rule; `accounts.claimAccount` the claim), and the Action calls
that facade directly.

`decide-pilot-application` is gone for the same reason. Once the decision emitted
`pilotApplication.decided` instead of calling the activity log and the mailer itself, it
coordinated one facade and nothing else, so it collapsed into `membership.decideApplication`
— which now owns the transaction the `Event` row commits in — and `app/admin/members/actions`
calls that facade directly. Its old work is two listeners in the worker.

> Newly qualifying for the same treatment: `manage-chapter` and `manage-country` now touch
> only `chapters` plus the log, so both could collapse into their Actions or into the
> `chapters` facade. Left as-is deliberately — the facade already exports thin
> `createChapter`/`updateChapter`/`deleteChapter` wrappers, so merging them is a naming
> decision rather than a mechanical move.


| Use case | Facades it coordinates | Why it exists |
| --- | --- | --- |
| `build-session-access` | `chapters`, `membership` | The session payload needs the user's country-admin scopes (chapters) *and* their chapter memberships (membership). Two facades → a use case. |
| `onboarding-progress` | `chapters`, `membership`, `profile` | How far someone got is spread across three tables: which chapter they joined, what they consented to, whether a rider profile exists. Read by the `/onboarding` resolver and by every step that draws the progress dots. |
| `settle-passenger-location` | `membership`, `profile` | "Where do you live" and "which chapter serves you" are one answer given on one screen, but two features own the two halves. |
| `accept-onboarding-consent` | `membership`, `profile` | Records consent and, when a QR preset skipped the location step, performs the join it would have done. |
| `complete-onboarding-profile` | `membership`, `passengers`, `profile` | Writes the account's own details, creates the rider profile a ride will point at, and stamps `onboardedAt`. The welcome mail is no longer sent here: `profile.completeOnboarding` emits `user.onboarded` and the pipeline does the rest, exactly once. |
| `notifications/notify` | `notifications` (+ the kinds) | The generic listener. A kind names the recipients and the parameters; this writes one inbox row each and queues push and email per the kind's policy. Runs in the worker, from an event, with no session. |
| `notifications/deliver-email` | `notifications`, `profile`, `chapters` (+ `activity`, `mailer`) | One email for one `Notification`, in the recipient's own locale (hence `profile`), with the attempt recorded on the `Delivery` row. A delayed `ifNoPush` job re-checks here whether the push landed or the row was already read. `chapters.getSettings` supplies the chapter's reply-to, so an answer goes back to the chapter the mail was about. |
| `notifications/deliver-push` | `notifications`, `profile` (+ `lib/push`) | One push for one `Notification`: the recipient's opt-in and device tokens, the locale for the copy, `sendPush` through `firebase-admin`, and dead tokens pruned from the `device` table. A kind may also carry a `chapterAllowsPush` hook, which the notification kinds answer from `chapters`. Missing credentials are a `skipped` row, not a retry. |
| `notifications/inbox` | `notifications` (+ the kinds) | The bell's read model: stored payloads rendered back into `{ title, body, href }` in the reader's locale, plus the unseen count. Its kind lookup is non-throwing, so a retired kind leaves a gap in the list instead of blanking the bell. |
| `member-home` | `chapters`, `membership` | Where a member belongs: their memberships, their open applications and the chapter rows behind both. `cache()`d, because the sidebar subtitle and the home's chapter cards ask it in the same request from two different Suspense boundaries. |
| `update-own-details` | `passengers`, `profile` | `birthDate` and `gender` are deliberately duplicated onto the rider row an account books its own rides with, so one edit in the account surface has to reach both. A name-only edit stops at `profile` — splitting one string back into `firstName`/`lastName` would be lossy. |
| `manage-country-admins` | `chapters`, `profile` | Appointing by email needs the lookup in `profile` and the row in `chapters`. Removal coordinates nothing, so it collapsed into `app/admin/countries/actions`, and the history line now comes from the `countryAdmin.*` events. |
| `provision-assisted-passenger` | `accounts`, `membership`, `passengers`, `activity` | One "add a passenger at the door" makes the account, joins the chapter, creates the rider row and records who created it — four features, and the helper rule decides whether the rider row points at the new account or at nobody. |
| `invite-chapter-user` | `accounts`, `membership`, `profile` | Provisioning the account, seeding the invitee's language from the inviter's, and granting the chapter roles are three features. It sends nothing: `membership.inviteMember` emits `member.invited` and the pipeline mails it. |
| `manage-chapter` | `chapters`, `activity` | Creating, editing or deleting a chapter is a `chapters` write plus the history line that makes it legible on the chapter's own page. `chapters.diffChapter` turns one autosave into one `chapterUpdated` event per field that actually changed (a moved pin and its new address fold into one `location` change), and the delete event is recorded *global* because the row it would point at is gone. |
| `manage-country` | `chapters`, `activity` | Deleting a country takes every chapter under it (the relation restricts, so the service deletes both in one transaction) and writes the history: one `countryDeleted` line plus a `chapterDeleted` line per chapter, all recorded *global* because the rows they would point at are gone. |
| `chat/chat-inbox` | `chat`, `profile` (+ `lib/realtime` presence) | A conversation row is a chat row, a name and a face from `profile`, and a green dot from Redis. `getInbox` and `syncInbox` share one batched `profile.getProfiles` and one pipelined `isOnline`, so an inbox of fifty costs three queries. |
| `chat/conversation-view` | `chat`, `profile` (+ `lib/realtime` presence) | The same join for one open thread: the summary, its members with names, avatars and presence (capped at 200 — `memberCount` carries the truth), and the first page of messages. It reuses `chat-inbox`'s `displayOf`, so the list row and the thread header never name a conversation differently. |
| `chat/start-direct-chat` | `chat`, `profile`, `membership`, `chapters` | Reach is the rule that needs four features: find the person by exact email or E.164 (`profile`), then allow it only when both share a chapter (`membership`), or the viewer is a superadmin, a chapter admin over one of the target's chapters, or the country admin above one (`chapters`). The first shared chapter is what the conversation stores as its `chapterId`, which is what oversight later reads. |
| `chat/create-group-chat` | `chat`, `membership`, `chapters` | Every initial member must belong to the group's chapter, and so must the creator unless they administer it. One roster read answers both questions. |
| `chat/oversight` | `chat`, `profile` | Maps an `AdminScope` plus the active scope to chapter ids and names the participants of a direct conversation. It authorises nothing itself — the page runs `requireAdminScope` and re-guards on the conversation's own `chapterId`. |
| `chat-notifications/notify-chat-message` | `chat`, `profile`, `notifications` (+ `lib/realtime` presence, BullMQ) | The `chat.messageSent` listener. Drops the sender, then per recipient in chunks of 25: mute, `presence.isFocusedOn`, preference, device tokens — a `chat` push job for anyone reachable, a debounced `chat-digest` mail job for anyone not. Writes no `Notification` row: chat never appears in the bell. |
| `chat-notifications/deliver-chat-push` | `chat`, `profile`, `notifications` (+ `lib/push`) | One banner for one message, re-deciding at wake-up: still unread, still unmuted, still opted in. Titled "Anna Berg" or "Anna Berg · Saturday crew", body stripped of markdown to 140 characters, collapsed per conversation so ten messages are one banner. |
| `calendar-feed` | `calendar-feeds`, `membership`, `passengers`, `rides` (+ `lib/ics`) | One poll of a subscribed calendar: `calendar-feeds` turns the address into an owner (signature first, then the row, then the ban check), `membership` says where that owner may read rides as a pilot (`/pilot`'s rule: the pilot role somewhere, current membership of the ride's chapter), `passengers` names the riders they manage, and `rides` returns the union with nobody's name in it. The strings come from the owner's stored locale, because a poll carries no session. Called only from the feed route `/api/calendar/[file]`. |
| `schedule-ride` | `chapters`, `fleet`, `membership`, `passengers`, `rides` | Whether a chapter may use a trishaw (its location, a pool it was approved for, the status) is the fleet's rule; the reservation under a row lock is the calendar's. `scheduleRideAt` reads the chapter's time zone from `chapters` to turn the drawer's wall-clock slot into instants, and a functional round trip into two windows. Riders and pilots named at scheduling are checked in one batch each (`passengers.getPassengers`, `membership.getMembersRoles`). `allocateTrishaws` takes the ride scope the Action already read and checks only the trishaws being *added*, so one grounded after allocation stays on the ride with a warning instead of blocking every other edit. `trishawChoicesForRide` and `freeTrishawsInWindow` ask `rides.bookedTrishawIds` which of the chapter's trishaws any live ride holds in the window, whichever chapter booked it, because a pooled bike booked by the neighbour is still booked. |
| `staff-ride` | `membership`, `rides` | An admin may put only someone holding the `pilot` role in the ride's own chapter on it; that role is membership's, the assignment the calendar's. Taking a pilot off is single-feature, so that Action calls `rides.unassignVolunteer` directly. |
| `book-rider` | `passengers`, `rides` | A rider joins a ride of their own chapter only; which chapter a rider belongs to is the passengers' rule. Removing a rider calls `rides.cancelBooking` directly. |
| `report-damage` | `fleet`, `rides` | A pilot may report only on a ride they were assigned to and a trishaw that was on it (`rides`); the damage, the grounding and the `trishaw.damageReported` event are `fleet`'s. The upcoming rides a grounding endangers come from `rides` and travel in the event. |
| `leave-pool` | `fleet`, `rides` | Leaving is blocked while the chapter still has future rides with the pool's trishaws — that count is the calendar's. |
| `activity-report` | `chapters`, `membership`, `passengers`, `accounts`, `rides` | The Reports dashboard and the Overview KPI strip. `chapters` gives the scope's zones, pins and countries; `rides` the ride facts, the pure aggregation and who rode in the last 12 months; `membership` the pilot members and `passengers` the riders of the scope for active/inactive; names come from `accounts` and `passengers` only when `includePeople` (chapter scope). `"use cache"` tagged through `lib/cache-tags` (`reports` plus one `reports:chapter:<id>` per chapter); the admin Server Actions call `invalidateReports` from `lib/cache-tags`, not the use case. |
| `move-trishaw` | `fleet`, `rides` | A move is refused while a chapter that would lose the trishaw (it reaches the old location but not the new one) still has future rides with it. Who reaches a location is the fleet's rule; the count is the calendar's. |
| `trishaw-history` | `fleet`, `rides` | One timeline from rides (with pilots), damages and the trishaw log. |
| `finish-ride` | `chapters`, `fleet`, `rides` | The pilot's post-ride page: the chapter's post-ride instructions, and per trishaw its location's return instructions and access code — only for the ride's own pilots. |
| `chat-notifications/deliver-chat-digest` | `chat`, `profile`, `notifications` (+ `lib/mailer`) | One grouped mail for everything unread in one conversation, for a recipient push cannot reach. Re-checks membership, unread, mute, preference and *still no push* before decrypting a single row. |

The chat use cases exist for the reason the manifesto gives: a facade may not call another
feature, and none of these is about chat alone. Naming a conversation needs `profile`. Deciding
who may start one needs `membership` and `chapters`. Drawing a row needs presence from
`lib/realtime` on top of both. Everything that *is* about chat alone — send, edit, delete,
react, mark read, mute, leave, freeze, continue — stays a single facade call behind
`features/chat/actions`, with no use case in between.

`lib/realtime` and `lib/crypto/chat-cipher` are cross-cutting infrastructure, the
same standing as `lib/push` and `lib/mailer`: the facade publishes through the hub, the SSE
route subscribes through it, the notification listener asks it who is focused, and the worker
would too. `lib/crypto/chat-cipher` has exactly one caller — the chat facade — because services stay dumb and hand
`Bytes` in and out, and no other layer ever sees plaintext it did not decrypt itself.

`GET /api/chat/stream` and `/chat/[id]` are Route Handlers in the Boundary layer on purpose. A Route Handler
is the boundary when the transport cannot be a Server Action: `GET /api/chat/stream` is an SSE
connection and `/chat/[id]` is a deep link from a push banner or a digest mail. Both guard
themselves and then call facades, exactly as an `actions.ts` does — `proxy.ts` excludes
`/api/`, so the stream is its own gate.

`/api/calendar/[file]` is the third Route Handler in the Boundary layer, for the same reason as the other
two: a calendar server can only issue a `GET` with the credential in the URL. It checks the file
name's shape, asks `calendarFeeds.feedKeyOf` for the signature's verdict *before* the
per-address rate limit so a forged address never allocates a limiter bucket, delegates to `calendar-feed`, and owns only HTTP — the ETag,
the 304, the private headers. Enabling, resetting and turning off the address touch
`calendar-feeds` alone, so they are Actions behind `requireAuth` with no use case, and the
account surface reads `calendarFeeds.getFeed` directly in `loadAccount`, the same way it
reads `profile`. `lib/crypto/feed-signature` has one caller, the `calendar-feeds` facade, which is
the same standing `lib/crypto/chat-cipher` has with chat; `lib/ics` is pure serialisation like
`lib/calendar`.

The calendar surfaces — `/admin/rides`, `/admin/bikes`, `/pilot` and `/passenger` — and the
ride detail page `/admin/rides/[rideId]` are Server Components that read the `rides` facade
directly. `/admin/rides` and `/admin/bikes` additionally read `chapters.getChapterTimeZones`,
because a calendar has to know which clock to draw in; a Server Component reading two facades
is the existing pattern (`/admin/passengers` already reads `passengers` and `chapters`), and the
Use Case rule in AGENTS.md governs Actions, not pages.

Writes go through `features/rides/actions` (ACT15). Each Action loads the ride, guards with
`requireChapterAdmin(ride.chapterId)`, and then calls the facade when only rides are involved
(reschedule, edit, cancel, delete, unassign a pilot, remove a rider, add a history note) or a
use case when another feature has a say (U31 scheduling and trishaws, U37 staffing, U38
booking). Every facade write emits through `lib/events` (EV), which is the edge `F9 --> EV`. The
slice's `commands.ts` (CM7) claims the `/admin/rides` row and adds "Schedule a ride"
(`/admin/rides?new=1`).

`lib/calendar` and `lib/time-zone` are cross-cutting infrastructure beside
`lib/format`: pure functions over instants and IANA zones, no React and no Prisma, so a
facade, a page or a test may use them.

No use case was added for the admin shell. `lib/auth-guards` calls the `chapters` facade for two guards:
`requireChapterAdmin` (`chapters.getChapterCountryId`) and `requireAdminScope`
(`chapters.listCountries` + `chapters.listChapters`). Resolving the admin scope needs the
`chapters` facade and nothing else, so per AGENTS.md it collapsed into `lib/auth-guards`
rather than becoming a use case — the same call the `requireChapterAdmin` precedent already
makes. If it ever needs a second facade (say, membership counts per chapter), that is when it
graduates to `src/use-cases/`.

Each slice's `commands.ts` is its ⌘K contribution, not a new layer: `app/admin/commands` imports
it and merges it into the palette. It belongs to the feature layer
because they are part of the slice's public surface — `eslint.config.mjs` lists
`src/features/*/{facade,index,commands}.ts` as the `feature-facade` element — and they import
nothing but types.

Single-facade work has no use case: `lib/auth-guards` calls `chapters.getChapterCountryId`
and `profile.getProfile` (the admin passkey gate) directly, `app/admin/chapters/actions` calls
the chapters facade directly, `features/membership/actions` calls the membership facade
directly, and the passkey and pilot-next-steps actions call the profile facade directly.
`deleteOwnAccountAction` (in `features/accounts/actions`) is the same: `accounts.deleteUser` is one facade call
behind `requireAuth` plus `canDeleteOwnAccount`, and the schema cascades the rest, so it is an
Action and not a use case — the mirror of the admin hard delete below, with the session as the only
subject. `features/notifications/actions` is the same shape: mark seen, mark read, register and
unregister a device are four writes into one facade, called from the bell and from the
push registrar. `app/admin/settings/actions` likewise: one write of the chapter's
`ChapterSettings` row behind `requireChapterAdmin`, so it calls `chapters.updateSettings`
directly.

The worker calls exactly one facade directly: the nightly
`prune-devices` scheduler calls `notifications.pruneStaleDevices()`. Token hygiene
coordinates one feature and carries no session, so per AGENTS.md it is not a use case —
`worker/index` dispatches it next to `sweep` through its `MAINTENANCE` map. See
[EVENTS.md](../EVENTS.md) → *Maintenance jobs*.

The member shell (`src/app/(member)`) and the account surface
(`src/components/account`). Neither is a feature slice: the shell is routing plus chrome and
the surface is cross-route UI over `lib`, which is why they sit in Presentation and reach the
server only through `lib/auth-guards` (`perspectiveViewerSession`, `requirePerspective`), one use case
(`member-home`) and Server Actions. The admin sidebar's user menu mounts the same surface from the admin
sidebar's user menu — one implementation, three call sites.

The bell reads through a use case (`notifications/inbox`) because rendering a stored payload needs the kinds,
not because two features are involved.

`features/accounts` has no UI of its own either — its Server Actions are imported
straight into the admin passengers and members screens, because "provision a user" is not a
page. `app/admin/members/actions` also calls `accounts.deleteUser` directly:
the hard delete touches one feature — the schema cascades everything else — so it is an
Action behind `requireSuperAdmin`, not a use case. The `accounts` service is the only place outside `prisma/seed.ts` that calls BetterAuth's admin API
(`auth.api.createUser`); everything else in that slice is ordinary Prisma.
`accounts.claimAccount` is called from the onboarding consent action, not from the
admin shell: the account is claimed by the person who received it, at the one step nobody may
take on their behalf.

`lib/activity` is cross-cutting infrastructure, the same standing as `lib/auth-guards`
and `lib/mailer`: a facade, a use case or a Server Component may write a history line, and it
owns no domain of its own. Writes sit next to the mutation they record; the only reads are the
person-history feed on `/admin/members/[userId]` and the chapter history on
`/admin/chapters/[chapterId]`, both straight from the Server Component.

`lib/observability` is cross-cutting infrastructure of the same kind, one step wider:
every layer may log a line or move a counter. `pino` and `prom-client` are importable
nowhere else (lint-enforced), so the whole system has one logger and one registry; Sentry is
used straight from the SDK over the shared options in `observability/sentry-shared.ts`.

What *is* constrained is **capture**. Only the Boundary layer (every `actions.ts` via
`actionFailure`, the route handlers via `onRequestError`), use cases that own a
failure, and the Worker (its `failed` listener, on the last attempt) call `captureException`.
Facades and services throw and never report — a facade that imports capture turns
one failure into one issue per layer it crossed.

`lib/mapbox`, `lib/mailer` and `lib/push` are cross-cutting infrastructure, callable from any
layer — the same standing as `lib/prisma` and `lib/sms`. `lib/mapbox` is reached only from a
Server Action so the secret token never enters a client bundle — the location flow's actions
and the admin chapter actions (suggest, retrieve and reverse-geocode behind
`requireAdminScope` and a per-user rate limit) are its two callers.

`lib/mailer` now has exactly two callers: `deliver-email` and the sign-in OTP inside
better-auth. Every other mail in the product is a notification kind, so no use case imports it
any more. `lib/push` has one, `deliver-push`, and one import site for `firebase-admin`
(lint-enforced) so service-account credentials cannot reach a browser bundle. Its client
counterpart `lib/native/push` is the only place `@capacitor-firebase/messaging` is imported.

### Fleet (trishaws, models, locations, pools, damages)

`features/fleet` owns `TrishawType`, `StorageLocation`, `StorageLocationChapter` (pool
membership), `Trishaw`, `TrishawDamage`, `TrishawLogEntry` and `StoredFile`. `rides` keeps
`RideTrishaw` and the reservation lock; it no longer knows who may use a trishaw. Everything
that needs both goes through `schedule-ride`, `report-damage`, `leave-pool`, `move-trishaw`,
`trishaw-history` and `finish-ride`. `manage-chapter` now also creates the chapter's
default location, which is why it coordinates `fleet` as well.

Authority is data: the facade answers `locationAuthority`, `locationTrishawManagers`,
`trishawReaders`, `damageAuthority`, … as an `AdminAuthority` (chapters + countries), and the
Action passes it to `requireAdminOf` in `lib/auth-guards`, which evaluates it with
`allowsAdmin` from `lib/access`. The facade never sees a session.

`/api/files/[id]` is the only way a stored file is served: `getSession`, then
`lib/storage.fileKindOf` reads the file's kind once and hands it to the owning feature —
`rides.photoReadRule` for a `ridePhoto`, `fleet.fileReadRule` for every other kind — which describes who may read it as plain data (anyone, the uploader,
the location's members and admins, or a damage's reporter and admins), `canReadFile` in
`lib/auth-guards` decides for the session, then a 302 to a five-minute signed GET. `lib/storage`
is infrastructure like `lib/mailer`: `requestUpload` presigns a PUT to the private bucket,
`commitUpload` HEADs the staged object, re-encodes images to WebP with `sharp` (PDFs must start
with `%PDF-`), writes the final key and inserts the `StoredFile` row. One `UPLOAD_LIMIT`
(`withinUploadLimit`) is shared by every upload Action; who may upload which kind stays each
feature's Action rule. On the client, `hooks/use-presigned-upload` runs presign → PUT → commit
against a feature's two Actions, and `hooks/use-photo-list` holds the optimistic photo list
(pending uploads, remove with Undo, reorder) behind both the fleet `PhotoGallery` and the ride
photo strip. Nothing a browser uploaded is served unprocessed.
`lib/native/camera` is the only importer of `@capacitor/camera`.

The notification kinds now reach `fleet` for trishaw and pool names:
`trishaw.damageReported`, `pool.accessRequested` and `pool.accessDecided`, category `fleet`.
