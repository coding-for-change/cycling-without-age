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

Guards read that object, so they never query the DB per request. The single exception is
`requireChapterAdmin`, which resolves the chapter's `countryId` (one indexed lookup)
only after the membership check has already failed — a country admin is not a member.

### Guards (`lib/auth-guards.ts`)

`requireAuth`, `requireSuperAdmin`, `requireCountryAdmin(countryId)`,
`requireChapterAdmin(chapterId)`, `requireChapterRole(chapterId, role)`,
`getHighestRole(session)`. Each higher guard satisfies the lower ones: superadmin passes
everything; a country admin passes chapter-admin checks for chapters **in their own
country only**. The predicates behind them are pure and live in `lib/access.ts`, which imports nothing.

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
