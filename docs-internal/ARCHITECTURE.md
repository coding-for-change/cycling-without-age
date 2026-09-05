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

## Folder Structure Definition

```text
src/
├── app/                  # ROUTING: Pages, Layouts, and API Route handlers.
│   ├── api/              # External-only endpoints (Webhooks, etc.).
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
├── components/           # ATOMIC UI: Shared, stateless shadcn components.
├── lib/                  # INFRA: DB clients, Auth config, Shared utils.
└── docs/                 # ARCHITECTURE: The system manifesto.
```

## Manifesto Rules
- **Deep-linking into a feature's `/services` folder is a build-breaking offense.**
- **Every Feature MUST expose its logic through a single `facade.ts`.**

## Native Shell (Capacitor)

The iOS (`ios/`) and Android (`android/`) apps are thin Capacitor shells whose WebView loads the
deployed site (remote-URL shell — the app is server-rendered and cannot be statically exported).
Native plugin access is cross-cutting infrastructure and lives in `src/lib/native/*`
(`haptics.ts`, `native-bootstrap.tsx`), same status as `lib/auth-guards`: any layer's client
components may import the wrappers, but `@capacitor/*` is never imported outside `src/lib/native/`
(lint-enforced). See AGENTS.md §7 for the operational rules.

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

`getSession`, `requireAuth`, `requireSuperAdmin`, `requireCountryAdmin(countryId)`,
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
| superadmin | everything; create countries; appoint/remove country admins |
| country admin | create/edit chapters in own country; appoint/remove chapter admins there; everything a chapter admin can, for own country's chapters |
| chapter admin | approve/reject pilot applications for own chapter; promote members to chapter admin; manage own chapter |
| pilot | free self-signup; membership per chapter requires approval; may belong to many chapters |
| passenger | free self-signup; membership active immediately, no application |

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

`requireAdminScope` currently scans all countries and all chapters per request (deduped by
`cache`). That is marked in the source as a known ceiling: at a few hundred chapters it
should resolve only the scope's own rows instead.

Every admin list renders through one client primitive, `DataTable`
(`src/components/ui/data-table.tsx`, on `@tanstack/react-table`): search, column filters,
column visibility, sortable headers, pagination and clickable rows. The server parent still
does all the reading and hands it finished rows plus `dict.admin.table`; filtering and paging
are client-side over the full scope list, which is the documented ceiling in that file.

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

### Activity feed (`features/activity`)

One append-only table, `activity_event`, records what happened to a person: applications
submitted/approved/rejected, roles granted and revoked, members removed, emails sent, country
admins appointed and removed. It is a slice of its own because recording an event always sits
next to a mutation owned by a *different* feature, which is what makes those actions use
cases (`decide-pilot-application`, `change-member-role`, `submit-pilot-applications`,
`manage-country-admins`).

It also solves a data problem: `ChapterApplication` keeps its `@@unique([userId, chapterId])`,
so re-applying overwrites the previous decision. The events do not overwrite, so the history
on `/admin/members/[userId]` survives a re-application. Events with a `chapterId` are chapter
scoped and only visible to admins of that chapter; country-level events (country admins) carry
no `chapterId` and surface only when the reader's scope is global —
`activity.listForUser(userId, { chapterIds, includeGlobal })` defaults `includeGlobal` to
`false` so a narrow read cannot leak them by omission.

Labels live in the dictionary (`admin.history.<ActivityType>`) with a single `{actor}`
placeholder, filled with the actor's name, "You", or "Someone" — the feed renders copy, the
table stores facts.

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
`profile.getProfile(id)._count.passkeys` (request-cached) and, at zero, redirects to
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
