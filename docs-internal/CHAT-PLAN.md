# Chat — what is left after phase 1

Phase 1 shipped the core on `feature/cod-245` (2026-09-17/18): encrypted 1:1 and group
conversations, SSE realtime with typing, presence and read receipts, markdown, swipe-to-reply,
name search, push and digest mail on all three shells. The architecture and the decisions behind
it are in [ARCHITECTURE.md](ARCHITECTURE.md) → *Chat* and [EVENTS.md](EVENTS.md) → *Chat*.
This file is the backlog: what remains, in the order it should land, and what already exists to
build on.

## Already built, waiting for a surface

Every verb below is implemented, guarded and tested on the server. Phase 2 is almost entirely UI
on top of these; no migration is needed.

| Capability | Facade (`features/chat`) | Action (`actions.ts`) | Realtime event |
| --- | --- | --- | --- |
| Reactions | `toggleReaction` | `toggleReactionAction` (30 / 10 s) | `reaction.changed` |
| Edit own message (15 min) | `editMessage` | `editMessageAction` | `message.updated` |
| Delete own message | `deleteMessage` | `deleteMessageAction` | `message.updated` |
| Mute (8 h / 1 w / forever) | `setMute` | `setMuteAction({ preset })` | — (own device only) |
| Leave a group | `leaveGroup` | `leaveGroupAction` | `member.left`, `conversation.updated` |
| Announcement switch | `setAnnouncementOnly` | `setAnnouncementOnlyAction` | `conversation.updated` |
| Frozen chat, continue | `freeze`, `continueConversation` | `continueConversationAction` | `conversation.updated` |
| Admin oversight | `listConversationsInScope`, `readConversationAsAdmin` | via `use-cases/chat/oversight.ts` | — |
| Retention | `pruneOldMessages`, `purgeEmptyConversations` | worker `prune-chat`, 03:00 UTC | — |

The client store (`components/chat-store.ts`) already applies all of those events, so a new
control only needs to call the action; the screen updates from the stream like everything else.
Strings for the thread, system lines and errors exist in `en/da/de.ts` under `chat.*`; each item
below names the keys that are still missing.

## Phase 2 — after the UI review

Build order is by dependency and by what the review is most likely to send back first.

### 2.1 Message actions: reply, react, edit, delete

- **Where**: `components/message-row.tsx` (hover bar on desktop, long-press on mobile),
  new `components/message-actions.tsx`, new `components/reaction-picker.tsx`.
- **Mobile**: long-press opens a vaul `Drawer` (so Android back closes it) with the quick six
  👍 ❤️ 😂 😮 😢 🙏, then Reply, Copy, Edit (own, inside `EDIT_WINDOW_MS`), Delete (own). No
  haptic on long-press (decided).
- **Desktop**: hover bar beside the bubble gains React and a `…` with Edit / Delete / Copy.
- **Picker**: `npm i frimousse`, lazy `next/dynamic`, emoji data self-hosted under `public/emoji/`
  (copy from `emojibase-data` at build, never the CDN default). The `emoji` schema already refuses
  anything that is not one grapheme.
- **Rendering**: `BubbleReactions` under the bubble, own reaction highlighted, tap toggles; edit
  turns the bubble into an inline textarea with Save / Cancel, `edited` marker already renders.
- **Strings**: `chat.actions.{react, copy, edit, delete, save, cancel, deleteConfirm}`.

### 2.2 Conversation info sheet: members, mute, leave, announcement

- **Where**: new `components/conversation-info.tsx`, opened from the thread header (tap on
  mobile, an info button on desktop); vaul sheet below `md`, `SidePanel`-style column above.
- **Members**: avatars with presence dots, roles, capped at 200 rows plus a "+n" line
  (`ConversationView.members` is already capped; `memberCount` carries the truth).
- **Mute**: three presets and Unmute, calling `setMuteAction`; row shows the current state.
  The list already draws the `BellOff` icon and the worker already honours `mutedUntil`.
- **Leave** (groups): confirm `Dialog`, then `leaveGroupAction`; the store removes the
  conversation and the router goes back to the list.
- **Announcement** (owner, below 100 members): `Switch` on `setAnnouncementOnlyAction`; refuse
  with `aboveThreshold` copy when the group is larger.
- **Strings**: `chat.info.{title, members, mute, muteFor8h, muteFor1w, muteForever, unmute,
  leave, leaveConfirm, announcement, announcementHint, aboveThreshold}`.

### 2.3 Frozen chats: "Keep chatting"

- `conversation-thread.tsx` already shows the frozen banner; add the `variant="brand"` button
  calling `continueConversationAction`. The system line `continued` renders already.
- Nothing creates a frozen conversation yet: `chat.freeze` waits for the ride feature. Until
  then, verify with a one-off script or a facade test.

### 2.4 Admin oversight pages

- **Routes**: `src/app/admin/chat/oversight/page.tsx` and
  `oversight/[conversationId]/page.tsx`, reached from a second rail icon in the admin chat
  layout; both call `requireAdminScope()` and `readActiveScope`.
- **List**: `DataTable` over `listConversationsInScope(scope, active, opts)`: kind, title or the
  two names, chapter, members, last message time; search by participant name or title
  (bodies are encrypted, never searched). Empty state via `EmptyState` with
  `/illustrations/chat/oversight-empty.svg`.
- **Thread**: `readConversationAsAdmin(scope, active, id)` returns `null` for anything outside
  the scope, which the page turns into `notFound()`. Reuse `ConversationThread` in a read-only
  mode (no composer, no actions, no presence) under a persistent "Viewing as admin" banner.
- **Decision on record**: no audit trail of admin reads (2026-09-17).
- **Nav**: a `NAV` row is not needed; the rail icon lives inside the chat layout. Add the
  `commands.ts` entry so ⌘K reaches it and `commands.test.ts` stays green.
- **Strings**: `chat.oversight.{title, viewingAsAdmin, search, empty.*, columns.*}`.

### 2.5 Live unread badge

- Today `ChatBadge` is server-rendered and updates on navigation. For a live pill, mount
  `ChatRealtimeProvider` once per shell (outside the chat layout) with `focus` unset, and let
  `useUnreadConversations()` from the store drive `MobileTabBar`, `MemberNav` and `AdminNav`.
- One `EventSource` per tab across the whole app is the cost; the shell-level provider must
  not open a second stream when the chat layout mounts (share through context).
- Consider first whether the badge on navigation is enough; this is the one item in phase 2
  that touches every shell.

### 2.6 Retention check

- `prune-chat` is scheduled and tested; run it once against real rows (promote the job in Bull
  Board) and confirm `chat_message` older than 12 months and member-less conversations go.

## Small items, any time

- **`toggleReactionAction` emoji constraint** and **group title normalisation** are done and
  tested; the picker in 2.1 must only ever emit what `isSingleEmoji` accepts.
- **`MemberView.mutedUntil`**: adding it lets `notify-chat-message` filter muted recipients in
  memory instead of one `getConversation` read per recipient. Worth doing before the first
  chapter-wide announcement group.
- **`countUnreadConversations` runs twice per member page** (tab bar and sidebar are separate
  Suspense boundaries). Cheap query; wrap in a request-scoped cache in the shell if it shows up.
- **Leaving a group keeps the `conv:<id>` channel** until the stream reopens. Publishing
  `member.left` on the conversation channel and dropping the subscription in the SSE handler
  closes it properly; a contract change to `lib/realtime`.
- **Redis-backed `withinRateLimit`** the moment a second `app` instance exists; today the
  limiter is per process.
- **Search inside message text** is impossible by design (encrypted bodies). If it is ever
  asked for, it needs a separate searchable index with its own threat model, not a `LIKE`.

## Operations before the first production use

| Where | State |
| --- | --- |
| `CHAT_MASTER_KEY` in `.config/secrets.yml` | done 2026-09-18 |
| `CHAT_MASTER_KEY` in `deploy.yml` / `deploy-feature.yml` | done |
| `FIREBASE_SERVICE_ACCOUNT`, `GOOGLE_CLIENT_*`, `GATEWAYAPI_SENDER`, `PASSKEY_ANDROID_ORIGINS`, `ANDROID_CERT_SHA256_FINGERPRINTS` in the vault | open; each is silently omitted from the prod `.env` while missing |
| Resend sending domain verified for `EMAIL_FROM` | check after the mailer fix ships |
| `init: true` on `app` and `worker` in `docker-compose.prod.yml` | open; stops zombie `node` children |
| Empty-state SVGs under `public/illustrations/chat/` | open; `EmptyState`'s `illustration` prop is wired, pass `illustrations` on `ChatLayout` |
| `service-account.json` out of the repo root or in `.gitignore` | open |

## Attachments — not scheduled

Images were deliberately left out of both phases. When they come: S3-compatible storage
(the Minio variables in `.env.example` are placeholders for exactly this), `Attachment` from
`components/ui/attachment.tsx` in the bubble, upload through a Server Action that returns a
signed URL, thumbnails generated by the worker, and encryption at rest for the objects to match
the messages.
