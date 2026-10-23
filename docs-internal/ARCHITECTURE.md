# Next.js Application Architecture

We are building a Next.js application using a Strict Vertical Slice Architecture with a Hierarchical Layering system. The goal is total decoupling of business logic from the UI and infrastructure, ensuring the app remains maintainable and type-safe as it scales.

## The Architectural Layers & Interaction Law

You must strictly adhere to these four layers. Imports may only flow downward.

### 1. The Presentation Layer (`src/app` & `src/features/*/components`)
- **Components**: Responsible for UI only.
- **Server Actions**: Entry point for mutations.
- **Law**: Can ONLY call Global Use Cases or Feature Facades. Never call a Service or Database directly.
### 2. The Orchestration Layer (`src/use-cases/`)
- **Role**: Coordinates workflows that involve multiple features.
- **Example**: `processCheckout.ts` might call `CartFacade`, `PaymentFacade`, and `EmailFacade`.
- **Law**: Can call multiple Feature Facades. Cannot call Services or DB directly.

### 3. The Domain Boundary Layer (`src/features/*/facade.ts`)
- **Role**: The "Brain" of the feature. Handles Zod validation, internal permission checks, and domain-specific business rules.
- **Law**: Acts as the Gatekeeper. It coordinates the feature's internal Services. It cannot call other Features or Global Use Cases.

### 4. The Data Access Layer (`src/features/*/services/`)
- **Role**: Infrastructure-specific code (Drizzle/Prisma queries, external API fetches).
- **Law**: "Dumb" and reusable. Does not know about the user session or complex business workflows.

### 5. The Worker (`src/worker/`)

- **Role**: Runs domain events off the request path. A boundary layer like `actions.ts`:
  no session, no HTTP, calls Use Cases and Facades but never Services.
- **Law**: Ships in the same Docker image as the app, started with `node worker.js`
  instead of `node server.js`. Never runs inside the Next.js server process.

Business writes announce themselves by emitting a domain event inside their own
transaction (`lib/events`, the transactional outbox), and listeners registered in
`src/worker/handlers.ts` react to it. See [EVENTS.md](EVENTS.md).

Four queues, not one: `events` (dispatch + the 60 s sweeper), `handlers` (one job per
listener), and two delivery queues — `email`, rate limited to Resend's budget and parked by
`Worker.RateLimitError` when Resend answers `429`, and `push`, which sends through FCM
(`lib/push.ts`, `firebase-admin`) at concurrency 5. Mail is throttled; push is not held
behind it. A fifth queue, `media`, carries the training-video transcodes and is consumed by
a separate container (see Training → Worker role split).

Sentry is loaded into the worker by preload (`node --require ./worker-instrument.js`), never
by an import in `index.ts`.

## Folder Structure Definition

```text
src/
├── app/                  # ROUTING: Pages, Layouts, and API Route handlers.
│   ├── api/              # Endpoints no Server Action can be: webhooks, and the chat SSE stream.
│   ├── admin/            # The admin shell: inset sidebar, top bar, ⌘K.
│   ├── (member)/         # The member shell: /pilot and /passenger, one implementation.
│   └── (routes)/         # UI Routes. Minimal logic. Calls Use Cases/Facades.
├── use-cases/            # GLOBAL ORCHESTRATORS: Cross-feature logic.
├── features/             # BOUNDED CONTEXTS: Domain-specific modules.
│   └── [feature-name]/
│       ├── components/   # "Smart" components specific to this domain.
│       ├── services/     # "Dumb" data access/DB queries.
│       ├── facade.ts     # FEATURE BRAIN: Internal orchestration.
│       ├── actions.ts    # Server Actions for this feature.
│       ├── commands.ts   # ⌘K entries this slice contributes to the admin palette.
│       ├── index.ts      # PUBLIC API: Export ONLY the Facade and Components.
│       └── schemas.ts    # Contracts: Zod schemas and TS types.
├── components/           # SHARED UI: cross-route components over `lib` infra.
│   ├── account/          # The account surface (dialog + sheet) and its sections.
│   ├── notifications/    # The bell, shared by admin, pilot and passenger.
│   └── ui/               # ATOMIC UI: stateless shadcn primitives.
├── worker/               # BOUNDARY: BullMQ workers. Same image, second command.
├── lib/                  # INFRA: DB clients, Auth config, Shared utils.
│   ├── events/           # Domain event catalog, outbox and queues.
│   └── observability/    # Logger, metrics, Sentry, request context.
└── docs/                 # ARCHITECTURE: The system manifesto.
```

## Manifesto Rules
- **Deep-linking into a feature's `/services` folder is a build-breaking offense.**
- **Every Feature MUST expose its logic through a single `facade.ts`.**

## Native Shell (Capacitor)

The iOS (`ios/`) and Android (`android/`) apps are thin Capacitor shells whose WebView loads the
deployed site (remote-URL shell — the app is server-rendered and cannot be statically exported).
Native plugin access is cross-cutting infrastructure and lives in `src/lib/native/*`
(`haptics.ts`, `push.ts`, `app.ts`, `keyboard.ts`, `back-policy.ts`, `native-bootstrap.tsx`,
`native-back-handler.tsx`), same status as `lib/auth-guards`: any layer's
client components may import the wrappers, but `@capacitor/*`, `@capacitor-firebase/*` and
`firebase` are never imported outside `src/lib/native/` (lint-enforced). The server half of push
is the mirror image: `firebase-admin` may only be imported by `src/lib/push.ts`, so the
credentials have exactly one import site and cannot reach a browser bundle. See AGENTS.md §7 for
the operational rules.

### Native chrome, offline shell and motion (COD-251)

- **Tab bar.** On iOS the member tabs are a native `UITabBar` (Liquid Glass on iOS 26) drawn by
  `@capgo/capacitor-native-navigation` through `src/lib/native/navigation.ts`. `MemberTabBar`
  picks the branch on the server from the user agent (`isNativeIosUserAgent`), so the web pill
  never flashes; Android and browsers keep `MobileTabBar`. `NativeTabBar` renders nothing and
  only syncs tabs, selection, the chat badge and `hidden` (thread, keyboard, wide viewport).
  The plugin writes `--cap-native-navigation-bottom`; `pb-tabbar` and the Toaster fall back to
  the web expression when it is unset. A pre-paint script sets `<html data-shell="ios">`.
- **Offline shell.** Serwist (`src/app/sw.ts`, bundled after `next build` by
  `scripts/build-service-worker.mjs` into `public/serwist/`, so the server never runs esbuild)
  precaches `/_next/static` and `/~offline` and keeps member and flow documents and RSC
  payloads NetworkFirst. Non-GET, prefetches, `/api`, `/admin`, `/serwist`,
  `/.well-known` and `/monitoring` never reach the worker. Runtime caches are wiped on every
  sign-out (`finishSignOut`) and whenever `/sign-in` mounts, so a second person on the device
  never sees the first one's pages. iOS needs `WKAppBoundDomains` +
  `limitsNavigationsToAppBoundDomains` for a service worker; both apply only to a shell synced
  against production (the Xcode phase "Strip environment plist keys" drops the plist key
  otherwise, because it blocks the bridge on unlisted hosts).
- **Motion.** View-transition types `push`, `pop` and `tab` drive `MemberPageShell` and the chat
  thread pane. Under `data-shell="ios"` push/pop slide like `UINavigationController`;
  elsewhere they fade. `AppViewController` keeps WKWebView's edge swipe-back off and re-enables the rubber band that
  Capacitor disables; `NativeSwipeBack` switches the gesture on only below a tab root (chat
  thread, ride finish, training) via the in-app `SwipeBackPlugin`, and
  `NativeBootstrap` suppresses the React transition after a popstate that WebKit already
  animated (`hasUAVisualTransition`) until the next pointer interaction.

### Member homes and top-bar navigation

- **Section order.** Each home section is its own async server component (`"use cache:
  private"`) behind its own `<Suspense>` with a skeleton shaped like the card.
  - Passenger (`/passenger`): `Greeting` → `HomeHero` (the next booked ride, else the pending
    request, else the mint "Where shall we ride?" card with the single red Book button) →
    `ChapterChoice` (guests and chapterless members only) → `HappeningSoon` (an event
    carousel, hidden when empty) → `SetupRow`.
  - Pilot (`/pilot`): `Greeting hero` (the red button to open rides) → `PilotStatus` →
    `PilotHero` (training as `SetupRow variant="hero"` while not ready, else today's or
    unfinished ride, else the next ride within 28 days) → `NeedsPilotCarousel` (open rides via
    the same guarded use case as `/pilot/rides`) → `PilotSetupRow` (only when training is not
    already the hero, so it never shows twice).
- **Greeting by time of day.** `daypartScript` (`src/lib/daypart.ts`) runs in the pre-paint
  script of the root layout and sets `<html data-daypart>`. `Greeting` renders all variants
  and CSS shows the matching one, so the prerendered shell never reads the clock and never
  mismatches on hydration. Without the attribute the neutral "Hi {name}" shows. Clock-dependent
  cards (`CalendarTile`, `UpcomingRideCard`) take a server-computed `now` for the same reason.
- **Event photo morph.** An event photo is wrapped in `EventPhotoTransition`
  (`features/rides/components/event-photo-transition.tsx`, a named React `<ViewTransition>`)
  on the home carousel, the Rides list and the event detail. React only pairs named
  `ViewTransition`s with each other, so a CSS `view-transition-name` would not morph.
- **Back arrow, not in-page back links.** On a drill-down `MemberTopBar` shows a ChevronLeft
  (in place of the avatar on phones, before the "Parent › Title" breadcrumb on desktop).
  It calls `router.back()` when `useCanGoBack` says there is in-app history, otherwise
  `router.replace(parent.href, { transitionTypes: ["pop"] })`; `parentItem(pathname, items)` in
  `(member)/nav.ts` is the parent (the owning tab, or the parent row). `useCanGoBack` stamps the
  depth into `history.state.cwaDepth`, and `markReplace()` keeps a replace from counting as a
  step. The same depth feeds `decideBack`, so Android's hardware back also walks history in the
  member shell. Detail pages set the centred title with `<MemberTitle title=… />`
  (`member-title.tsx`); pages no longer render their own back links.

## Observability

`src/lib/observability/` is cross-cutting infrastructure, the same standing as
`lib/auth-guards` and `lib/activity`: any layer may log a line or move a counter. `pino` and
`prom-client` may only be imported inside it (lint-enforced), so there is exactly one logger
and one metrics registry. `console` is an ESLint error outside `logger.ts`; dev-only output
goes through `devConsole`, which is a no-op in production so an OTP or a Mailpit dump can never
reach the JSON log stream. Sentry is used as the SDK ships it — `@sentry/nextjs` in the app,
`@sentry/node` in the worker — over the shared scrubbing and sampling options in
`observability/sentry-shared.ts`.

**Capture happens at boundaries only.** `captureException` lives in Server Actions
(`actionFailure`), Route Handlers (`onRequestError` in `src/instrumentation.ts`), the worker's
`failed` listener on the last attempt and, where a workflow owns the failure, a Use Case. A
facade or a service throws; it never reports. That is what keeps one failure one issue instead
of one per layer it passed through.

`actionFailure` in `lib/domain-error.ts` is the only door from a thrown error to a returned
result: it `unstable_rethrow`s framework errors first, turns a `DomainError` into the error
string the UI expects, and logs plus captures everything else.

Every log line carries `trace_id` and `span_id` read from the active Sentry span, so a line and
the issue it belongs to meet without an id of our own. Sentry is initialised in the worker by
preload (`node --require ./worker-instrument.js worker.js`) rather than a first import, because
the SDK must instrument pino, Prisma and ioredis before they load.

Session Replay records on error only and never on `/chat` or `/admin/passengers`
(`REPLAY_FORBIDDEN`). It masks all text and every input, except text that is exactly a
dictionary string: `maskFn` is `maskUnlessStatic` from `observability/replay-mask.ts`, fed
lazily with the dictionary for the page's `lang`. A template matches only when its placeholders
are numbers (`{count}`, `{total}`, …) or `{word}`. Placeholder copy is left out because it
holds sample names and addresses, and anything inside `input`, `textarea` or
`[contenteditable]` stays masked even when it matches. A layout bug is visible in a replay;
a name, an address or a note is not.

Counters and histograms live in `observability/metrics.ts` and are scraped from `/metrics`,
which both the web process (`src/instrumentation.ts`) and the worker serve through
`startMetricsServer`; the worker also registers the queue, outbox and worker-up collectors.

## Internationalization (COD-255)

Messages are data, not code: `src/messages/{namespace}/{locale}.json` in ICU message format,
one Tolgee namespace per folder — `app` (UI), `email` (mail, push, inbox, calendar feed) and
`errors` (the root error boundary, which renders without a layout). Git is the source of
truth; Tolgee Cloud is where people edit, synced with `npm run i18n:push` / `i18n:pull`.
Production never calls Tolgee.

- **Locale**: `getLocale()` in `src/lib/i18n` — `NEXT_LOCALE` cookie, then Accept-Language.
  No locale in the URL. `User.locale` drives email, push and the calendar feed only.
- **Loading**: `loadMessages(locale)` in `src/lib/i18n/messages.ts` is the one loader.
  `getDictionary()` returns the typed raw messages for server components, which pass
  finished strings or raw slices to Client Components as props. It is wrapped in React
  `cache()`, so a render loads the messages once however many components ask.
- **Formatting**: `formatMessage(template, values, locale)` in `src/lib/i18n/format.ts` —
  memoised `IntlMessageFormat`, client-safe. Plurals are ICU plurals so every language gets
  its own categories.
- **Emails**: `getEmailStrings(locale)` in `src/emails/strings` over `messages/email`, the
  same `formatMessage` for interpolation; the worker bundle inlines the JSON.
- **Translator mode**: a feature-branch build with `NEXT_PUBLIC_TRANSLATOR_MODE=1` makes
  `loadMessages` fetch live translations from Tolgee (server-side `TOLGEE_READ_KEY`, `translations.view` only) and append
  Tolgee's invisible key marker to every `app` message; `<TranslatorTools />` in the root
  layout starts Tolgee's observer so Alt+click opens the in-context editor. The translator's
  own key comes from the Tolgee Tools browser extension, never from the bundle. Production
  builds compile the path away (`translatorModeBuilt` is false) and the server refuses it
  when `SENTRY_ENVIRONMENT=production`.

### Legal texts are versioned documents, not Tolgee messages

The privacy notice, the terms of use and the imprint are long, lawyer-approved texts. They
live as Markdown in `src/messages/legal/{document}.{locale}.md`, outside Tolgee: a translator
editing a sentence there would silently change a binding text without a new version.

- **`features/legal`**: the service reads the file, the facade returns it with its edition
  from `LEGAL_EDITIONS` (`version`, `updatedOn`, `draft`). A text change bumps the edition.
  The onboarding consent step stores `editionOf("privacy").version` as `User.privacyVersion`
  next to `privacyReadAt`; no terms version is recorded yet (T-14 §4 will store
  `editionOf("terms").version`). Short UI strings around the texts (titles,
  "Version … · Last updated …", the draft notice) stay in `messages/app` under `legal`.
- **`lib/legal`**: the document list, `legalHref` and `legalLinks(titles)`, safe for any layer
  and for Client Components.
- **Shipping**: the files are read at request time. `outputFileTracingIncludes` in
  `next.config.ts` puts them into the standalone output, but the Docker image only receives
  the folders its `RUN` step lists, so the `Dockerfile` moves `src/messages/legal` into
  `/out/app` itself. Without that line the pages render an error in production, and the
  `mv` fails the image build if the folder is missing.
- **Draft guard**: while `draft` is true the page shows a notice. `facade.test.ts` fails
  when a document marked final still contains a `[placeholder]`.
- **Where the links are**: sign-in, welcome, the account surface ("Legal" group, which also
  covers admins through the user menu, and shows the text in place), the onboarding agreements
  and every email footer (with `?lang=` set to the email's locale). Inside the native shell
  they navigate in place, never through `target="_blank"`, which Capacitor hands to Safari.
- **Back**: the legal pages' back button goes back in history only when the visitor arrived
  from inside the app (`arrivedFromApp`); someone landing from another site or a fresh tab
  goes to `/` instead.

### The account surface is mounted once and reads legal texts in place

The account sheet (phone) or dialog (desktop) is mounted once per shell by `AccountPanel`, in
the member shell and the admin layout. What it shows lives in a small client store
(`account-state.ts`): the open section and, on Legal, the open legal document. Anything may
change it (`openAccount`, `openLegalDocument`, `closeLegalDocument`, `closeAccount`); only
`AccountSurfaceHost` reads it and passes it down as `AccountChromeProps`.

A legal document opens inside the surface instead of navigating to `/legal/*`, so the surface
never unmounts and needs no URL state. The text comes from `readLegalTextAction` on demand
(`legal-text-request.ts` keeps one request per language and document, and forgets a failed
one so retrying loads again), rendered by the same `LegalDocumentView` as the public page.
Escape, and with it the Android back button, closes the document before the surface.
Ctrl/Cmd-click on a row still opens the public page in a new tab.

## Roles & Organisation Structure (COD-158)

### Chapter = BetterAuth organization (decision)

A chapter **is** a BetterAuth `organization` row, extended with `countryId`, `city`,
`address` and `careHomeName` — not a separate `Chapter` table pointing at an
`organizationId`. The organization model already carries everything a chapter needs
(id, name, unique slug) and the `member` table is the membership backbone we want, so a
second table would only buy us two rows to keep in sync and a join on every read.

Consequences:

- `allowUserToCreateOrganization: false` — chapters are created through
  `features/chapters` (which fills `countryId`), never by a client calling
  `organization.create`.
- `Prisma.Organization` is the chapter row. Only `features/chapters/services` touch it;
  everything else goes through the facade.
- The chapter columns are deliberately **not** registered as BetterAuth
  `schema.organization.additionalFields`: that keeps them out of the
  `organization.update` body schema, so a chapter admin cannot move their chapter into
  another country (and thereby under another country admin) through the built-in API.

### Chapter settings

`ChapterSettings` is a 1:1 row on the chapter, owned by `features/chapters`. It is written
lazily: `chapters.getSettings(chapterId)` answers with `DEFAULT_CHAPTER_SETTINGS` while
there is no row, so nothing downstream ever branches on a missing one, and
`chapters.updateSettings` upserts (refusing a chapter that does not exist with
`DomainError("unknownChapter")`). Today it holds `notifyOnMemberJoined`,
`applicationAlertPush`, `replyToEmail` and `welcomeNote`.

Everything reads it through the facade, never the table: the notification kinds
(`chapter.memberJoined` returns no recipients at all when the chapter switched the card
off, `user.onboarded` carries the welcome note into its payload,
`pilotApplication.submitted` answers `chapterAllowsPush` from it) and
`use-cases/notifications/deliver-email`, which puts the chapter's reply-to on the mail. The
admin edits the row on `/admin/settings` through `app/admin/settings/actions`, behind
`requireChapterAdmin(chapterId)` — the guard that makes these a chapter's own switches.

It is also the home for the per-chapter notification intervals the RFP asks for: a column, a
default in `DEFAULT_CHAPTER_SETTINGS`, and the readers ask the facade the same way. The ride
ones are `staffingCheckLeadHours` (COD-262) and `riderReminderLeadMinutes`,
`volunteerReminderLeadMinutes` (30 min, 2 h, 24 h or 48 h) and `demandCheckLeadHours` (2, 12,
24 or 48 h) on the "Reminders" card (COD-263). See [EVENTS.md](EVENTS.md) → *What a kind
decides*.

The booking policy lives here too (COD-260): `bookingLeadTimeHours`, `bookingHorizonDays`,
`defaultRideMinutes` and `defaultStayMinutes`. A column ships only with a consumer: today
the scheduling drawer starts a new ride at `defaultRideMinutes`, a round trip's stay at
`defaultStayMinutes`, and warns (never blocks) when a ride is booked on shorter notice or
further ahead than the policy. Later PRs append their own columns at the end of the model
and of `chapterSettingsInput`, and each adds one card to `/admin/settings`. The same policy is
what the Ride Request Form offers and `submit-ride-request` enforces (COD-261), which also
added `schedulingMethod` (`scheduler` · `auto`, on the Booking card) and `requestAlertPush`
(on the notification card).

### Riding hours (the Chapter Operating Calendar)

When a chapter rides is two tables owned by `features/chapters`: `ChapterOperatingWindow`
(ISO weekday 1–7 plus start and end as wall-clock minutes) and `ChapterClosure` (a calendar
date and an optional reason). Windows are replaced as a set (`chapters.setOperatingWindows`,
validated by `operatingHoursInput`: on the 15-minute grid, at least 30 minutes, no overlap
within a day). `chapters.getOperatingHours(chapterId)` returns the plain
`{ windows, closures }` shape that the pure helpers in `src/lib/operating-hours.ts` read:
`windowsOn`, `fitsHours`, `closedRanges`, `openingBand`. They work on the
chapter's wall clock (a ride at 10:00 on a DST Sunday is inside a 10:00–16:00 window), and
no windows at all means "always open", so a chapter that never set hours sees no warnings.

Consumers: the week grid shades closed hours and widens its band to the configured hours
(single-chapter scope only, since hours belong to one chapter), and the scheduling drawer
warns "Outside riding hours (Tue 09:00–12:00)" or "Chapter closed that day". Nothing is
refused because of hours — an admin may always schedule outside them.

### The hierarchy

```
superadmin                    user.role (admin plugin)
  └─ country admin            country_admin (userId + countryId)
       └─ chapter admin       member.role contains "admin"
            ├─ pilot          member.role contains "pilot"   (approved per chapter)
            └─ passenger      member.role contains "passenger" (active immediately)
```

Roles stack. One `member` row holds them comma-separated (`"admin,pilot"`) — BetterAuth's
native multi-role format. Because client-side `checkRolePermission` cannot evaluate several
dynamic roles, every check is server-side, in `lib/auth-guards.ts`.

### Session

`customSession` embeds an `access` object built by `use-cases/build-session-access`:

```ts
access: { role, countryAdminOf: countryId[], memberships: [{ chapterId, roles[] }] }
```

Guards read that object, so they mostly never query the DB per request. Two exceptions:
`requireChapterAdmin`, which resolves the chapter's `countryId` (one indexed lookup)
only after the membership check has already failed — a country admin is not a member —
and `requireAdminScope`, which needs the country and chapter rows to name what the
person administers (see [Admin shell](#admin-shell-cod-172)).

### Guards (`lib/auth-guards.ts`)

`getSession`, `requireAuth`, `requireSuperAdmin`, `requireSuperAdminStepUp()` (see
[Admin invites](#admin-invites-featuresadmins)), `hasFreshPasskey(session)`,
`refreshSessionCookie()`, `requireCountryAdmin(countryId)`,
`requireChapterAdmin(chapterId)`, `requireCountryAdminOfChapter(chapterId)`,
`requireChapterRole(chapterId, role)`, `requireAdminScope()`, `getHighestRole(session)`,
`homeOf(session)`, `redirectIfElsewhere(session, perspective)`,
`requirePerspective(perspective)`, `readNextPath()`. Each higher guard satisfies the lower
ones: superadmin passes everything; a country admin passes chapter-admin checks for
chapters **in their own country only**. The predicates behind them are pure and live in
`lib/access.ts`, which imports nothing.

`npm test` (Jest, via `next/jest`) covers the whole chain: `lib/access.test.ts` for the
pure predicates, `lib/auth-guards.test.ts` for the guards, `use-cases/build-session-access.test.ts`
for the integrated DB-rows-to-guard-verdict flow, and `features/membership/facade.test.ts`
for the mutation rules. Only `lib/prisma` and the session transport are mocked.


### Dev accounts

`prisma/seed.ts` (`npm run db:seed`) creates one account per perspective plus a two-country
demo structure. See [DEV-ACCOUNTS.md](./DEV-ACCOUNTS.md) for the login table.

### Permission rules

| Role | May |
| --- | --- |
| superadmin | everything; create countries; invite/remove country admins; invite/remove superadmins (`/admin/admins`) |
| country admin | create/edit chapters in own country; appoint/remove chapter admins there; everything a chapter admin can, for own country's chapters |
| chapter admin | approve/reject pilot applications for own chapter; promote members to chapter admin; manage own chapter |
| pilot | free self-signup; membership per chapter requires approval; may belong to many chapters |
| passenger | free self-signup; membership active immediately, no application |

### Admin invites (`features/admins`)

Nobody becomes a superadmin or a country admin by someone else's click alone. A superadmin
invites by name and email: from `/admin/admins` for a superadmin, from the Countries table for a
country admin. `use-cases/invite-admin` provisions an account for an unknown address
(`accounts.provisionUser`, as chapter invites do) and `admins.createInvite` writes an
`AdminInvite` row (`kind` `superadmin` | `countryAdmin`, `countryId` for the latter, a random
UUID id, `expiresAt` seven days out) and emits `adminInvite.created`, whose kind mails the
invitee and fills their bell with a link to `/admin-invite/<id>`. Inviting the same person to
the same role again withdraws the earlier open invite.

The role is granted only on acceptance, in `use-cases/accept-admin-invite`, and only when
the signed-in user is the invitee, the invite is neither accepted, withdrawn nor expired, and
the account has a passkey (the accept page offers to create one first). The claim is a
conditional update (`acceptedAt` null, `revokedAt` null, `expiresAt` in the future), so a
withdrawal racing an acceptance has exactly one winner. Accepting refreshes the session cookie
cache (`refreshSessionCookie`), because `user.role` travels in the 5-minute cookie cache.

`admins.removeSuperadmin` locks every superadmin row (`SELECT … FOR UPDATE`) and refuses to
remove the last one, including oneself; it also withdraws the open invites the removed person
sent. Granting (sending a superadmin invite) and removing need a **passkey step-up**:
`lib/auth.ts` stamps `session.passkeyVerifiedAt` when better-auth's
`/passkey/verify-authentication` opens a session, and `requireSuperAdminStepUp` accepts only
a session stamped within `STEP_UP_WINDOW_MS` (5 minutes) whose user is still a superadmin in
the database, not just in the cookie. Otherwise the Action answers `stepUp`, and the client's
`withPasskeyStepUp` (`lib/passkey-client`) runs `signInWithPasskey` and retries once. Because
a signed-in session limits `allowCredentials` to its own passkeys, the step-up re-opens a
session for the same person.

better-auth's own admin plugin endpoints (`/api/auth/admin/*`: set-role, create-user,
remove-user, ban, impersonate, …) are refused over HTTP by a `hooks.before` in `lib/auth.ts`
(`isBlockedOverHttp`), so none of the rules above can be sidestepped through the REST API.
Server-side `auth.api.createUser` (account provisioning, seed) carries no request and still
works.

A brand-new account with an open admin invite skips the role-choice onboarding:
`resolveDestination` sends anyone with an onboarding step still open and an open invite
to `/admin-invite/<id>`, where the passkey step comes first. Admins need no onboarding
fields beyond the name given in the invite. Accepting writes a `superadminGranted` history
line (`superadminRemoved` on removal); a country admin appointed through an invite emits
`countryAdmin.appointed` with `viaInvite: true`, which keeps the history line but drops the
"you look after X now" mail the invitee would otherwise get right after accepting.

## Onboarding (COD-157)

### Account ≠ passenger

An account (`User`) and a person who rides (`Passenger`) are separate rows, because one
account will book for several people — a relative or carer signing up on behalf of someone
who cannot use a phone. `Passenger` carries the rider's identity plus `chapterId`,
`managedByUserId` (the account that created it) and an optional `userId`, set only for the
account holder's own profile.

Every passenger one account manages must share a chapter. That is enforced in
`features/passengers/facade.ts`, not by a constraint: "the chapter this account already books
for" is a fact about existing rows, not a shape a column can express.

The account holder's **own** home lives on `User` (`residence`, `address`, `latitude`,
`longitude`) — that is what the service-radius check is run against. `birthDate` and `gender`
appear on both `User` (a pilot is always the account holder) and `Passenger` (a rider may
have no account at all). Collapsing that would need a `Person` table; it is a deliberate
duplication, marked in the schema.

`Organization.serviceRadiusKm` (default 10) is how far a chapter will ride from its own
position. Per chapter rather than a constant — a rural chapter covers more ground than a city
one, and the number is a policy, not a fact about geography.

Onboarding ends at the passkey step for everyone. The pilot "next steps" screen is gone: the
training courses (derived from the training gate), the in-person training and the first ride are
steps of the home-screen setup checklist instead (see Person profiles and Training). The in-person step is confirmed by an admin only.

## Person profiles

A small, optional profile — photo, bio, curated interests, up to three conversation starters,
age, and for riders the accessibility tags — so a pilot and a rider meet as people. It is never
part of sign-up; a dismissible checklist on the member homes nudges people towards it.

### The profile belongs to the person who rides

`PersonProfile` hangs on exactly one owner: the `User` when someone speaks for themself, or a
managed `Passenger` (no account) when a relative or carer fills it in on their behalf. A
provisioned account that its owner has not claimed yet (`createdByUserId` set, `claimedAt`
null) is still the helper's to fill in; claiming hands it over. `transferPassengerProfileToUser`
moves a managed rider's profile onto an account, ready for the day a rider can be linked to a
new account (no flow does that yet).

### Visibility is chapter-wide, health is narrower

`use-cases/person-access` decides, from current memberships: approved pilots see everyone in
their chapters, riders and their managers see the chapter's pilots, admins see their scope,
and riders never see each other. Anyone else gets `notFound()` — the pages and
`/api/files/[id]` answer the same way, so ids cannot be probed. Profile photos are
`StoredFile`s of kind `profilePhoto` (512px square WebP, attention-cropped by `sharp`), served
through `use-cases/file-access`, which applies the same rule. They are never written to
`User.image`, because better-auth ships that column to the client with the session.

The accessibility tags are health data (GDPR Art. 9). They are stored only after explicit
consent — an optional box in the passenger consent step, or the same text inline on the
profile — and a manager attests for a managed rider. Admins can never consent for anyone.
Withdrawing clears consent and tags in one write. Only the person, their manager, admins and
the chapter's pilots see them (`seesHealthDetails`), never another rider.

### Deleting an account deletes its photos

The schema cascades the rows, but objects in the bucket survive a cascade, so
`use-cases/delete-account` collects the photo keys of the account and of the riders it manages
before `accounts.deleteUser`, then deletes the objects.

### Handing a rider over (COD-261)

A rider without an account of their own is always managed by exactly one account. When that
account leaves the chapter or should no longer book, an admin of the rider's chapter hands the
rider over from the rider's page (`/admin/passengers/[id]`, "Hand over…", `?handover=1`):
to a member of the rider's chapter, or to someone new, who gets an account (`accounts`), a
passenger membership (`membership`) and the care invitation. A contact that already has an
account outside the chapter is refused (`notChapterMember`), so nobody is put in charge of a
stranger's rider by typing an address. `passengers.handOverRider` moves `managedByUserId`
under a compare-and-set on the old manager and emits `rider.handedOver`; bookings, profile and
history stay with the rider. The rider's open requests move along
(`rideRequests.handOverOpenRequests`): one for this rider alone now belongs to the new manager,
a shared one goes on without this rider. Each manager hears it in their own words — the old one
is not told who took over — but not the admin who did it, nor a new account its invitation
already speaks to; one `createMany` writes the hand-over into both their histories
(`riderHandedOver`). Those lines carry the rider in
`ActivityEvent.passengerId`, which is how the rider's page reads them back and why deleting
the rider deletes them; the payload holds ids only and the names are looked up as the
history is read (`app/admin/_components/hand-over-names.ts`).

`Passenger.managedBy` is `onDelete: Restrict`. Deleting an account that still manages riders
without an account fails in the database, so `delete-account` deletes them only when asked to
(`removeRiders`), after the dialog named them: the account's own dialog lists them and says to
ask the chapter for a hand-over first, the member page tells the superadmin to hand them over
from their own pages. Riders that go give up their upcoming seats first, and the open ride
requests of the account and of those riders are withdrawn.

## Command bar (COD-172)

`src/lib/commands.ts` is the registry contract for the ⌘K palette: `IconKey`,
`CommandActionId`, `ScopeArg`, `CommandRun`, `CommandGroup`, `CommandEntry`,
`CommandContributor` and `ResolvedCommand`, plus `collectCommands` (filter by scope, drop
the predicate, hand back the serializable form) and `groupCommands` (bucket the resolved
commands into `COMMAND_GROUP_ORDER` for rendering, skipping empty groups).

### Entries are data, not closures

Entries are collected on the server and handed to a Client Component, so nothing on a
`CommandEntry` may be a function or a component. `label` is an already-resolved string, not
a dictionary key. `run` is declarative data — `{ kind: "navigate", href }` or
`{ kind: "action", id, arg }` — that the client turns into a `router.push`, a
`toggleSidebar()`, a `setLocale()` or a sign-out. The icon travels as an `IconKey`, never as
a component; `src/app/admin/_components/icons.ts` holds the `Record<IconKey, LucideIcon>`,
which makes a key nobody drew a type error there rather than a blank row in the palette.

`visible` is the one member that never crosses the boundary. It is a predicate over
`AdminScope` rather than a role name, so a command hides on exactly the same condition as
the nav row it belongs to; `collectCommands` applies it and strips it.

### What a slice contributes

A slice exports `commands: CommandContributor` from `src/features/<name>/commands.ts`. The
contributor takes the `Dictionary`, because labels are resolved server-side — the palette
receives finished strings, never keys. A slice reuses `admin.nav.*` for a destination it
owns instead of inventing a second wording for the same row, which is also what keeps the
sidebar label and the palette label from drifting apart.

`commands.ts` is now part of a slice's public surface, alongside `facade.ts` and
`index.ts`: the `feature-facade` element pattern in `eslint.config.mjs` is
`src/features/*/{facade,index,commands}.ts`, which is what lets `src/app` import it without
tripping `boundaries/dependencies`. Do **not** re-export it through `index.ts` — that file
stays the facade's door ("export ONLY the Facade and Components"), and a presentation
registry has no business behind it.

### How the shell assembles them

`src/app/admin/commands.ts` owns `adminCommands(dict, scope, ctx)`. Its `staticEntries`
walks `NAV` (`src/app/admin/nav.ts`) rather than concatenating whatever the slices happen to
export: a slice **claims** a row by href, and the shell fills in every row nobody claimed
(label from `admin.nav.*`, icon and `visible` from the `NAV` row itself). That makes "every
destination is in the palette, exactly once, in sidebar order" structural instead of a
convention, and it means a slice only writes a `commands.ts` when it has something the row
alone does not say — search keywords, or a verb that is not a destination. Anything a slice
contributes that matches no row still comes through, so a typo'd href surfaces in the parity
test instead of vanishing.

The shell owns the groups no slice does: the `create` entry, the perspective switch (from
`PERSPECTIVE_HOME`, suppressed when there is only one hat to wear), the scope list (from
`scopeChoices`, the same builder the sidebar switcher renders, suppressed when there is only
one choice) and the account group (languages other than the active one, sidebar toggle, sign
out).

`src/app/admin/commands.test.ts` asserts sidebar/palette parity: for a superadmin, a country
admin, a chapter admin and a stacked country-plus-chapter admin, the palette's navigate
hrefs equal `navFor(scope)` exactly — same set, same order, same icons. That test is what
makes the two-file split (`nav.ts` for the sidebar, `commands.ts` for the palette) safe.

## Admin shell (COD-172)

### Authority sets breadth, the switcher narrows

`/admin/members` means "every member I have authority over": one chapter for a chapter
admin, a whole country for a country admin, everything for a superadmin. Narrowing rides on
a query param — `?chapter=<slug>` or `?country=<code>` — not on a URL segment.

A `/admin/[chapter]/…` tree was the obvious alternative and was rejected: a country admin
needs a country-wide members view, so a chapter segment would have made the common case the
special case, and every entry into the dashboard would have had to redirect to *some*
chapter first. With the param, the default view is the widest one the person is entitled to
and the switcher is an optional filter on top of it.

The pure half lives in `lib/access.ts`, which imports nothing:

- `hasAnyAdminScope(access)` — is there any admin surface for this person at all.
- `adminChapterIds(access)` — the chapters they administer directly.
- `resolveAdminScope(access, countries, chapters)` → `AdminScope`: the reachable countries
  and chapters, plus `canSeeChapters` / `canSeeCountries`, which is what the nav and command
  `visible` predicates read. A superadmin gets every chapter unconditionally rather than via
  the country list.
- `defaultActiveScope(scope)` → `ActiveScope`, what "no param" means. A country is the
  default only when it covers every chapter in reach, so a Denmark country admin who also
  runs one German chapter does not open onto a view that silently omits it.
- `resolveActiveScope(scope, params)` → `ActiveScope | null`. Case-folded on both sides, so
  a mis-capitalised link reads as a typo rather than as an access failure.
- `availablePerspectives(access)` → which hats (`Perspective`) the switcher offers, read off
  the membership rows rather than from `getHighestRole`, which collapses a stack to its top
  entry. `PERSPECTIVE_HOME` in `lib/redirects.ts` says where each hat lives; `HOME_BY_ROLE`
  next to it answers the different question of where an account belongs after sign-in.

### `readActiveScope` closes the `resolveActiveScope` thread (COD-170)

`resolveActiveScope` returning `null` means the requested narrowing is outside the caller's
authority. Now that pages read real data through `?chapter=` / `?country=`, exactly one
helper turns that `null` into a refusal: `src/app/admin/active-scope.ts`.

```ts
const { session, scope, active, chapters, chapterIds } =
  await readActiveScope(searchParams);
```

It runs `requireAdminScope()`, resolves the params, and calls `forbidden()` when the answer
is `null` — never a quiet fall back to the default scope, which is what would have made the
param an escalation path (a chapter admin appending `?country=DK` getting a country-wide
answer). `chapterIds` is `scopeChapters(scope, active)`, so every query underneath is
already narrowed to what the viewer administers, and `active-scope.test.ts` pins the
out-of-scope case. Every admin page that reads data goes through it; the `searchParams`
promise is passed into the `<Suspense>` child and awaited there, never in the page
function.

### Why the active scope is resolved in the browser

A Layout cannot read `searchParams`. So the server supplies only what it can know without
the URL — the list of *allowed* scopes (`scopeChoices`) and the default (`defaultScopeArg`,
mirroring `defaultActiveScope`) — and `ScopeSwitcher` and `AdminTopBar` read the actual
narrowing off the URL client-side with `readScopeArg`. A label resolved server-side would
keep saying "München" after someone widened to the whole country. `scopeHref` rewrites the
query on the current pathname, because narrowing keeps you on the page you are looking at
rather than navigating away; the switcher and the palette's `scope.set` action share that one
helper.

### The gate is called twice, on purpose

`requireAdminScope()` is the gate for the dashboard as a whole: anyone who administers
*something* gets in, and what they administer comes back with them as `AdminScope`. It is
`cache()`d per request, and it is called by all three of the shell's streamed children
(`AdminSidebar`, `AdminChrome`, `AdminCommandBar`) **and again underneath the layout**, in
`AdminPageBody` — because a Layout is not a security boundary in Next. Keeping that re-check
in the shared page body rather than in each of the eleven pages makes it impossible to forget
when a twelfth is added.

Every piece of that chrome reads the session, and under `cacheComponents` a request read
cannot be prerendered, so each one streams behind its own `<Suspense>` and the static shell
is just the ground and the content card. `sidebar_state` is deliberately not read in the
layout: it would make the ground dynamic to save a single frame of animation.

`requireAdminScope` currently scans all countries and all chapters (deduped by `cache`, and
held in `"use cache"` under the `admin-scopes` tag, which the chapter and country create /
update / delete actions expire). That is marked in the source as a known ceiling: at a few
hundred chapters it should resolve only the scope's own rows instead.

### A session read is cheap: three caches

Every admin pageload prefetches the App Shell of each sidebar link, and each of those renders
runs the guards, so the session read must not cost a round of queries:

- **better-auth cookie cache** (`session.cookieCache`, 5 min, `strategy: "jwe"`) skips the
  session and user rows. JWE because the cached user carries name, email and phone number —
  a signed-only cookie would leave them readable in the cookie jar and device backups.
  The accepted cost: a ban, a revoked session or a changed `user.role` takes effect within
  five minutes. Sign-out expires the cache cookie with the session cookie. A Server Component
  cannot write cookies, so after the cache cookie expires the next action or route handler
  re-issues it; until then renders fall back to the database.
- **`buildSessionAccess`** (`customSession` runs it on every read) is `"use cache"`, keyed by
  user id and global role, tagged by `accessCacheTags` in `lib/cache-tags.ts`:
  `access:<userId>`, one `access:chapter:<id>` per membership and one `access:country:<id>`
  per country administered (`access:wide` past 127). Every action that writes a membership or
  a country-admin row calls `invalidateAccess(...)`: the affected user ids, or the chapter /
  country ids for a cascade (chapter or country delete). better-auth's own organization and
  admin endpoints are covered by an after-hook in `lib/auth.ts` (`expireAccess`, i.e.
  `revalidateTag(..., { expire: 0 })`, since `updateTag` only works in actions). Writes from
  another process (seed, scripts) are not seen by the tag, so the entry revalidates after
  60 s and expires after 5 min. `src/lib/access-invalidation.test.ts` pins each action.
- **Passkey count** for the admin gate is `"use cache"` per user under `passkeys:<userId>`,
  expired by the same after-hook on `/passkey/verify-registration` and
  `/passkey/delete-passkey`.

### Instant admin headers

`readActiveScope` awaits `searchParams`, which an App Shell never has, so a page that builds its
header there shows a skeleton for the whole main area on every sidebar click. The pilot splits
the page instead: the header and section headings are `"use cache: private"` components
(`ADMIN_LIFE`, `stale` 300 s, the App Shell threshold) over `adminViewer()`
(`admin/admin-viewer.ts` — the viewer's chapter and country ids plus the stored scope), and
the scope-dependent bits (button visibility, tab hrefs) are resolved client-side from
`useSearchParams()` by `viewerScope` (`admin/_components/viewer-scope.ts`; `chapterId` is set
only when the active scope is a single chapter, never for a one-chapter country). Data — lists,
the pools badge, the drawers — stays behind `readActiveScope(searchParams, nav)` in small
Suspense boundaries passed into the cached header as slots, fed by one React-`cache()`d loader
per page. `adminViewer` is display only: the data boundary and every action still enforce the
scope. An uncached `getDictionary()` is not enough for the shell — header text has to come from
the private-cached component.

Every admin list page follows it (overview, rides, members, passengers, trishaws with its
three tabs, locations, chapters, countries, reports, settings). What stays a Suspense island
is what needs scoped data: list rows, KPI tiles, the rides and timeline week switchers
(chapter time zones), "Neue Rikscha" (manageable locations), the add-passenger drawer
(dialling country). Chat keeps its data-bound layout, because the title and controls live in
the shared `features/chat` layout; only its loading state carries the real title. Detail
pages (`[userId]`, `[rideId]`, …) are unchanged and keep their own `loading.tsx`.

Every admin list renders through one client primitive, `DataTable`
(`src/components/ui/data-table.tsx`, on `@tanstack/react-table`): search, column filters,
column visibility, sortable headers, pagination and clickable rows. The server parent still
does all the reading and hands it finished rows plus `dict.admin.table`; filtering and paging
are client-side over the full scope list, which is the documented ceiling in that file.

### Overview: needs attention, this week, recent activity

Below the KPI strip `/admin` is a two-column grid: the *Needs attention* inbox and the
*This week* agenda in the main column, *Recent activity* on the side. Each section is its own
async server component in its own `<Suspense>`, each re-reads the scope with
`readActiveScope(searchParams, "overview")`, and all three read through
`use-cases/admin-overview.ts`, which asks every facade for the scope's chapters only and
filters the results to them again (see the dependency graph). Inbox rows link to the existing
detail pages with a visible action button; there is no edit drawer for these items.

## Core loop (COD-170)

### The org plugin's own permissions are locked shut

BetterAuth's organization plugin exposes `/api/auth/organization/*` and checks those calls
against its own access-control roles, not against our facades. With the default
`orgAdminAc`, anyone holding the `admin` role in a chapter could call `updateMemberRole`,
`removeMember`, the invitation endpoints and — worst — `updateOrganization`, which would let
them rewrite a chapter's slug and break every printed poster pointing at it.

`src/lib/auth.ts` therefore maps **every** organization role to `memberAc`:

```ts
export const organizationRoles = {
  admin: orgMemberAc,
  pilot: orgMemberAc,
  passenger: orgMemberAc,
};
```

`memberAc` has empty `organization` / `member` / `invitation` statements, so every org-plugin
mutation is denied and the only way to change a role is `membership.withRoles`, where the
last-admin rule and the chapter lock live. `src/lib/auth-org-access.test.ts` pins the
configuration.

### The last admin cannot be removed, and the check holds under concurrency

`membership.withRoles` runs inside `withChapterLock(chapterId, fn)` —
`prisma.$transaction` plus `` tx.$queryRaw`SELECT id FROM organization WHERE id = ${id} FOR UPDATE` ``
before anything is read. Inside the lock, a change that drops `admin` from a member counts
the chapter's remaining admins; at one or fewer it throws `Last admin of the chapter`.

The lock is what makes it a rule rather than a suggestion: two admins demoting each other in
the same second would both pass an unlocked count and leave the chapter orphaned.
`removeFromChapter` is defined as `withRoles(…, () => [])` precisely so removal cannot
sidestep the same check. Callbacks inside the lock stay DB-only — the decision email is sent
by the use case afterwards, never inside the transaction.

### Activity feed (`lib/activity`)

One append-only table, `activity_event`, records what happened to a person: applications
submitted/approved/rejected, roles granted and revoked, members removed, emails sent, country
admins appointed and removed.

It is **infrastructure, not a feature** — the same standing as `lib/auth-guards` and
`lib/mailer`. It owns no domain of its own and every workflow writes to it, so modelling it as
a slice made every logged mutation look "cross-feature" and manufactured use cases for
single-feature work. A facade may write its own history line: `accounts.claimAccount` does,
which is why it needs no use case.

Most of it is now written by a listener, not by the facade that did the work:
`src/worker/listeners/record-activity.ts` holds one builder per event type and turns the same
facts the notifications are built from into a history line. The trade-off is deliberate — the
feed for those kinds is **eventually consistent**, about a second behind the write, and an
admin who reloads instantly may not see the line yet. `emailSent` still comes from
`deliverEmail`, and `accounts.claimAccount` still writes its own line synchronously.

It also solves a data problem: `ChapterApplication` keeps its `@@unique([userId, chapterId])`,
so re-applying overwrites the previous decision. The events do not overwrite, so the history
on `/admin/members/[userId]` survives a re-application. Events with a `chapterId` are chapter
scoped and only visible to admins of that chapter; country-level events (country admins) carry
no `chapterId` and surface only when the reader's scope is global —
`activity.listForUser(userId, { chapterIds, includeGlobal })` defaults `includeGlobal` to
`false` so a narrow read cannot leak them by omission.

A line may also name a rider without an account of their own (`passengerId`, COD-261): such a
rider has no account to hang a history on, so `activity.listForPassenger` reads the lines about
them, and the rider's deletion takes those lines along. A builder may return several lines,
which `activity.recordMany` writes in one statement.

Labels live in the dictionary (`admin.history.<ActivityType>`) with a single `{actor}`
placeholder, filled with the actor's name, "You", or "Someone" — the feed renders copy, the
table stores facts.

### Notification bell (`src/components/notifications`)

The bell is not a feature slice and not an admin component. Two shells show the same inbox —
the admin top bar and the member top bar (`/pilot` and `/passenger`) — so it lives in
`src/components/` with the other cross-route UI, one server component (`notification-bell.tsx`)
over the `listInbox`/`unseenCount` use case and one client popover
(`notification-bell-menu.tsx`) that holds nothing but open state.

Every call site wraps it in `<Suspense>`. The bell reads the session and the request headers,
which under `cacheComponents` is a request-time read: outside a Suspense boundary it fails the
build rather than the request. The fallback is a plain skeleton. `MemberChrome` renders the
whole thing — bell *and* fallback — as `null` when there is no session, so a guest on
`/passenger` never sees a control flash where there will be none.

Its two actions — `markInboxSeen`, `markNotificationRead` — deliberately **do not**
`revalidatePath`. A Server Action re-renders the route it was called from, and the badge and
the row it just changed are exactly what the person is looking at, so a revalidate would
repaint the popover out from under the click. The menu keeps the change in local state instead
and the next navigation reads the truth from the server. `key` on the client menu derives from
the server's own numbers (unseen count, row count, first id, unread count), so a genuinely new
inbox resets that local state and an identical re-render leaves it alone.

### `?next=` is carried by a cookie, not by the URL

`proxy.ts` stamps `x-pathname` (pathname + search) on every matched request, which is the only
way a Server Component can know where it is in Next 16 — `headers()` has no pathname. That is
what lets `requireAuth()` redirect to `/sign-in?next=<here>` instead of a bare sign-in.

The destination then moves into an httpOnly `cwa.next` cookie (1 hour), set by `proxy.ts` when
`/sign-in?next=` is visited with a value `safeNextPath` accepts. A cookie survives the Google
OAuth round-trip, a six-screen signup wizard and the Capacitor WebView, none of which would
carry a query string all the way through. `resolveDestination` spends it, and an unfinished
onboarding step always outranks it.

`safeNextPath` (`lib/redirects.ts`) is the only thing that reaches `redirect()`: a value must
be a non-empty, printable, ≤512-character path starting `/` and not `//` or `/\`, whose
`new URL(raw, "http://x").origin` is unchanged, and which is not under `/sign-in`,
`/onboarding`, `/location`, `/welcome` or `/api` — the loop killers.

### Admins must have a passkey (enrollment gate)

A private `ensureAdminPasskey(userId)` in `lib/auth-guards.ts` reads
`profile.countPasskeys(id)` (`"use cache"`, tag `passkeys:<userId>`) and, at zero, redirects to
`/onboarding/passkey?required=1&next=<current path or /admin>`. It runs in `requireAdminScope`,
`requireSuperAdmin`, `requireCountryAdmin`, `requireChapterAdmin` and
`requireCountryAdminOfChapter` — **after** the role check, so a pilot who satisfies
`requireChapterRole` by role is never asked for one.

It lives in the guards rather than only in the admin shell because a passkey-less admin could
otherwise POST straight at a Server Action.

Known ceiling: this proves the account *possesses* a passkey, not that *this session* used
one. The upgrade path is session step-up — stamp `Session.passkeyVerifiedAt` from
`databaseHooks.session.create.before` on `/passkey/verify-authentication` and require a fresh
stamp — deliberately out of scope.

`@better-auth/passkey`'s `verify-registration` runs behind `freshSessionMiddleware` (24h), so
`addPasskey` fails with `SESSION_NOT_FRESH` on older sessions. With 90-day sessions that is
normal, not exceptional: the account dialog and the onboarding passkey step both handle it by signing
out and restarting at `/sign-in`. `freshAge` is deliberately not lowered.

Inside the native shell the WKWebView has no WebAuthn, so `@/lib/passkey-client` runs the same
two ceremonies through `@capgo/capacitor-passkey` (`@/lib/native/passkey`): it fetches
`/passkey/generate-*-options`, hands the JSON to the platform authenticator and posts the
credential to `/passkey/verify-*`. The server does not change — better-auth verifies
`clientDataJSON.origin` against the request's `Origin`, which the shell shares with the site.
Android reports `android:apk-key-hash:…` instead, so `PASSKEY_ANDROID_ORIGINS` widens the
accepted origins when set. The app is bound to the relying party by the `webcredentials:`
entitlement, the Android `asset_statements` meta-data and by
`/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json`
(`src/app/.well-known/*`, identifiers in `src/lib/native-app.ts`). On `localhost` there is
nothing to associate, so native passkeys only work against the deployed domain.

### Pilot status & celebration

`/pilot` reads the facades rather than `session.access`, because a freshly approved pilot's
session still says nothing — the page has to show the welcome on the very next request.
It derives four things from the membership and application rows: `pilotChapterIds`, `pending`,
`rejected` (rejected *and* not since joined), and `celebrate` (approved with
`approvalSeenAt === null`). Nothing at all → `/onboarding`.

`approvalSeenAt` is what makes the celebration fire exactly once. The banner acknowledges it
on mount, and `acknowledgeApproval` deliberately does **not** revalidate `/pilot`: revalidating
would re-render the banner away a few hundred milliseconds after it appeared. The banner is
already on screen; the next natural request re-reads the column.

## Growth: join links, assisted signup, the auth wall (COD-170 Phase 2)

### `features/accounts` — provisioning an account someone else will claim

The three growth flows (a chapter admin adding a passenger at the door, a chapter admin
inviting a co-admin or pilot, and later a care home enrolling a resident) all need the same
thing: *make a `User` row for a person who is not here right now.* That is a single feature —
`src/features/accounts` — and every one of them goes through `accounts.provisionUser`.

Provisioning is **idempotent on the contact**, not on the name: a lookup by lowercased email
or E.164 phone comes first, and an existing account is returned as `{ userId, created: false }`
with its provenance left untouched. Only `provisionUserStrict` turns that into the
`"Already has an account"` error the passenger dialog surfaces as `exists`; the invite flow
deliberately uses the lenient version, because "invite someone who already signed up" is a
normal request and must still grant them the role.

The row is created through BetterAuth's `auth.api.createUser` with **no password**, so no
credential account exists, `emailVerified` stays `false`, and **no session is created**. A
provisioned account is inert until its owner signs in with the same email or number and
proves it with an OTP — the identity check is the existing sign-in, not a token we invent.
A phone-only contact gets `phoneTempEmail(phone)` as its `email` (the same helper
`lib/auth.ts` hands BetterAuth's `signUpOnVerification`), so the unique column stays
satisfied without inventing a fake address the person could ever be mailed at.

### The helper rule: who owns the account

`Passenger.userId` is the rider's *own* account; `Passenger.managedByUserId` is the account
that books for them. Which one the provisioned `User` becomes is decided by one comparison,
in `use-cases/provision-assisted-passenger.ts`:

> **the account belongs to the helper if, and only if, the helper's contact is the contact
> given for the passenger.**

Both sides run through the same `contact` schema first, so the comparison is between
normalised values. Same contact → the account is the helper's: it is named after the helper,
carries `managesOthers: true`, and the passenger row gets `userId: null` with
`managedByUserId` pointing at it. Different contacts (or no helper at all) → the account is
the passenger's own, and `userId` and `managedByUserId` are both that account. The helper
columns (`helperName`, `helperRelationship`, `helperContact`) are written whenever a helper
was named, in both branches — they are a note about who to call, not a claim of ownership.

Either way `membership.joinAsPassenger` runs, so the account is a member of the chapter
before anyone claims it. Without that, `onboarding-progress` would report `joined: false` and
push a claiming helper back to the location step instead of straight to consent.

### Claiming happens at the consent step, never by skipping it

A provisioned account signs in like any other and lands in `/onboarding`. Consent is the one
thing an admin cannot give on someone else's behalf, so it is **never pre-filled and never
skipped** — `submitConsent` is what calls `claim-account`, which stamps `claimedAt` and
records the `accountClaimed` event. Until then `accounts.getClaimBanner(userId)` returns the
name of whoever set the account up, and the consent step says so in its description
(`consent.setUpBy`), so the person understands why an account already exists. After the claim
the banner is `null` and the account is indistinguishable from a self-signup.

The `accountCreated` / `invited` / `accountClaimed` events on `ActivityType` are what make
that legible afterwards on `/admin/members/[userId]`.

### The join page and the immutable slug

`/join/<slug>` is the public face of a chapter: name, care-home name or city, description and
logo, and nothing else — no address, no coordinates, no member counts. It is one route with
three states (member, signed-in non-member, anonymous) plus a Book-a-ride CTA, and
`/join/<slug>/poster` is the same data on A4 with a QR code.

Anonymous visitors do not get a Server Action; they get a plain link to
`/join/<slug>/start?role=passenger|pilot`, a Route Handler that writes the join-preset cookie
and redirects. A GET that mutates is fine here because the "mutation" is a cookie the visitor
asked for, and the `sec-fetch-dest` check means a prefetch or an `<img>` cannot set it — only
a real navigation.

That URL is printed on posters, so **the slug is immutable**: `chapterUpdateInput` omits both
`slug` and `countryId`, and the chapter page shows the slug read-only. A chapter that has to
be renamed gets a new chapter, not a silently dead QR code on a noticeboard wall.

### Chapters are placed, not typed; edited in place, not in a form

`/admin/chapters?new=1` opens the create drawer (`AdminDrawer`, see AGENTS.md § UI). A name
and an address are the only required input: the address search (`@/components/address-search`
over `suggestChapterPlaces`/`resolveChapterPlace`) fills city, coordinates and country from
Mapbox's context, a point-of-interest result pre-fills the care-home name, and the pin can be
dragged with `reverseChapterPlace` naming the new spot. The slug derives from the name via
`slugify` (same grammar as `chapterInput.slug`) and is checked live with `checkSlugAction`.
Closing the drawer discards what was typed. Mapbox is reached only through these guarded
Server Actions, rate-limited per user.

`/admin/chapters/[chapterId]` is the edit surface. Every field is an `InlineField` that saves
on Enter/blur through `updateChapterAction` with a partial `chapterUpdateInput` — optional text
is `nullable` there so a cleared field clears the column — and offers Undo in its toast. The
action delegates to `use-cases/manage-chapter`, which diffs the row before writing so each
autosave becomes exactly the `chapterUpdated` history lines it deserves; the page reads them
back through `activity.listForChapter`. Deleting asks for the word `DELETE` and shows the
footprint (`chapters.getChapterFootprint`: members, passengers, pending applications) the
schema will cascade; the `chapterDeleted` event is recorded without a `chapterId` so the
cascade cannot take the audit line with it.

The QR itself is `uqr` (zero dependencies) rendered as inline `<svg>` by
`src/components/qr-code.tsx` — a pure function of its `value`, so it prerenders with the
page and needs no client bundle, no canvas, and no image request. `border: 4` is the quiet
zone the QR spec asks for; the default of 1 scans badly across a room.

### The auth wall: drafts survive the sign-in detour

`src/lib/auth-wall.ts` is the contract for "let someone fill something in, *then* ask them to
sign in". `saveDraft(kind, payload)` puts a versioned, timestamped envelope in
`sessionStorage`; `signInHref(target)` sends them to `/sign-in?next=<target>`; `useDraft(kind,
schema)` reads it back on the far side and clears it on mount.

`readDraft` is a pure function so it can be tested without a browser, and it is deliberately
**silent** about every failure — wrong version, wrong kind, older than an hour, malformed
JSON, or a payload that fails the caller's Zod schema all return `null` and the screen falls
back to its no-draft copy. Nothing from `sessionStorage` is ever trusted as input to a write;
a draft is a UI convenience and the Server Action re-validates from scratch. Since COD-261 no
screen uses it: Book a ride on `/join/[slug]` carries the chapter in the link instead, and the
Ride Request Form starts empty.

## Chat

Permanent 1:1 conversations started by contact lookup, group conversations scoped to a chapter,
and a `frozenAt` state reserved for the ride chats that come later. The slice is
`src/features/chat` (schemas → services → facade → actions → components), joined to the rest of
the app by `src/use-cases/chat/*` and `src/use-cases/chat-notifications/*`.

### The transport is SSE, and why there is no second server

Sends are Server Actions. Everything the server pushes back — new messages, edits, reactions,
read positions, typing, presence — arrives over one `text/event-stream` from
`GET /api/chat/stream`. A WebSocket server would be a second process and a second origin: a
custom server "cannot be used together" with `output: "standalone"`, which the Dockerfile
relies on. SSE needs no new dependency, inherits the same better-auth cookie inside the
Capacitor WebView, and Caddy streams it unbuffered.

Pub/sub is best-effort by design. Every message carries a per-conversation `seq`, so a dropped
frame is repaired by the client's reconnect resync (`syncInboxAction` plus
`loadMessagesAction({ afterSeq })`) rather than by a delivery guarantee. `publish` is wrapped in
a 2 s timeout and logs instead of throwing: an unreachable Redis must never fail a chat write.
The client transport sits behind `ChatRealtimeProvider`, so swapping SSE for WebSockets later
touches one file.

### Channels

| Channel | Carries | Published by |
| --- | --- | --- |
| `user:<userId>` | `message.created`, `message.updated`, `reaction.changed`, `conversation.updated`, `conversation.created`, `member.left` | the facade, after commit, one publish per member (pipelined) |
| `conv:<conversationId>` | `typing`, `read` | the facade, from `typingAction` / `markReadAction` |
| `presence` | `presence { userId, online }` | `lib/realtime/presence.ts`, on the 0→1 and →0 transitions only |

A stream subscribes to its own user channel, the focused conversation channel, and `presence`
filtered to the viewer's contact set (`chat.listContactUserIds`, refreshed when a
`conversation.created` arrives). `lib/realtime/events.ts` types the wire format structurally in
zod — `src/lib` may not import from `src/features` — so the feature's view types and the wire
types are kept field-identical by hand, with dates as ISO strings on both sides.


### Envelope encryption

Message bodies are AES-256-GCM ciphertext in a `Blob`, never plaintext. Each conversation owns a
random 32-byte DEK, wrapped under `CHAT_MASTER_KEY` (base64, 32 bytes) and stored in
`Conversation.dek` with a `keyVersion`; unwrapped DEKs live in a 1,000-entry in-process LRU.
Each message uses a fresh 12-byte IV with the conversation id as AAD, so a ciphertext cannot be
replayed into another conversation. All of it is in `src/lib/crypto/chat-cipher.ts` and only the
facade calls it — services hand Bytes in and Bytes out.

What is still to build, in order, with the verbs that already exist for it: [CHAT-PLAN.md](CHAT-PLAN.md).

## Rides, trishaws and the calendar

### What a Ride is

CWA's own glossary is the authority here (`.agents/skills/cwa-context/references/02-glossary.md`).
A **Ride** is the scheduled thing: a chapter, a window, a starting place, the equipment it
commits, and the rosters and volunteer slots that hang off it. The riders on it live in
**`RideRosterEntry`** — and *that* is the counting unit, because the glossary is explicit that
two people on one trip count as two rides. Every statistic in Report 1–20 therefore counts
roster entries, never `Ride` rows.

Three deliberate shapes in the schema, all from
`references/04-ride-models.md` § Design consequences:

- **`model` is a property of the ride, not of the chapter** (`event` · `pleasure` ·
  `functional`) — one chapter runs all three.
- **A destination is nullable, not absent.** Event and pleasure rides start and end in the
  same place; a functional ride goes A → B. The destination columns exist on every row so
  adding functional rides later needs no migration.
- **A round trip is two rides.** `returnLegOfId` is a self-relation, because the RFP treats
  the return leg as its own entry in the Ride Request List.
- **A ride commits *many* trishaws, not one.** `RideTrishaw` is a join table. A request may
  be for "a single trishaw or multiple trishaws"
  (`references/05-ride-lifecycle.md` §1C) and a Multiple Ride Event "can involve multiple
  trishaws, pilots, ambassadors, transporters" (`references/02-glossary.md`). A column on
  `Ride` could not express either. Trailers, wheelchair bikes and transport vehicles —
  listed beside trishaws in §2C — reserve the same way once they have models of their own.

A trishaw's model is a **`TrishawType` row**, not a string. Three requirements compare types —
pilot qualification is per trishaw type (`references/03-roles.md`), a client chooses a bike type
when booking, and the negotiation loop offers another type when one is unavailable
(`references/07-functional-ride-user-stories.md`) — and none of those survives free text, where
`VeloPlus` and `VeloPlus ` are two different models. It is a table rather than an enum because
the reference writes the set open-endedly, *"(Triobike Taxi, VeloPlus, …)"*: it is a
manufacturer's catalogue that grows, and growing it should not be a migration. `Trishaw.typeId`
is nullable, because a bike can be entered before CWA has told us its model. Whether a type also
fixes the seat count and wheelchair access is still open with them; both become columns on
`TrishawType` when answered, which is the point of a table.

`RideAssignment` carries staffing — lifecycle phase 3 — and `RideRole` holds **`pilot` alone**.
CWA does staff rides with ambassadors and transporters, and the glossary names them, but
`ChapterRole` is admin/pilot/passenger: nobody can *be* an ambassador here, so carrying the
values described a capability the app did not have. They return as a plain `ENUM` add once
membership can express them. Pilot qualification is per trishaw *type*, which is why
`Trishaw.type` exists even though nothing enforces it yet.

### Reserving the equipment

Lifecycle phase 2C commits resources: a scheduled ride holds **each** of its trishaws for its
window, and they are "no longer available to others". `rides.scheduleRide`,
`rides.rescheduleRide` and `rides.setRideTrishaws` enforce that over the whole set —
`trishawReserved` when any of them is already out in an overlapping window,
`trishawNotInChapter` when the scheduling chapter cannot reach it, `trishawUnavailable` when one
is in for service. Reachability and readiness are the fleet's questions, asked by the use case
(`fleet.assertUsable`) before the write; the window is checked inside the write.

The facade owns the transaction. Each write opens `transaction((tx, emit) => …, {
isolationLevel: "ReadCommitted" })` from `lib/events`, and inside it `conflictsUnderLock(tx,
trishawIds, windows, exceptRideIds)` locks the trishaw rows `FOR UPDATE` *before* it reads the
overlapping reservations; the same `tx` then writes the ride. Two admins booking the same bike
serialise on that lock, and the second sees the first one's reservation. READ COMMITTED is
load-bearing: under MySQL's default REPEATABLE READ a transaction's snapshot is fixed by its
first read, and a reschedule reads the ride before it waits for the trishaw lock, so its
conflict check would still miss the booking it waited for.

Every write on an existing ride also locks the ride row first, together with the other leg of a
round trip, in id order (`lockRides`). Two admins editing one ride queue up, and the second
reads what the first wrote: a reschedule and an allocation cannot each check a different
window, and a rider cannot be booked onto a ride that is being cancelled. The lock order is
always rides, then trishaws. Rescheduling **replaces** the reservation set rather than merging
into it, and moving a ride re-reserves its trishaws for the new window under the same lock.
Cancelling **releases** the equipment by status alone — the conflict check skips cancelled
rides — so the `RideTrishaw` rows stay as history.

### Writing a ride

Every write on a ride (`scheduleRide`, `rescheduleRide`, `updateRideDetails`, `cancelRide`,
`setRideTrishaws`, `assignVolunteer`, `unassignVolunteer`, `bookRider`, `cancelBooking`) runs in
one transaction that writes the change, **one `RideLogEntry` per ride row** and **one domain
event** (the facade's `record` writes both), and does nothing at all when nothing changed (assigning a pilot twice is silent). Only
a `scheduled` ride can be changed (`rideClosed` otherwise). A cancelled one can only be deleted,
and deleting is what frees its square on the calendar (`rideNotCancelled` for anything else).

- **History is ride-scoped.** `RideLogEntry` mirrors `TrishawLogEntry`: a type, the actor, a
  JSON payload. It is not `ActivityEvent`, which is about a user as its subject. The payload
  holds ids, never a person's name: `rides.listRideLog` looks names up as it reads, so deleting
  an account or a rider removes their name from every ride's history ("a former member"), and
  coordinates stay out of the change diff. The note for pilots (`Ride.note`) is a field, and its
  text never goes into the log or an event. Deleting a ride deletes its history; the
  `ride.deleted` event is what records who did it.
- **A round trip is written once.** `scheduleRide` with a `returnLeg` checks both windows under
  one lock and inserts both rows in the same transaction, the way back mirrored (origin and
  destination swapped) and linked by `returnLegOfId`. Either both legs exist or neither does.
  Moving the way there moves a scheduled way back by as much as the way there's end moved, in
  the same transaction and with both new windows checked under the lock, so the time at the
  destination stays the same; a cancelled way back stays put. The way back moves on its own
  but never to before the way there arrives (`legsOverlap`). A leg of a round trip stays
  functional (`partOfRoundTrip`), and cancelling the way there takes the way back with it
  unless the admin unticks it. Deleting a cancelled leg deletes a cancelled other leg with it
  and is refused while the other leg is still going ahead (`otherLegScheduled`), so a way back
  is never left behind with its places swapped; a completed other leg stays in the records.
- **Cancellation has a reason code.** `Ride.cancellationReasonCode` is one of the Report 3
  buckets (`weather`, `rider`, `facility`, `volunteers`, `equipment`, `noRiders`, `other`);
  `cancellationNote` is the free text beside it and `cancelledByUserId` who did it. Rides
  cancelled before the codes existed were migrated as `other`.
- **Wall clock in, instants stored.** The scheduling drawer sends a date, a start and a length
  on the chapter's wall clock (`wallSlot`). `use-cases/schedule-ride.ts` reads the chapter's
  zone and turns it into instants with `slotWindow`; `slotOf` goes the other way for the detail
  page. `rescheduleRide` takes either two instants (a drag on the week) or a wall-clock slot, and
  reads a slot in the zone of the ride it has just locked. Editing the time on the detail page
  sends only the slot field that changed; the rest is filled in from the ride as read under its
  lock, so two quick edits never undo each other. A length is real minutes, so a two-hour ride
  across a DST change still lasts two hours.
- **Who may do it.** Every action on an existing ride in `features/rides/actions.ts` goes
  through `onRide`, which reads the lean `rides.getRideScope` (id, chapter, trishaw ids) and
  calls `requireChapterAdmin(ride.chapterId)`: the chapter comes from the database, never from
  the client. The use cases take that scope instead of reading the ride again; the facade still
  locks and re-reads the ride for its own checks. Assigning or removing a pilot or a rider
  answers `changed: false` when there was nothing to do, so the panel says "nothing changed"
  instead of claiming a change. Putting a pilot on a ride goes through `use-cases/staff-ride.ts`, which requires the
  `pilot` role in the ride's own chapter (being its admin is not enough). Booking a rider goes
  through `use-cases/book-rider.ts`, which requires the rider to belong to the ride's chapter.
- **What each model requires.** An event ride needs a `title` and a `capacity` (riders it
  takes) and may carry a `description` and photos; a functional ride needs a destination; a
  pleasure ride takes at most 2 riders, 1 trishaw and 1 pilot. `checkModel` in
  `features/rides/schemas.ts` enforces this on both create and edit, and the facade refuses a
  capacity below the riders already booked (`capacityBelowRoster`). The roster keeps an order
  (`reorderRosterAction`, history event `rosterReordered`).
- **Ride photos.** `RidePhoto` joins a ride to a `StoredFile` of kind `ridePhoto`, in order.
  The drawer uploads before the ride exists, so any admin may stage one
  (`requestRidePhotoUploadAction`, rate-limited); attaching it checks that the file is a ride
  photo its uploader made or one the ride already shows. Presign, commit and the `StoredFile`
  insert are the shared upload module in `lib/storage` (`requestUpload`, `commitUpload`, one
  `UPLOAD_LIMIT`), used by the fleet's upload Actions as well; each feature's Action keeps its
  own rule for who may upload which kind. `/api/files/[id]` reads the file's kind once
  (`fileKindOf`) and asks `rides.photoReadRule` for a ride photo, `fleet.fileReadRule` for any
  other kind: a photo on a ride is readable by that chapter's admins, a staged one only by its
  uploader.
- **Ride photo retention.** Ride photos are kept indefinitely; a file sits on at most one ride.
- **Route estimate.** `estimateRouteAction` returns a cycling route between two points for the
  drawer. It is admin-only and rate-limited per user, and logs no coordinates. The drawer sets a
  functional ride's end to start + route time + 10 minutes until the admin edits the duration.
  The detail page draws the same route in a Server Component under `"use cache"` for a day; a
  failed lookup is not cached.
- **Admin surfaces.** `/admin/rides` is a week calendar (drag to create, move and resize at 15
  minutes; one day at a time below `md`) or, with `?view=list`, an infinite list grouped by
  day. Dragging opens the schedule drawer with `?new=1&date=&start=&end=`; a move calls
  `rescheduleRideAction` with Undo. Create happens in the drawer, everything after that inline
  on the detail page, where a scheduled ride is cancelled and a cancelled one deleted from the
  header trashcan.
- **`seriesId`** is on every ride and unused. Recurrence will fill it; adding it now means no
  backfill then.

### Staffing and self-service (COD-262)

Lifecycle phase 3, and the event half of 4B-b. Three chapter settings drive it, each with its
consumer in the same change: `pilotsMaySelfAssign`, `requiredPilotsDefault` (what the drawer
starts a new ride with) and `staffingCheckLeadHours` (one of 12, 24, 48, 72 or 168).

- **Open rides.** A pilot sees the scheduled, future rides of the chapters they pilot for that
  let pilots sign up, still short of `requiredPilots` and without them on it
  (`rides.listOpenRidesForPilot`, behind `use-cases/open-rides.ts`, which reads the setting).
  Whether a ride is still short is only known once its pilots are counted, so the 60-day window
  is read in batches on a `(startsAt, id)` cursor until the page holds 30 open rides.
  The open shape (`openSelect`) carries time, place, model and counts — no rider names, no
  phone numbers, no note. `/pilot/rides/[rideId]` shows that shape to a pilot who is not on the
  ride, and the assigned shape to one who is.
- **Signing up and stepping back.** `use-cases/sign-up-for-ride.ts` checks the `pilot` role on
  the membership row of the ride's own chapter (a country admin or superadmin is not a pilot
  there) and the chapter's setting, then `rides.selfAssign` locks the ride row and recounts the
  pilots under the lock (`rideFullyStaffed`), so two pilots taking the last seat queue up. A
  round trip is one outing: `requireRide` locks both legs, signing up for one takes the other
  while it still needs a pilot, and stepping back leaves both while there is time — one
  message for both, through the events' `pair`.
  Every pilot count — signing up, an admin's assignment, the model rules, the admin's
  "Unstaffed" badge and week grid, the staffing check — counts only pilots still holding the
  role in the ride's chapter; the admin still sees a demoted one, marked, to take them off.
  `withdrawFromRide` passes the chapter's lead to `rides.withdraw`, which removes only the
  pilot's own row and refuses inside the staffing window (`tooLateToWithdraw`: call the
  chapter). The Actions live in `app/(member)/pilot/rides/actions.ts`, rate-limited, behind
  `requireAuth` and `hasChapterRole(…, "pilot")` on the ride's chapter read from the database.
- **Contact exchange on match** (stories 24a/24b). The assigned pilot's select carries each
  rider's own phone, or the managing account's name and phone; the rider's account's select
  carries the assigned pilots' phones. Neither carries an email, and the open shape neither.
- **Pickup pack.** From 24 hours before the ride (or from the close of the chapter's staffing
  window, when that is later, so a pilot who can still step back never holds the code) until it
  ends, the assigned pilot's page shows
  each trishaw's storage location and access code (`use-cases/finish-ride.ts` → `pickupView`,
  rendered by `features/fleet/components/storage-access-card.tsx`, which the finish page uses
  too).
- **Staffing check** (3D). `use-cases/ride-sweep.ts` runs every five minutes in the worker
  (`MONITORS["ride-sweep"]`). `staffing-check.ts` groups the chapters by their lead and reads,
  per group, only the unchecked rides already inside that window, and `rides.checkStaffing` stamps
  `Ride.staffingCheckedAt` and emits `ride.understaffed` in one transaction under the ride's
  lock — a retried sweep finds the stamp and stays quiet. The way there checks its way back
  along, so a round trip short both ways is one warning. The sweep runs on the worker that
  dispatches every outbox event, so one run checks at most 50 rides and the next carries on, and
  a ride whose check fails is logged and passed over. Moving a ride clears the stamp. A
  pilot stepping back clears the stamp of the legs they left, and a pilot demoted or removed
  in the chapter clears it on every upcoming ride they were on (`use-cases/leave-ride-crews.ts`,
  the `member.roleChanged` listener), so a seat that empties after the check is checked again. A
  ride scheduled already inside its window is stamped as it is scheduled (the admin sees what it
  is short of), and `20261013110000_ride_staffing_checked_backfill` stamps the rides already
  inside their window when this ships, so the first sweep does not flag them all at once.
- **Ride chat.** A `Conversation` with `origin: ride` and a unique `rideId`, owned by nobody.
  The `syncRideChat` worker listener (`ride.scheduled` — both legs of a round trip —,
  `ride.announced`, `ride.pilotAssigned`, `ride.pilotUnassigned`, `ride.riderBooked`,
  `ride.riderRemoved`, and `rider.handedOver` for each ride still ahead of the rider) runs
  `use-cases/ride-chat.ts`. An event's chat opens as soon as the event is scheduled, titled with
  the event, holding its pilots and the chapter's admins, and every account behind a seat still
  taken joins it: families who sign up for the same event deliberately see each other's names
  there (product decision 2026-10-22). An account whose riders all gave their seats up leaves;
  booking again rejoins. A personal ride's chat opens once a pilot is on it and keeps its
  members equal to the ride's pilots, the chapter's admins and — only when they are one
  household, a single rider or one account booking every rider on the ride — its riders'
  accounts; a personal ride with riders of different households keeps only the pilots and
  admins (`chat.syncRideConversation`, idempotent). A ride chat holds at most
  `GROUP_MAX_MEMBERS` (1000): pilots and admins first, then the riders' accounts. In an event's
  chat the chapter's admins are its owners, kept in step on every sync, so past
  `GROUP_ANNOUNCEMENT_THRESHOLD` (100) the sync turns announcements on and the admins still
  write. Everyone joining or leaving an event's chat gets a system line (`joined`, `departed`)
  whose body is their name sealed with the chat's key, so the line still reads right after they
  left; the whole history stays visible to late joiners. A cancelled event's chat is frozen
  (`ride.cancelled` → `freezeCancelledEventChat`) and only its owners, the admins, may pick it up
  again (`continueChat` passes `ownersOnly`; the thread hides "Keep chatting" from everyone
  else); a cancelled personal ride's is left as is, and a completed ride's anyone in it may
  reopen. Under announcements an event chat's hint names the chapter's admins as its writers. A demotion or removal in the chapter (`member.roleChanged`) syncs every ride chat
  the person is in, so a former pilot or admin leaves them at once. Two syncs may read the roster in one order and write it in the other, so a sync
  that changed the members reads the roster again and writes until a read finds nothing to
  change; the roster is read outside the conversation's lock, so a waiting sync never needs a
  second pool connection. A racing creator that loses the unique `rideId` joins that loop.
  Completing the ride freezes it (below).
- **Announced events** (4B-b). `Ride.announced` is set in the drawer or the detail page's
  "Riders can book" panel, for event rides only (`eventsOnly`). Announced events show on the
  passenger start screen and `/passenger/rides` for the chapters of the riders the account
  manages, until every one of them in the event's chapter is booked on it (it is then among the
  account's own rides), through `announcedSelect`: photos, story, place and seats left, never another
  rider. "Book a seat" (`app/(member)/passenger/rides/actions.ts`, rate-limited) goes through
  `use-cases/book-event-seat.ts` — riders the account manages, in the event's chapter — and
  `rides.bookSeats` locks the ride, recounts the roster against `capacity` and refuses a booking
  that would overfill it as a whole (`rideFull`). The photos of an announced event are readable
  by every member of its chapter (`rides.photoReadRule`).

The admin surfaces are the week grid at `/admin/rides` (`?new=1` opens the scheduling drawer,
and ⌘K "Schedule a ride" lands there) and the detail page `/admin/rides/[rideId]`, whose
trishaws panel allocates trishaws in place.

### Ride day and after (COD-263)

Lifecycle phases 4C to 7: reminders, giving a seat up, check-in, walk-ups, roster closure,
debrief and the frozen ride chat. One migration, `20261016120000_ride_execution`; seat
confirmation was taken out again by `20261022100000_remove_seat_confirmation`.

- **Attendance.** `RideRosterEntry.attendance` is `booked → checkedIn → completed`,
  or `noShow`, or `cancelled`; `RideAssignment.attendance` is `signedUp → completed`, or
  `noShow`. A seat the rider's side gives up keeps its row as `cancelled`, so Report 2 still
  sees who signed up; `ACTIVE_SEAT` in `rides/services` keeps it out of everything that counts
  places or people — `_count.roster`, the room check, the agendas and calendar feed, the
  ride's participants (so its chat and its notifications), the announced events' bookings —
  and out of everything the rider's side reads: to the passenger the seat is simply gone.
  Booking that rider again (`bookSeats` on an event, `bookRider` from an admin or a request)
  takes the same row back through `takeSeat`, so the `(rideId, passengerId)` unique never
  refuses it. An admin taking a rider off still deletes
  the row: that rider never signed up.
- **Reminders and the demand check** (4C, 5B). `use-cases/ride-reminders.ts` runs three passes
  from `ride-sweep`, built like the staffing check: chapters grouped by their own lead, only the
  rides already inside it read, at most 50 a run. `rides.sendReminder` stamps
  `riderReminderSentAt` / `volunteerReminderSentAt` and emits `ride.riderReminderDue` /
  `ride.volunteerReminderDue`, and `rides.checkDemand` stamps `demandCheckedAt` and emits
  `ride.noDemand` for an empty roster — each in one transaction under the ride's lock, so a
  retried sweep or a retried dispatch sends nothing twice. The way back of a round trip goes
  with its way there (one message, through `pair`), unless the way there has nobody to remind
  itself. A ride with nobody to remind is stamped without an event, and the lead is read again
  under the lock, so a ride moved away after the sweep listed it waits. Moving a ride's start
  clears all three stamps with `staffingCheckedAt` and, while the ride is still ahead of its
  door, turns every checked-in seat back to `booked` (walk-ups excepted); a new end
  only clears the staffing stamp. A ride scheduled already inside
  its demand window is stamped as checked, like the staffing check. The four checks of a sweep
  are independent: one that fails is logged, the others run, and the run then fails for the
  monitor. Rides already inside a window when this ships get their reminder on the first sweep:
  a late "your ride is coming up" still helps, so there is no backfill this time.
- **Giving a seat up** (5B-b). There is no confirmation step: a booked seat stands until the
  rider's side cancels it. The rider reminder says the ride is coming up and links to
  `/passenger/rides/{id}`, where the account cancels the whole ride for its riders or, with
  several riders, one rider's seat (`app/(member)/passenger/rides/actions.ts` →
  `use-cases/cancel-own-seat.ts` or `use-cases/reschedule-ride.ts`, which accept only riders of
  `passengers.listRidersOfAccount`). Cancelling closes when the ride starts and reaches the other
  leg of a round trip still ahead. The last seat given up emits `ride.riderRemoved` with
  `rosterNowEmpty`, which tells the chapter's admins; the two legs of a round trip are one
  message only when both are left empty or both are not. An event emptied that way and booked
  again through `bookSeats` emits `ride.rosterRefilled`, so the admins hear it has a rider
  again. Once none of the account's riders holds a seat, the ride is no longer the account's:
  an event shows its invite again with "Book a spot", a personal ride sends the account back to
  `/passenger/rides`. The admin's roster and history keep the given-up rows. For a personal
  ride chat's one-household rule a given-up seat still counts (`listRideParticipants().household`), so one
  family leaving never lets another into what was said in the chat about it.
- **Check-in and walk-ups** (6B). The door opens two hours before the start
  (`CHECK_IN_LEAD_MINUTES`). A pilot keeps it until the finish page closes a day after the ride
  ends; an admin may still record a ride later, for as long as its roster is not closed
  (`rides.checkInOpen`). `CheckInList` (`features/rides/components`) is one big optimistic target
  per rider with Undo, on the pilot's ride page, the finish page and, compact, on the admin
  detail. "Add someone at the door" (`WalkUpDrawer`, `?walkup=1`) enrols a walk-up: a roster row
  with `passengerId: null`, the typed `guestName`, checked in at once. A walk-up takes a place and
  counts as a ride, but is no rider record — `passengerDetailSelect` and the feed read the roster
  filtered to the account's own riders, so a guest's name never reaches a rider's account, and
  the rider tallies skip rows without a passenger. The admin's roster lists them under "At the
  door", so its count of places taken matches its rows.
- **Roster closure** (6D). "Complete ride" (`CompleteRideButton`, a confirm dialog that shows the
  tally: "3 riders checked in, 1 trishaw, 2 hr") calls `rides.closeRoster`, which sets `status: completed`, `completedAt`/`completedByUserId`, turns
  `checkedIn` into `completed`, `booked` into `noShow` and every pilot's `signedUp`
  into `completed`, and emits `ride.completed` — whose `freezeRideChat` worker listener freezes
  the ride's chat, retried with the event until it holds. A second tap changes nothing and emits
  nothing, so it leaves alone a chat its people kept going. An
  admin can mark a pilot who never came
  (`setPilotNoShow`, Report 1) and **Reopen** a completed ride from the detail page's danger
  zone (`rides.reopenRide`, logged): every rider goes back to where they stood on the day, the
  ride stops counting until it is completed again, and the chat stays frozen until someone
  keeps chatting.
- **Debrief** (story 31, 7E). One `RideDebrief` per pilot and ride (`@@unique([rideId,
  userId])`), upserted from the finish page as often as the pilot likes while it is open (a day
  after the ride; an admin's any time): distance on a
  functional ride only (Report 11) and a note. Donations come with COD-152, and a broken
  trishaw is reported as damage on the same page. The admin detail lists them as the day
  report (story 32a).
- **Frozen chat.** `conversation-thread.tsx` shows "Keep chatting" on the frozen banner
  (`continueConversationAction`, CHAT-PLAN 2.3), and the chat list badges a ride chat.
- **Who may.** Check-in, walk-ups, completion and the debrief go through `executorOfRide` in
  `features/rides/actions.ts`: `requireAuth`, then the assigned pilot still piloting in the
  ride's chapter and not marked as a no-show (`rides.pilotCanRun`) **or**
  `requireChapterAdmin(ride.chapterId)`. An admin who also pilots the ride acts as the admin,
  so the pilot's one-day window never narrows what they may record. The facade takes the
  executor (`"pilot" | "admin"`) as a plain argument and never sees a session. Reopening and
  marking a pilot as a no-show are `requireChapterAdmin` only. Check-in toggles, walk-ups and
  debriefs are rate-limited per person.

### Storage locations: a bike lives at a place, not at a chapter

A trishaw is often kept somewhere shared — a care home or depot that serves more than one
chapter — so **owning** a bike and **reaching** it are two different questions, and the schema
answers them separately.

`Trishaw.chapterId` stays what it always was: the owning chapter, who bought the bike and who
reports on it. `Trishaw.storageLocationId` is new and nullable — null means the bike sits at
its owning chapter's own address, and a row means it lives at a `StorageLocation`.
`StorageLocationChapter` links a site to **one or more** chapters, because a single care home
serving two neighbouring chapters is the case that a column could not express.

Reachability follows from that, in `rides.reachableFrom`: a chapter may schedule a trishaw it
owns, **or** one parked at a site it shares. `findTrishawsOfChapters` is the same rule as a
query — an `OR` over owner and shared site, not a filter on `chapterId` — so `/admin/bikes`
lists a shared bike for every chapter entitled to it. Sharing the shed does not override the
other two checks: a bike in for service is still `trishawUnavailable`, and the window is still
reserved inside the write's transaction.

Storage locations are managed at `/admin/locations`: chapter sites and the country-wide pools
other chapters join by code.

### Where a ride starts

There is no table of starting places. A ride keeps its own name, address and pin in
`locationName`/`locationAddress`/`latitude`/`longitude`, and a ride request its own
`pickupName`/`pickupAddress`/`pickupLatitude`/`pickupLongitude`; nothing links them to a
shared row, so editing one never rewrites another. (The `RideLocation` model of COD-260 was
removed by the migration `remove_ride_locations`, which first set `Passenger.residence` to
`careHome` for every rider linked to a Care Center location.)

- **The admin drawer** starts the ride at the chapter's place (`chapterPlace`: the chapter's
  name, address and pin) at the chapter's default ride length; the admin can clear it and
  search any address. A drawer opened from a request starts at the request's pickup.
- **The rider's form** offers "Home" (the rider's own address, when their residence is home),
  the chapter's care home (`careHomeName` with the chapter's address and pin, only when the
  chapter names one) and a free address search. It preselects the care home for a rider whose
  `residence` is `careHome`, otherwise home. Whatever is picked is sent as the pickup snapshot.
- **Riders.** `Passenger` carries `needsWheelchairBike` and `note`, set by an admin when adding
  a rider and by the account itself in the account surface (`passengers.getOwnRiderNeeds` /
  `setOwnRiderNeeds`, called straight from the Action). Where a rider lives is
  `residence` (`careHome` or `home`), on the User for a rider with an own account and on the
  Passenger otherwise.

### Time zones: the chapter's clock, never the server's or the reader's

A ride is stored as an instant. Which day column it falls in, and what time it reads, are
questions about the **chapter's** wall clock — so `Organization.timeZone` is `NOT NULL` and
every calendar function takes an IANA zone explicitly.

`src/lib/calendar.ts` is that arithmetic, and it is deliberately dependency-free: `Intl`
already ships the tz database, so `wallClock` (instant → local Y/M/D/h/m) and `instantAt`
(local wall clock → instant, two-pass so DST lands right) are the whole of it. Everything
else — `startOfDay`, `addDays`, `startOfWeek`, `weekDays`, `lanes` — is built on those two.
`src/lib/calendar.test.ts` covers the 23- and 25-hour days, the hour Berlin skips, a
45-minute offset (Kathmandu) and a date-line crossing, because those are the cases a naive
`setDate` gets wrong.

A new chapter's zone comes from its **pin**, via `resolveChapterTimeZone` in
`src/lib/time-zone.ts` (`@photostructure/tz-lookup`, zero dependencies, CC0). A country is
the wrong unit for this question — the US, Canada and Australia span several zones, and
Spain and Portugal each keep a second one offshore (`Atlantic/Canary`, `Atlantic/Azores`) —
and a chapter always has coordinates, because the address search fills them in. The country
map survives only as a fallback for a caller with no pin, and `UTC` below that, so chapter
creation can never fail on this.

Moving the pin re-derives the zone (`chapters.withDerivedTimeZone`, applied by
`use-cases/manage-chapter` before it diffs). This is **not** about a chapter relocating —
a chapter cannot change country or slug, so one that moves is a new chapter, not an edited
one. It is about a chapter first pinned on the wrong side of a border: the pin decides the
zone, so the two are not allowed to disagree. The change gets its own line in the chapter's
history, so it is never silent.

**There is no field for editing the zone directly yet.** `chapterUpdateInput` accepts one
and it wins over the pin when supplied, but no screen supplies it — so today, correcting a
chapter's zone means correcting its pin. A zone picker on the chapter page is the missing
piece.

The lookup is a compressed raster, so a pin within a kilometre or two of a zone border can
land on the wrong side. That is why the zone is a stored, correctable column rather than
something derived on every read.

When an admin's scope spans chapters in different zones, `app/admin/calendar-scope.ts` picks
the first and **names it on screen**, rather than drawing times that are quietly wrong for
everyone else.

### Three views, no calendar library

Only one of the three surfaces is a month-style grid, and none of them needed a dependency:

| Surface | Shape | Why |
| --- | --- | --- |
| `/pilot`, `/passenger` | `RideAgenda` — a grouped list | On a phone "my next three rides" is the whole question; a grid answers it worse. |
| `/admin/rides` | `RideWeek` — the Chapter Operating Calendar | Seven day columns over an hour band trimmed to what the week actually uses. `lanes()` packs overlapping rides into columns. |
| `/admin/bikes` | `TrishawTimeline` — trishaw rows × day columns | Answers "can I promise this bike on Thursday" without reading every ride. A ride booking several trishaws appears in each of their rows. |

All three are **Server Components**. The week lives in the URL (`?week=YYYY-MM-DD`, see
`app/admin/week-param.ts`), so navigation prefetches, survives a refresh, shares as a link,
and ships no calendar to the browser.

### Who may read what

| Surface | Guard | Rows it can reach |
| --- | --- | --- |
| `/admin/rides`, `/admin/bikes` | `readActiveScope(params, nav)` → `requireAdminScope` + the `NAV` row's own `visible` predicate; an out-of-scope `?chapter=`/`?country=` is a 403, never a silent widening | only `scopeChapters(scope, active)` |
| `/pilot` | `requirePerspective("pilot")` | rides they are **assigned to** *and* in whose chapter they **still hold the pilot role** |
| `/passenger` | `getSession` | rides rostering a `Passenger` row they manage |
| `/api/calendar/<token>.ics` | the token itself — see *Calendar feed* below | the union of the two rows above, for the token's owner, with no names |

That second clause on `/pilot` is load-bearing: removing someone from a chapter deletes their
`member` row and nothing else, and demoting a pilot only rewrites the row's role list, so
`RideAssignment` rows outlive both. Every pilot read (`pilotRideWhere`) therefore requires a
member row in the ride's chapter whose role still contains `pilot`, as well as the assignment,
and `listRideParticipants` applies the same rule, so a former pilot is not notified either.

The **contact-detail exchange on match** runs both ways, as `references/04-ride-models.md` §7
describes it: a rider sees the **pilot's name** once one is assigned, and the assigned pilot
sees the **rider names** on that ride. A pilot choosing whether a ride suits them is choosing
who they will spend an hour with, so a bare roster count was the wrong answer.

The exchange is between a rider and *their* pilot, and the selects enforce exactly that.
`pilotSelect` in `rides/services` is `calendarSelect` plus the roster, used only where the
reader is an assigned pilot — deliberately not folded into the shared shape, because two
riders on one trishaw are managed by two different people. Riders' accounts read
`passengerSelect`, which has a roster count and no names; on a ride's detail page
(`passengerDetailSelect`) the roster is filtered to the riders that account manages. Members
never read an email address: both member selects narrow `assignments.user` to id, name and
image, and the email stays in `calendarSelect` for the admin surfaces. The note for pilots is
in `pilotDetailSelect` only, and the admins' cancellation note in neither — a rider is told
the reason in words from its code. `facade.test.ts` pins every surface, so widening one by
accident fails a test. The crew a member sees is filtered the same way the reads are:
`withActiveCrew` drops assignments of people who no longer hold the pilot role in the ride's
chapter, so a demoted co-pilot stops "riding along" on everyone else's page too.

The member pages are `/pilot/rides` and `/passenger/rides` (upcoming and the latest past,
`listPilotRides` / `listPassengerRides`) and their details `/pilot/rides/[rideId]`
(`getRideForPilot`: assigned *and* still a pilot there) and `/passenger/rides/[rideId]`
(`getRideForPassengers` over `passengers.listRidersOfAccount`: the riders the account
manages, plus its own rider row when someone else manages it). Both details call
`notFound()` for anything else, so a guessed id reads the same as a missing one. The other
leg of a round trip appears only to someone who is on it too.

Phone numbers are the part of §7 still missing: `Passenger` carries a name, birth date and
gender, but no number, so "the client's and/or the institution's phone" has nothing to read
from yet.

### The calendar this is *not*

`/admin/bikes` answers COD-181's "which Bike is rented when" — a per-equipment reservation
view. It is **not** the Chapter Operating Calendar as the glossary defines it
(`references/02-glossary.md`), which is a **capacity** model: the chapter configures the
maximum resources and volunteers per role available in each schedulable period, and a period
that consumes them all "shows unavailable", with admins seeing trishaw/trailer *counts*. That
view is what lifecycle phase 1D validates a new request against, and it needs a
chapter-configuration model that does not exist yet. The two are different features, and
both are wanted.

### Ride Requests: booking a ride (COD-261)

Lifecycle 1B–1E and 2B. A rider, or the account booking for them, sends a **Ride Request**;
the chapter schedules or declines it. `src/features/ride-requests` owns `RideRequest` (status
`pending` · `scheduled` · `declined` · `withdrawn`, the model, the place as a snapshot, the
destination, `roundTrip`, the requested window as two instants, a note, the decision) and
`RideRequestPassenger`. `requesterUserId` and the contact columns are nullable so guest intake
needs no migration later; nothing writes the contact columns yet.

- **The form.** `/passenger/rides/new?step=who|where|when|note|review` keeps the step in the
  URL through `history.pushState`, so Android back walks the steps without a server round trip.
  Who is skipped when the account books for one rider; at most the seats of the chapter's
  largest trishaw type, and never more than a ride of the model takes (2). Where is a ride out
  from the rider's home, the chapter's care home or any address, or "get somewhere" with a pickup, a destination (the
  member address search, rate-limited, plus the account's earlier destinations) and "and back
  again". When is a month of bookable days and window chips from `lib/booking-windows`. The
  big red button sits above the tab bar (`bottom-above-tabbar`) and above the keyboard on
  native. Someone who is not a member of the chapter in `?chapter=` sees the join card first.
  Only riders whose manager is still a member of their chapter can be booked; the others are
  named with the reason.
- **`lib/booking-windows`** is pure: the bookable days are today to today + horizon, minus
  closures and days without riding hours (a chapter without hours rides 09–12 and 13–17), and
  no slot starts before now + lead time. A stretch up to 3 hours is split into rides of
  `defaultRideMinutes`; a longer one is one "Morning 09:00–17:00" chip, trimmed to the next
  quarter hour after the lead time. `bookingRefusal` is the same rule for the server.
- **Submitting** (`use-cases/submit-ride-request`): the riders come from
  `passengers.listPassengersManagedBy` and the chapter from them, never from the client; the
  window is the chapter's wall clock turned into instants and must pass `bookingRefusal`
  (`leadTime`, `beyondHorizon`, `closedDate`, `outsideHours` as `DomainError` codes). The
  account must still be a member of the riders' chapter (`notChapterMember`), the riders must
  fit the chapter's largest trishaw in service and never more than two (`tooManyRiders`), no
  rider may already be asked for in an overlapping window (`alreadyRequested`) or hold a seat
  then (`riderBooked`; a seat given up is free again), and an account has at most five requests waiting (`tooManyRequests`). A Ride
  Location's snapshot overrides whatever place was sent. Rate-limited to 10 an hour per account.
- **Scheduling** (`use-cases/schedule-from-request`): the request is first **claimed**
  (`pending` → `scheduled` in one conditional update), so two admins pressing Schedule at once
  make one ride; then `scheduleRideAt` writes the ride, both legs of a round trip, with the
  request's riders on both; then `markScheduled` links the way there and emits
  `rideRequest.scheduled`. A ride that cannot be written releases the claim. The admin path is
  the PR 1 drawer opened with `?new=1&request=<id>` and prefilled; its Action re-reads the
  request and forces the request's chapter; the request's riders are always on the ride, and
  riders the admin added in the drawer ride along.
- **Automatic scheduling.** With `schedulingMethod = auto`, a submitted request becomes a ride
  straight away when a trishaw that seats its riders (and takes a wheelchair when one needs it)
  is free: `rides.scheduleRide` takes `pickTrishaws` and picks the free ones **under their
  locks inside the ride's own write**, never checked first and booked after. The ride starts at
  the start of the requested window, lasts `defaultRideMinutes`, has no pilot (pilots sign up
  through PR 5's open rides) and is scheduled by nobody (`actorUserId: null`). No admin saw
  what it lacks, so it is never stamped as staffing-checked: one that starts inside the staffing
  window short of pilots is warned about on the next sweep. Without a free trishaw the request
  stays pending and only then is announced to the admins.
- **Declining and withdrawing** are single-feature: the Actions call `rideRequests.decline`
  (after `requireChapterAdmin` on the request's own chapter) and `rideRequests.withdraw`
  (which checks that the caller sent it and that it is still pending).
- **Surfaces.** `/admin/rides` gains `AdminTabs` (Rides · Ride requests with the open count)
  and a "{n} requests waiting" pill on the week; `/admin/rides/requests` is the list (Waiting
  soonest first and without lapsed requests, every other status latest first; the filter is in
  the URL) and `/admin/rides/requests/[id]` the detail with the
  requester's phone, the history, a Decision panel (Schedule… · Decline… in a drawer at
  `?decline=1`) and what is in the way (outside hours, short notice, other rides in the
  window). The requester has `/passenger/rides/requests/[id]` ("Waiting for {chapter}" until a
  ride exists, never anything that reads like an instant booking) and the open requests on
  `/passenger` and `/passenger/rides`. `/join/[slug]`'s Book a ride carries the chapter in
  the link (through sign-in when needed) and is hidden from a signed-in non-member, who joins
  as a passenger on the form's join card; `/join/[slug]/ride` redirects there.
- **The calendar file.** The scheduled mail carries `ride.ics`: one VEVENT per leg, the ride's
  model and chapter as the summary, no one's name, and the same `ride-<id>@host` UID the
  subscribed feed uses, so a calendar holding both shows one entry. `MailOptions.attachments`
  reaches Resend and Mailpit; a kind names `attachments` and `deliver-email` renders them with
  `lib/ics`.
- **Changing a booked ride.** "Change time" opens the request form with `?from=<rideId>`,
  prefilled on the server through the account's own riders and opened at the "when" step.
  `rescheduleRideAction` → `use-cases/reschedule-ride.ts` submits the new request first
  (`submitRideRequest(…, { replacesRideIds })`, so the old legs don't count as an overlap) and
  only then gives up the account's held seats on both legs. A seat that cannot be given up is
  reported as `oldSeatsKept` and the passenger is asked to cancel it on its page; nothing is
  rolled back. "Cancel ride" is `cancelRideSeats` under the same ownership read.
- **Changing a pending request.** "Change request" opens the request form with
  `?fromRequest=<requestId>`, prefilled from `rideRequests.getChangeable` (requester, or the
  account booking for every rider; pending and not lapsed) and opened at "review" when the
  asked window is still offered. `changeRideRequestAction` → `use-cases/change-ride-request.ts`
  submits the new request first (`submitRideRequest(…, { replacesRequestIds })`, so the old
  request counts neither as an overlap nor towards the five waiting) and only then withdraws
  the old one. A failed withdrawal is reported as `oldRequestKept`; both stay open.

### Not here yet

Recurrence, waivers, guest booking without an account, trishaw-type choice, pilot matching and
the negotiation loop (stories 11–23) are still absent — see COD-155 / COD-179 / COD-151.

### Calendar feed (COD-182)

A member can subscribe to their rides from the calendar they already use. The account surface
(`src/components/account/calendar-section.tsx`, shown to anyone with a pilot or passenger
perspective) creates a secret address, copies it, and offers one-tap subscribe links for Apple
(`webcal:`, hidden inside the Android shell), Google (`calendar.google.com/calendar/r?cid=`),
Outlook.com (`outlook.live.com/…/addfromweb?url=`) and Outlook for work or school
(`outlook.office.com/…/addfromweb?url=`). Google subscribes by link only from a computer, so on
a phone (the native shell, or a coarse pointer) its button gives way to a line saying so.
Calendar apps then poll `GET /api/calendar/<token>.ics` on their own schedule.

**The address is the credential.** A calendar server cannot send a cookie or a header, so
the token has to live in the URL, and `proxy.ts` never sees `/api/`. The route is therefore its
own gate, like `/api/chat/stream`. What makes the address safe to keep showing:

- **A token is `<key>.<signature>`** (`src/lib/crypto/feed-signature.ts`). The 128-bit key is
  random and stored in `calendar_feed.key`. The signature is an HMAC-SHA256 of it under an HKDF
  subkey of `BETTER_AUTH_SECRET` and is stored nowhere. A copy of the table opens no feed, yet
  the account surface can show the address again at any time without keeping it in the clear.
  Rotating `BETTER_AUTH_SECRET` (which signs everyone out anyway) retires every address.
- **The signature is checked before anything else** — in the route through
  `calendarFeeds.feedKeyOf`, before the per-address rate limit, and again in
  `calendarFeeds.openFeed` before any row is read — so a forged or
  mistyped address costs one HMAC: no query, and no bucket in the in-memory limiter that
  anyone could otherwise mint one of per request. Every failure (unknown, reset, turned off,
  banned owner) is the same plain 404.
- **New link** replaces the key and **Turn off** deletes the row; either way every app holding
  the old address gets a 404 on its next poll. Deleting the account cascades the row.
- The route is untraced in Sentry, and `scrubText` (`lib/observability/errors`) replaces the
  token anywhere it appears — request URL, `contexts.nextjs.request_path` from
  `captureRequestError`, messages, breadcrumbs, logs. Responses are `private, no-cache`,
  `no-referrer`, `noindex`. Session Replay masks everything but translated copy and records link `href`s as
  they are, and the subscribe buttons carry the address in theirs — so the whole feed block
  in `calendar-section.tsx` is `data-sentry-block`. The one place the path still lands is the reverse proxy's access
  log (`Caddyfile` → `import access_log`), which is worth a `log_skip /api/calendar/*` on the
  server.

**What a feed may contain** is the union of `/pilot` and `/passenger`, under the same rules.
Piloted rides follow `/pilot` exactly: the reader must hold the pilot role in some chapter
(`requirePerspective("pilot")`), and the ride must be in a chapter where they still hold the pilot role
(`findRidesForPilot`). The use case reads both from `membership.listMembershipsOfUser` and hands
the rides query a list of chapter ids, so a demoted or departed pilot drops out on the next poll
even though their `RideAssignment` rows remain. Ridden rides are those rostering a `Passenger`
the reader manages. It is one query (`rides.findRidesForCalendarFeed`, an `OR` over the two, and
no query at all when both are empty — an empty `OR` would match every ride), over a window of 90
days back and 400 forward: a client drops whatever the feed stops listing, so last month stays on
the wall.

The feed is capped at `rides.FEED_MAX_RIDES` (1000), because it is re-read on every poll and a
care home managing fifty residents can outgrow any window. A plain `take` on a query ordered
oldest-first would spend the cap on last spring and drop next week, so the facade reads in two
slices: rides still running or ahead of now, soonest first, up to the cap; then whatever room is
left from the past, newest first. Past the cap, the rides furthest from now are the ones dropped.

The account surface shows the section to anyone who could have rides (a pilot or passenger
perspective, or a `Passenger` they manage) **and** to anyone who already has a feed, so an
address can always be turned off by its owner.

**It names nobody.** A feed leaves the app for whichever provider hosts the reader's calendar,
so `feedSelect` carries when, where, which trishaw and the chapter — and no rider names, no
pilot names, no roster count, no cancellation reason (free text an admin typed). The event
links back into the app for the who. `facade.test.ts` pins that select alongside the other
three. A pilot's event reads *Pilot · Event ride*; a rider's reads *Event ride*; a cancelled one
stays on the calendar as *Cancelled: …* with `STATUS:CANCELLED`, because the glossary keeps
cancelled rides on the calendar.

**The copy is sessionless.** A poll carries no cookie, so the feed speaks the owner's stored
`User.locale` through `src/emails/strings` (`calendarFeed`), the same dictionary push and email
use for the same reason. German avoids both *Sie* and *du*, since one feed serves pilots and
passengers alike.

**Serialisation** is `src/lib/ics.ts`, dependency-free like `lib/calendar`: times in UTC
(`Z`), so no `VTIMEZONE` block has to be generated from the tz database; TEXT escaped so a line
break in a location name — CR/LF, and Unicode's NEL/LS/PS, which some parsers also split on —
cannot start a new property, with C0 and C1 controls dropped; lines folded at 75 *octets*, never
inside a UTF-8 sequence. The body is deterministic for the same rides (`DTSTAMP` is the ride's
`updatedAt`), so the route's ETag answers an unchanged poll with a 304.

`lastFetchedAt` is written at most every 15 minutes, which is what lets the account surface
say "last picked up by a calendar 2 h ago" — the only feedback a member gets that the
subscription actually works. Polls are rate-limited per address (60 per 10 minutes) and
counted in `cwa_calendar_feed_polls_total{outcome}`.

## Reports (COD-256)

`/admin/reports` is an activity dashboard over the admin's active scope. One cached use case,
`src/use-cases/activity-report.ts`, reads it: `activityReport({ chapterIds, includePeople,
range | from/to })` for the page and `activityKpis(chapterIds)` (the last 30 days) for the
Overview strip.

### Units

- **Ride**: one roster entry on a trip that is not cancelled and has already ended
  (`status != cancelled AND endsAt < now`), whose attendance is neither `cancelled` (the seat
  was given up) nor `noShow` (the closed roster says they never came). Two riders on one trip
  are two rides, the RFP's counting rule, and a walk-up is one too. "Ridden" is still derived
  from the clock, so a ride nobody completed counts its booked riders; closing the roster
  (`status = completed`, COD-263) only sharpens who rode. A pilot marked `noShow` is no pilot of
  the trip.
- **Trip**: one such `Ride` row. **Riders**: unique passengers on them (a walk-up has no
  passenger and is not one). **Hours**: the sum of
  the scheduled `endsAt - startsAt` of those trips.
- **Cancellations**: cancelled rides in the period, grouped by `Ride.cancellationReasonCode`
  (`weather`, `rider`, `facility`, `volunteers`, `equipment`, `noRiders`, `other`; null is "uncategorised"). The rate is
  cancellations / (cancellations + trips).
- **New riders**: riders whose first non-cancelled ride ever falls in the period.
- **Active / inactive** pilots (chapter `Member` with the pilot role) and riders (`Passenger`
  rows of the chapter) are measured over the 12 months before now, independent of the
  timeframe. Someone who has never ridden is inactive.

Every ride is placed on its **chapter's own calendar day**, so a 23:30 ride in Munich and an
18:30 ride in New York both land on the day their chapter saw. A period is a half-open pair of
local dates. The grain is a day up to 31 days, a week (Monday) up to 184, a month beyond. Every
number carries the previous period of equal length (`ytd` and `12m` compare with the same span a
year earlier); the chart's previous values are shifted onto the current buckets.

### SQL aggregation

CWA runs ~5,000 rides a day, so a global 12-month report must never load rides into Node.
`src/features/rides/services/report-facts.ts` aggregates in MySQL and returns grouped rows only:

- **Local day without MySQL time-zone tables.** `CONVERT_TZ` with named zones depends on the
  server's tz tables, so the zone math stays in Node: `reportScope`
  (`src/features/rides/report-zones.ts`) computes, per distinct chapter zone, the UTC-offset
  spans covering both padded periods (`zoneShifts`, built from `lib/calendar`'s
  `offsetMinutes`; one span per DST switch, half-hour zones included) and each chapter's first
  instant of both periods (`firstInstantOf`). The SQL maps chapter → zone through a `JSON_TABLE`
  parameter, turns the offset spans into a `CASE` on `startsAt`, and derives
  `DATE(startsAt + offset)` per ride. The fact query is still widened by 14 hours (`periodBounds`)
  so the `(chapterId, startsAt)` index bounds the scan; the local day decides the period.
- **One shared CTE, several grouped reads.** `report_ride` classifies every ride in the windows
  (`kind`: ridden / cancelled, `side`: current / previous, local day). On top of it:
  `findActivityBuckets` (side × bucket × model × kind × category — the bucket, shifted for the
  previous period, is computed in SQL), `findChapterTallies` (per chapter and side),
  `findRiderCounts` (`COUNT(DISTINCT passengerId)` per side, plus new riders through a
  `NOT EXISTS` on an earlier non-cancelled ride), and — only at chapter scope with
  `includePeople` — `findPilotTallies` / `findRiderTallies` grouped by person.
  Hours are summed as milliseconds and rounded once in Node.
- **Health** reads `SELECT DISTINCT` pilot × chapter pairs and `COUNT(DISTINCT)` riders of the
  last 12 months (`rides.activeParticipants`), and `passengers.countPassengersOfChapters`.
- **Pure folding** lives in `src/features/rides/report.ts`: `aggregateActivity` turns the grouped
  rows into totals, series, cancellations and models; `tallies`, `ranked`, `countryRollup`,
  `newRiders`, `peopleHealth` and `yearBefore` are the rest of the domain math, all unit-tested.

The use case starts the scope (chapter meta + earliest ride), the health reads and — once the
scope resolves — the facts and the people tallies (whose name lookups chain directly on them) in
one `Promise.all`. `activityKpis` runs only the core: buckets and distinct riders, no chapter
tallies, new riders, geography or people.

### Privacy

At global and country scope the report ranks **chapters and countries only**. Pilot and rider
names are loaded only when the page passes `includePeople`, which it does only at chapter scope
(process 138). The use case never calls `accounts.displayNames` or `passengers.passengerNames`
otherwise, so no name reaches the RSC payload outside chapter scope.

### Caching

Both functions are `"use cache"` with `cacheLife("minutes")` and tags from `src/lib/cache-tags.ts`:
`reportCacheTags(chapterIds)` gives `reports` plus one `reports:chapter:<id>` per chapter in the
scope. `cacheTag` accepts at most 128 tags per call, so a scope of more than 127 chapters is
tagged `reports` + `reports:wide` instead. Their arguments are plain values (the chapter id list
is part of the key, so scopes never share an entry); the page resolves the scope through
`readActiveScope(searchParams, "reports")` before calling.

Server Actions that change what a report counts call `invalidateReports(...)` next to their
`revalidatePath`: with the chapter when they know it (chapter create/update/delete, application
decisions, role changes, assisted passengers, invitations, a member renaming themselves — their
memberships' chapters), which expires that chapter's tag and `reports:wide`; without arguments
when they do not (country update/delete, user deletion), which expires `reports`. Trishaw
allocation is the only ride write from the UI today and is not part of the report, so it does
not invalidate. The scheduling, cancel and roster actions must call
`invalidateReports(chapterId)` when they land.
Everything else ages out within the `minutes` profile.

## Training (pilot onboarding)

One slice, `src/features/training/`: the video library, courses and their elements (lessons
and quizzes), learner progress, requirements, exemptions and the riding gate. It stays one
slice because lessons reference videos and a split would turn every lesson write into a use case.

### Video library and ownership

`TrainingVideo` uses the same `CatalogueScope` + `scopeKey` model as trishaw models: a
superadmin owns the global library, a country admin their country's, a chapter admin their
chapter's. A chapter sees global ∪ its country ∪ its own. The uploader never picks the owner:
`startVideoUploadAction` takes the active admin scope (an optional `scope` arg such as
`chapter:<slug>`, else the scope cookie) and derives the **highest level the uploader holds in
it** (`uploadOwnerOf` in `scope-owner.ts`: a superadmin → global, a country admin → that
country, also while looking at one of its chapters, a chapter admin → the chapter; an ambiguous
"all" for a multi-country admin is `scopeAmbiguous`), then runs `requireCatalogueOwner(owner)`
(`lib/auth-guards`, shared with fleet); every other write goes
through `requireAdminOf(training.videoAuthority(id))`, where a global video's authority is
empty so only a superadmin passes. `videoStatusesAction` filters each row by
`allowsAdmin` instead of aggregating authorities, so polling a mixed list never leaks the state
of a video the caller does not manage. One language per video (`CONTENT_LANGUAGES`, names via
`Intl.DisplayNames`).

### Upload → transcode → CDN

| Step | Where | What |
| --- | --- | --- |
| Start | `startVideoUploadAction` → `createVideo` | mime allowlist, size ≤ `TRAINING_MAX_UPLOAD_BYTES`, S3 multipart upload at `training/sources/<mediaKey>` in the private bucket, row `uploading` |
| Parts | `signVideoPartsAction` | presigned `UploadPart` URLs (1 h), 16 MiB parts, the browser PUTs them directly (4 in parallel) and reads `ETag` (exposed by bucket CORS) |
| Complete | `completeVideoUploadAction` → `markUploaded` | every part present, `CompleteMultipartUpload`, `HeadObject` size must equal the announced size, row `queued`, emits `trainingVideo.uploaded` |
| Transcode | worker `media` queue, job `transcode-<id>-<revision>` | `markProcessing` → download with a byte cap → magic bytes → `ffprobe` (timeout, format allowlist, ≤ max duration, ≤ 4K, ≤ 60 fps) → `ffmpeg` fMP4 HLS 360/720/1080 (never above the source) under `nice` with a hard kill → poster frame at min(3 s, 10 %) as WebP 1280 + 480 via sharp → upload to the media bucket → `markReady` |
| Failure | worker | `markFailed(code)`; only the code is stored (`MEDIA_FAILURE_CODES`), stderr never leaves the worker; the revision's partial output is deleted; the scratch directory is always removed |
| Retry | `retryVideoAction` | bumps `revision`, re-emits `trainingVideo.uploaded` |
| Poster | `setPosterFrameAction` → `trainingVideo.posterRequested` | the worker cuts the frame from the top rendition's init + one segment (no source download) and writes `poster-<ms>.webp`; the row's `posterSeconds` changes only after the files exist |
| Delete | `deleteVideoAction` → `trainingVideo.deleted` | the event carries `mediaKey`, `sourceKey` and `uploadId`, because the row is gone when the `purge` job runs |
| Prune | maintenance `prune-training-uploads` (03:30 UTC) | aborts multipart uploads still `uploading` after 24 h and drops their rows |

Every transition is a conditional update on `(id, revision, status)`, so a stale or duplicate
job is a no-op (`markProcessing` returns `null`).

### Public CDN, unguessable keys

Renditions and posters live in a separate **public** bucket (`S3_MEDIA_BUCKET`, served from
`MEDIA_PUBLIC_URL`) under `training/v/<mediaKey>/<revision>/`. `mediaKey` is 128 random bits
in base32; the URL is the capability. Training videos are instructional, not personal, so a
leaked link exposes nothing worth signing every segment for — and signed URLs would defeat
the edge cache and make HLS playlists rewrite per viewer. Every object is written with
`Cache-Control: public, max-age=31536000, immutable`; nothing at a URL ever changes, which is
why a retry bumps `revision` and a new poster gets a new `poster-<ms>` name instead of
overwriting. The originals stay private in `S3_BUCKET` so a video can be transcoded again.
The S3 client runs with `requestChecksumCalculation: "WHEN_REQUIRED"`: the SDK's default
CRC32 on presigned `UploadPart` URLs is something a browser PUT cannot satisfy.

### Worker role split

`WORKER_ROLE` (`events` · `media` · `all`, default `all`) decides which queues a worker
process consumes. Production runs two containers from two images: `worker`
(`WORKER_ROLE=events`, the app image) and `media-worker` (`WORKER_ROLE=media`, the
`media-worker` Docker target with a pinned static ffmpeg/ffprobe, `cpus: 2`,
`mem_limit: 1536m`, a scratch volume, concurrency 1, 5-minute lock). A transcode can take
minutes of CPU; on its own container it can neither starve mail and push delivery nor the
web app. Only the events role registers the maintenance schedulers and the queue gauges.
Local development runs `all`, using the ffmpeg on `PATH` (`FFMPEG_PATH`/`FFPROBE_PATH`).

### Families, courses and elements

A **family** (`TrainingCourseFamily`) is one course in several languages; a **course**
(`TrainingCourse`, unique per family and language) is one variant: an ordered list of
**elements**. An element (`TrainingLesson`, `kind` `lesson` | `quiz`) is either a lesson (title,
Markdown body, optional video and PDF attachment) or a quiz (title, optional intro body, its
questions, `quizShuffle` and `quizDrawCount`). A course may hold any number of quizzes at any
position. Ownership sits on the family in the same `CatalogueScope` + `scopeKey` model as
videos, so every variant has one owner and `courseAuthority` mirrors `videoAuthority`;
`elementAuthority` and `questionAuthority` resolve to the course's. Creating a family goes
through `requireCatalogueOwner(owner)`; a translation through
`requireCatalogueOwner(familyOwner(familyId))`. `publishedAt` hides a course from pilots until
it has at least one element, every quiz has at least one question and every question is
complete (`courseEmpty`, `quizInvalid`); edits after that are live, and a pass
(`TrainingEnrollment.passedAt`) is never taken back.

**A course is immutable below its owner.** There is no chapter overlay, no chapter-only lesson
and no hiding: every element, question and setting write runs
`requireAdminOf(courseAuthority)`, and a global course's authority is empty, so only a
superadmin edits global courses, a country admin (or superadmin) a country's, a chapter admin
(or that country's admin, or a superadmin) a chapter's. A lower admin builds their own course at
their own level instead, and may still **require** a higher course in their own scope (see
Requirements) — that doesn't change the course.

Element writes: `createElement({ courseId, kind, title, position })` inserts at `position` and
shifts the rest in one transaction (`courseFull` beyond 100); `updateElement` refuses
lesson-only fields (`videoId`, `attachmentFileId`) on a quiz and quiz settings on a lesson
(`elementKindMismatch`); `reorderElements` needs exactly the course's element ids; questions
are created only on a quiz element (`createQuestion(elementId)`, `quizFull` beyond 100).

A lesson may only use a `ready` video its owner could pick: a global course global videos, a
country course global and that country's, a chapter course global, the chapter's country and
the chapter's own (`videoSearchFor`, `videoNotAllowed`). A video a lesson uses can't be deleted
(`videoInUse`, FK `Restrict`).

### Checkpoints and passing (`elements.ts`)

A quiz is a **checkpoint**. `elementGates` is pure and decides every element's lock for one
learner:

| Element | Locked when |
| --- | --- |
| Lesson | any earlier quiz is not passed |
| Quiz | any earlier element (lesson or quiz) is not complete |
| Anything already complete | never — completions stick, even if the owner later inserts a quiz before it |

A lesson is complete at 90 % watched or when marked read; a quiz element is complete when an
attempt passes (`TrainingLessonProgress.completedAt` on the quiz element, written once by
`completeElementOnce`). The course is **passed** when every element is complete:
`passIfComplete` runs in the same transaction as the completing write (a quiz submit, or the
heartbeat / mark-read that completes the last lesson), sets `passedAt` once and emits
`training.coursePassed` (`attemptId` is the passing attempt, `null` when a lesson finished the
course). Heartbeats, mark-read and quiz starts on a locked element are refused (`quizLocked`),
and heartbeats or mark-read on a quiz element are `elementKindMismatch`, so a quiz can only be
completed by passing it. Progress is `completed elements / elements` (`percentComplete`), the
"current" title is the first incomplete element's.

Migration `20261017100000_training_elements` dropped overlays, placements, chapter lessons and
`mandatory`, moved `quizShuffle` / `quizDrawCount` to the element, turned every course's
questions into one quiz element appended at the end (only where questions existed), moved the
attempts onto it and marked it complete for every learner with a passed attempt.

### Quiz grading (`grade.ts`)

Questions are single or multiple choice; `questionIssues` is the one validation the editor shows
live and publishing enforces. An attempt's questions and option order are drawn with a
**seeded** shuffle (`userId:elementId:attemptNumber`), optionally only `quizDrawCount` of them,
so the quiz page can render the next attempt's questions without a write and "Start" is instant;
`startQuizAction(courseId, elementId)` then stores the same draw as
`TrainingQuizAttempt.questionOrder` (attempts are numbered per quiz element and enrollment;
`TrainingEnrollment.attemptCount` counts all submitted attempts of the course). What reaches the
browser is `toAttemptView`, which builds new objects without `correct` or `explanation`.
`submitAttempt` grades on the server against the stored order: exact set match per question, a
question deleted since the draw doesn't count, pass = all correct. It refuses while the quiz is
locked (`quizLocked`), marks the attempt submitted conditionally (a double submit is
`quizAttemptClosed`), completes the quiz element on a pass and passes the course when it was the
last open element. Only the result carries the right answers and explanations, `firstPass`
(this quiz), `coursePassed`, plus the next attempt's questions so "Try again" needs no request.

### Watching and heartbeats (`watch.ts`)

A video lesson is complete at 90 % of its duration, a lesson without video when the pilot marks
it read (`acknowledgeLessonAction`). `acceptHeartbeat` lets `furthestSeconds` grow by at most
`2 × elapsed + 5 s` since the last beat, never shrink and never pass the duration; `completedAt`
sticks. Until then the player's `seekLimit` is the furthest point; afterwards it is gone.

Heartbeats go to the Route Handler `POST /api/training/progress`, not a Server Action: an action
call queues behind navigation and can't be sent from `pagehide`, while a route accepts
`fetch(…, { keepalive: true })` and `navigator.sendBeacon` (a `text/plain` JSON body). The route
checks the Origin against `APP_URL` (sendBeacon can't send a custom header, so this is the CSRF
check), the session (401), a 30/min per-user rate limit (429), a 1 KiB body and zod, then calls
`training-access.recordLessonProgress`, which re-checks that the lesson belongs to a course the
person may take, and answers 204 `private, no-store`. Unexpected errors propagate to
`onRequestError`.

### Learner access (`use-cases/training-access.ts`)

Who learns where is membership's (pilot roles and pending applications) and chapters' (the
chapter's country); what is visible is training's. `trainingContext` lists the person's pilot
and applicant chapters with their countries; `visibleCourses` takes the published families
visible to any of them, picks one variant per family (the one already started, else the UI
language, else English, else the first) and gates its elements with `elementGates`. Every pilot
page, action and heartbeat goes through `courseOverview`, so an element of an unpublished course
is simply not there. The pilot routes are `/pilot/training/[courseId]` (overview and outline)
and `/pilot/training/[courseId]/[elementId]`, which renders the lesson view, the quiz flow or a
"pass the quiz first" panel by kind and lock (`elementPage`). "Next" goes to the next element
(the quiz intro when it is a quiz, the overview after the last one); a passed checkpoint
continues to the next element, the last one back to the training home. The next element is
prefetched with the current one, so the quiz intro is instant.

### Requirements (`requirements.ts`, `TrainingRequirement`)

A requirement names a **family** a pilot must pass before riding, owned in the same
`CatalogueScope` + `scopeKey` model (unique per `scopeKey` + family). A chapter's effective set
is global ∪ its country ∪ its own (`effectiveRequirements`, a family listed once by its
broadest source). A chapter can add to what its country requires, never take away: the
country's and the global rows simply aren't the chapter's to remove
(`removeRequirementAction` runs `requireAdminOf(requirementAuthority(id))`, and a global row's
authority is empty, so only a superadmin passes). What may be required is what the owner sees
(`familyAllowedFor`): global only global families; a country global and its own; a chapter
everything visible to it (`familyNotAllowed`). Setting runs `requireCatalogueOwner(owner)`.
The course table sets it per family for the **active scope** with
`setCourseRequiredAction({ familyId, required, scope? })`: the owner is derived on the server
from the active scope (`requirementOwnerOf`: a chapter scope → that chapter, a country scope →
that country, "all" → global for a superadmin), never sent by the client.
`listCourseCatalogue(search, activeOwner)` returns per family the variants with lesson / quiz
counts, published state, `required` (a row for the active owner), `requiredEffective` (also
inherited from global or the chapter's country) and every visible requirement row with its
relation (`own` · `inherited` · `other`).
A family without a published variant doesn't count until it has one. Before saving, the
drawer asks `requirementImpactAction`, which counts the pilots in scope who are ready today
and would not be (`use-cases/training-requirements.ts`).

### The riding gate (`use-cases/pilot-readiness.ts`)

A pilot may ride for a chapter when **every effective family is `passed` or `exempt`** and the
**in-person training** (`PilotStepTick` step `inPersonTraining`, formerly `workshop`) has an
admin's `confirmedAt`. `familyStatus` is pure: a pass of **any** published language variant
satisfies the family (`TrainingEnrollment.passedAt` is never taken back, so elements the owner
adds after the pass don't re-gate), otherwise an exemption makes it `exempt`, otherwise
`inProgress` (an enrollment exists) or `notStarted`. `training.readinessFacts` answers for any
number of chapters and pilots in **six queries** (requirements, published variants,
exemptions, elements, enrollments, completions); `personProfiles.inPersonTrainingOf`
adds one more. A chapter without a country is read through the global and chapter requirements
only, so a ride page never fails on it.

**Every path that puts a pilot on a ride or roster must call `assertPilotsReady(userIds,
chapterId)`** after its role check; it throws `pilotNotReady`. Today that is `staff-ride`,
`schedule-ride` and `sign-up-for-ride` (a pilot taking an open ride themselves).

### Feature flag `TRAINING_REQUIRED`

Until the media pipeline runs in production, the whole gate sits behind the server-only env var
`TRAINING_REQUIRED`, read through `isTrainingRequired()` in `src/lib/feature-flags.ts` (only the
exact value `"true"` turns it on; unset means off). Client components get it as a prop, and it is
read only after a request-time API (session, cookies) so the build never bakes it into a shell.

- **On**: everything in this section applies.
- **Off**: riding works as before the feature. `assertPilotsReady` is a no-op and
  `readinessOfPilots` / `readinessForChapters` report every pilot ready without evaluating any
  requirement, so chapter approval alone lets a pilot ride. Pilots see no courses: no home card,
  no `training` checklist step (the admin-confirmed `inPersonTraining` step stays, without a
  link), `/pilot/training/**` is `notFound()`, `/api/training/progress` answers 404, the pilot
  training actions refuse, and the approval copy and emails drop the videos. Admins keep Courses
  and the video library to prepare content; the course list's "Required in" column and
  mandatory menu items, the course page's Progress section, the
  member panel's course rows, exemptions and Ready badges, and the invite's "Skip training"
  (also ignored server-side) disappear. Tests run with the flag on (`jest.env.ts`).

### Exemptions (`TrainingExemption`)

Per person, `familyKey` either `"all"` (blanket) or a family id, with a reason (`experienced`
from the invite drawer's "Skip training" when the pilot role is invited, `manual` from the
member page, `migration` from the Phase 3 backfill), who granted it (null = system) and the
chapter it was granted in (audit only). Granting and revoking emit
`training.exemptionGranted` / `training.exemptionRevoked`, which the worker turns into history
lines. An exemption covers courses only. The in-person training is never ticked by the pilot: only an
admin confirms it (`pilot-steps.confirmInPersonTraining`, `inPersonTrainingConfirmed` history
line), and revoking deletes the tick. Until then the checklist row shows "waiting for
confirmation from your chapter". Inviting with "Skip training" and the pilot role does both in
one go: a blanket `experienced` exemption and an in-person confirmation by the inviter, so an
invited experienced pilot can ride right away. The
admin actions guard through `requireTrainingAdminOf(pilot, chapterId)`: an admin of a chapter
where the person is a pilot or applicant. Migration `20261016300000_training_gate` gave every
approved pilot a blanket `migration` exemption and a confirmed in-person tick, so nobody who
rode before the gate is suddenly grounded.

### Tracking (`use-cases/training-progress.ts`)

`trainingProgressTable` is the admin table: one row per pilot and effective family of the
chosen chapters, plus a summary per pilot. Names only at chapter scope (`includeNames`), the
Reports rule. `courseProgress({ courseId, chapterIds, includeNames })` serves the progress
section of a course's admin page: the same facts for that course's family (required or not),
counts per status always and per-pilot rows only with `includeNames`. `memberTrainingPanel` is
the member page panel: readiness per chapter the
viewer administers (`allowsAdmin` filters, so the panel never shows another chapter), the
in-person state and every exemption with its granter.

Deleting a chapter or a country cascades its training videos and its courses; `manage-chapter` and
`manage-country` collect the owners' media first (`training.ownerMedia`) and afterwards
`purgeOwnerMedia` deletes orphaned lesson attachments and emits `trainingVideo.deleted` (with
`chapterId: null`, the chapter is gone) so the `purge` job removes renditions and sources.

### Admin editing: element modal, library modal, upload tray

Lessons and quizzes have no page of their own. The course page renders
`ElementModalSlot` (`courses/[courseId]/_components/element-modal-slot.tsx`) behind
`<Suspense>`; with `?element=<id>` in the URL it opens a large modal (nearly full viewport on
desktop, a full-screen sheet on phones) over the course, so the admin never leaves the course.
The slot re-reads the active scope, shows the element only when the course is visible in it, and
offers edits only when `allowsAdmin(access, elementAuthority)`; every write still re-checks in
its Action. Closing (✕, Esc outside a field, ⌘↵, a click on the course in the breadcrumb)
removes `element` from the URL. Fields autosave (`SaveStatus` in the modal header); deleting the
element is the header's typed confirm.

- **Lesson**: Title → Text (Markdown editor, toolbar on top) → Video → Handout, grouped in cards.
  An empty video field offers "Upload new" (file picker straight into the library, the video is
  assigned once it is `ready`) and "Select existing" (the library modal).
- **Library modal** (`features/training/components/video-library-modal.tsx`): search, a language
  filter defaulting to the course language, a drop zone and a grid of the videos the course may
  use (`courseVideoLibrary`). Uploads started there appear as tiles with live progress; picking an
  upload that is still running assigns it when it becomes ready. There is no owner selector —
  `startVideoUploadAction` derives the owner (see Video library and ownership).
- **Quiz**: settings (shuffle, questions per attempt, "Preview as pilot") under the header, then
  the questions full-width — a sortable question rail and the editing card side by side on wide
  screens. The pilot preview is `/admin/training/courses/[courseId]/preview/[elementId]`.
- **Upload tray** (`upload-tray.tsx`, mounted once in the admin layout) is the only progress
  indicator — there are no upload toasts. Its store (`upload-store.ts`) keeps each row's server
  status and an optional `assignTo` element id, and the tray performs that assignment
  (`updateElementAction`) when the video turns `ready`, so it survives closing the modal. The
  tray sits beneath an open modal; the modal's own tiles and video field show the same state.

### Player

`src/components/training-player.tsx` wraps Video.js 10 (`@videojs/react` +
`@videojs/hlsjs-video`, exact pins) with the shadcn-ejected skin in
`src/components/videojs/`, restyled to brand tokens. `seekLimit` clamps seeking to the
furthest watched point (Phase 2's first-watch rule); the admin preview passes none. It loads
through `next/dynamic` (`training-player-lazy.tsx`) with the poster as an immediate
placeholder.

