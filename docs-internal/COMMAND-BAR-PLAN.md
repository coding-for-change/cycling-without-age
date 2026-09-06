# Command bar: from navigation to control surface

Implementation plan for turning the admin ⌘K palette into a deterministic search-and-act
surface. Example flows this plan covers: `prom` → **Promote member to admin** → `joh` →
**John Meier · Berlin** → done. `@fra` → **Francine Holm** → opens her page. On a member's
page, ⌘K → **Promote to admin** runs with no picker.

Natural-language parsing, voice input, search clusters and embeddings are out of scope.
The registry shape chosen here does not preclude them later; nothing in this plan depends
on them.

## What exists today

- `src/lib/commands.ts` — serializable `CommandEntry` registry, `visible(scope)` predicate,
  `CommandRun` is either `navigate` or one of four client actions.
- `src/app/admin/commands.ts` — assembles the palette: walks `NAV`, merges slice
  contributors, adds perspective, scope and account groups.
- `src/features/*/commands.ts` — each slice contributes its destinations and create
  shortcuts.
- `src/app/admin/_components/command-bar.tsx` — cmdk dialog, flat list, one `run` switch.
- `src/app/admin/commands.test.ts` — sidebar/palette parity, per-role visibility, unique ids.

Mutations already exist as guarded server actions and use cases:
`changeMemberRoleAction` (promote/demote/remove, `requireChapterAdmin`),
`decideApplicationAction` (approve/reject), `manage-country-admins` use case.
The palette gains verbs by calling these, never by adding new mutation paths.

## Principles

1. **One registry, every consumer.** The list, the pickers and the page-context entries
   all derive from `CommandEntry`. A verb is added in exactly one file: the slice's
   `commands.ts`.
2. **Deterministic and instant.** Filtering is cmdk's fuzzy match over labels and
   `keywords`. The only network call is entity search, debounced, returning at most 8 rows.
3. **Every path ends in an existing server action.** The palette resolves *who* and
   *what*; authorization stays where it is (`requireChapterAdmin(chapterId)` etc.). Picker
   results are hints, never trust.
4. **Nothing is palette-only.** Every verb remains reachable from a menu or page, so the
   palette stays a keyboard accelerator and never an accessibility bottleneck.

## Phase 1 — Slots, pickers, directory search

Covers all three example commands from the brief for the entities that exist today.

### 1.1 Registry (`src/lib/commands.ts`)

```ts
export type SlotKind = "member" | "passenger" | "chapter";

export type SlotValue =
  | { kind: "member"; userId: string; chapterId: string; label: string }
  | { kind: "passenger"; passengerId: string; chapterId: string; label: string }
  | { kind: "chapter"; chapterId: string; label: string };

export type CommandActionId =
  | "scope.set" | "sidebar.toggle" | "locale.set" | "session.signOut"
  | "member.role"          // arg: "promote" | "demote" | "remove"
  | "application.decide";  // arg: "approve" | "reject"

export type CommandGroup =
  "act" | "create" | "navigate" | "perspective" | "scope" | "account";

export type CommandEntry = {
  // ...existing
  slots?: readonly SlotKind[];
  confirm?: boolean;   // destructive: show a confirm row before running
};
```

- `act` is a new group, ordered first in `COMMAND_GROUP_ORDER`.
- A command's label with an unfilled slot reads as the verb phrase
  ("Promote member to admin"); once filled it renders with `fill()`
  ("Promote John Meier to admin"). Dictionary keys carry a `{member}` placeholder.
- `confirm: true` on `member.role/remove` and `application.decide/reject`. Promote,
  demote and approve run on select; the existing toast reports the result.

### 1.2 Verbs (slice `commands.ts`)

| Slice | id | slots | run | visible |
|---|---|---|---|---|
| membership | `member.promote` | member | `member.role` / `promote` | always |
| membership | `member.demote` | member | `member.role` / `demote` | always |
| membership | `member.remove` | member | `member.role` / `remove`, confirm | always |
| membership | `application.approve` | application | `application.decide` / `approve` | always |
| membership | `application.reject` | application | `application.decide` / `reject`, confirm | always |
| chapters | `country-admin.appoint` | — | navigate `/admin/countries?appoint=1` | `canSeeCountries` |

`application` is a fourth `SlotKind` whose search returns pending applications only.
Rides are not a feature yet; when they land, "Create a ride with … as passenger" is one
entry with `slots: ["passenger"]` and nothing else in this plan changes.

### 1.3 Directory search (server)

Layering per `ARCHITECTURE.md`:

- **Services**: `searchMembersOfChapters(chapterIds, q, limit)` in
  `features/membership/services/members.ts`; `searchPassengersOfChapters` in
  `features/passengers/services/passengers.ts`; `searchChapters(chapterIds, q)` in
  `features/chapters/services/chapters.ts`; `searchPendingApplications` in
  `features/membership/services/applications.ts`. Prisma `contains` with
  `mode: "insensitive"` on name and email, `take: limit`.
  `// ponytail: ILIKE; add pg_trgm index when a chapter passes ~5k members`
- **Facades**: one-line wrappers exposing the search per slice.
- **Use case** `src/use-cases/search-directory.ts`: `searchDirectory(kind, q, chapterIds)`
  fans out to the facade for that kind. Cross-feature, so it is a legitimate use case.
- **Action** `src/app/admin/actions.ts`: `searchDirectoryAction(kind, q)`.
  `requireAdminScope()` → `chapterIds = scope.global ? undefined : scope.chapters.map(id)`.
  Zod: `q` trimmed, 2–64 chars, `kind` enum. Returns `SlotValue[]`.
  Never accepts chapter ids from the client.

Root-level search (typing a name with no verb) uses the same action across `member` and
`chapter`, and renders hits in a `results` group as `navigate` commands to
`/admin/members/[userId]` and `/admin/chapters?chapter=…`. This is what makes the palette
a search, not just a menu. Fire it only when the query has ≥2 characters and cmdk found
fewer than 3 static matches.

### 1.4 Palette state machine (`command-bar.tsx`)

```ts
type Stage =
  | { kind: "root" }
  | { kind: "slot"; command: ResolvedCommand; filled: SlotValue[]; index: number }
  | { kind: "confirm"; command: ResolvedCommand; filled: SlotValue[] };
```

- Selecting a command with unfilled slots → `slot` stage. The input clears, the
  placeholder becomes the slot prompt ("Which member?"), the list shows search results
  for that kind. Breadcrumb chips above the input show the verb and filled slots.
- Backspace on an empty input pops one stage. Escape closes and resets to `root`.
- Last slot filled → `confirm` stage if `command.confirm`, otherwise run.
- `run` maps `CommandActionId` → server action call. Typed as
  `Record<CommandActionId, Handler>` so a new id without a handler is a compile error.
- On result: existing `action-feedback.ts` toast, one haptic (`success`/`error`) beside it
  per the native rules, close dialog. Actions already `revalidatePath("/admin", "layout")`.
- Picker rows: avatar via `person-avatar.tsx`, name, secondary line (chapter · role).
  Loading shows three skeleton rows; empty shows the dictionary's empty string.
- Debounce 150 ms; cancel stale responses by comparing the query at resolve time.

### 1.5 i18n

New keys under `admin.commands` in `en.ts`, `de.ts`, `da.ts`: verb labels with
`{member}`/`{passenger}`/`{application}` placeholders, slot prompts, confirm strings, group
headings `act` and `results`, the sigil hint. Copy goes through the `frontend` skill and
`docs/BRAND.md` before merge.

### 1.6 Tests

- Extend `commands.test.ts`: every `act` entry declares slots its action needs; a chapter
  admin never sees `country-admin.appoint`; ids stay unique with the new group.
- `search-directory.test.ts`: a chapter admin's search is constrained to their chapter ids;
  a superadmin passes `undefined`; queries under 2 chars return nothing.
- A state-machine test for `Stage` transitions (pure reducer, no DOM): select → slot →
  Backspace → root; last slot → confirm when flagged.

### 1.7 Security check (required by AGENTS.md §6.11)

- `searchDirectoryAction` derives chapter ids from the session, never from input.
- Every verb's target action re-guards on the ids it receives; a forged `chapterId` from a
  tampered picker fails `requireChapterAdmin` exactly as it does from the members table.
- Search returns name, chapter and role only — no email in the payload unless the row is
  already visible on the members page for that admin.
- Rate: the action is cheap, but cap `take` at 8 server-side regardless of input.

## Phase 2 — Page context and recents

### 2.1 Context entries

- `CommandContextProvider` (client) mounted in `admin-chrome.tsx`; exposes
  `register(entries: ResolvedCommand[]): () => void`.
- Client bodies register on mount and unregister on unmount. `person-body.tsx` registers
  `member.promote` / `member.demote` / `member.remove` with the member slot pre-filled
  (`prefilled: SlotValue[]` on the resolved entry). `members-body.tsx` registers
  approve/reject for the focused application row when the decision dialog is closed.
- The palette renders them first under a `here` group ("On this page"). A pre-filled entry
  skips directly to run or `confirm`.
- Labels are resolved server-side as today: the page's Server Component builds the entries
  with the dictionary and hands them to the body as props; the body only registers them.

### 2.2 Recents

- `localStorage["cwa.cmdk.recent"]`: last 8 command ids, most recent first, written after
  a successful run. Every read and write wrapped in try/catch.
- Shown as a `recent` group only while the input is empty. Entries that are no longer in
  the current command list (scope changed, role lost) are dropped on read.
- `// ponytail: localStorage; move to a user preference when cross-device matters`

## Phase 3 — Sigils

- Prefix on the root input switches the list: `@` → member search only, `#` → chapter
  search only, `>` → `act` group only. Implemented as a three-line check on the input value
  that sets a `filter` on the root stage; the sigil is stripped before matching.
- Placeholder rotates the hint ("Type @ for people, # for chapters, > for actions").
- Selecting an entity in `@`/`#` mode navigates to it; selecting a verb in `>` mode enters
  its slot flow as in Phase 1.

## Files touched

| File | Change |
|---|---|
| `src/lib/commands.ts` | slots, `SlotValue`, new action ids, `act`/`results`/`here`/`recent` groups, `confirm` |
| `src/features/membership/commands.ts` | five verbs |
| `src/features/chapters/commands.ts` | appoint country admin |
| `src/features/*/services/*.ts` | one `search*` query each |
| `src/features/*/facade.ts` | search wrappers |
| `src/use-cases/search-directory.ts` (+ test) | fan-out by kind |
| `src/app/admin/actions.ts` | `searchDirectoryAction` |
| `src/app/admin/_components/command-bar.tsx` | stage reducer, pickers, breadcrumbs, run map |
| `src/app/admin/_components/command-context.tsx` | Phase 2 provider |
| `src/app/admin/members/[userId]/_components/person-body.tsx` | registers pre-filled verbs |
| `src/lib/i18n/{en,de,da}.ts` | new strings |
| `src/app/admin/commands.test.ts` | extended assertions |
| `docs-internal/architecture/dependency-graph.md` | `search-directory` → membership, passengers, chapters facades |

## Order and acceptance

1. **Phase 1** ships alone and is useful alone. Done when: a chapter admin can promote,
   demote, remove, approve and reject from the keyboard without leaving the page they are
   on; typing a name finds a person; the parity test and the new tests pass; the security
   check above is walked through in the PR description.
2. **Phase 2** — done when the person page offers its verbs with no picker, and reopening
   the palette shows what you used last.
3. **Phase 3** — done when `@`, `#` and `>` narrow the list and the hint copy is localized.

## Decisions to confirm before Phase 1

- Confirm row for `remove` and `reject` only, or for every role change?
- Root-level entity search on every keystroke (one debounced query per pause) versus only
  behind `@`/`#`. The plan assumes the former with the "fewer than 3 static matches" gate.
- Passenger search in Phase 1 or deferred until a verb needs it. The plan includes the
  service and slot kind so rides can use it, but no Phase 1 verb consumes it.
