# Log in as… (dev seed)

```bash
docker compose up -d db mailpit
npm run db:migrate     # or: dotenv -e .env.local -- prisma migrate deploy
npm run db:seed
```

The seed is idempotent — run it as often as you like — and refuses to run when
`NODE_ENV=production`.

## Signing in

There are no passwords anywhere. Enter one of the emails below on the sign-in page, then
read the 6-digit OTP from **Mailpit: <http://localhost:8026>**. (If Mailpit is not
running, the mailer prints the code to the `next dev` console instead.)

| Email | What you get |
| --- | --- |
| `superadmin@cwa.local` | superadmin — passes every guard |
| `country.de@cwa.local` | country admin **DE** — chapter admin over München + Hamburg, nothing in DK |
| `admin.muenchen@cwa.local` | chapter admin of **München** |
| `pilot@cwa.local` | approved pilot in **München and Hamburg** (multi-chapter case) |
| `pilot.pending@cwa.local` | pending pilot application for **München**, no membership yet |
| `passenger@cwa.local` | passenger in **München**, phone `+4915112345678` (pre-verified) |
| `multi@cwa.local` | pilot **and** chapter admin in **Hamburg**, plus country admin **DK** (role-stacking case) |

## Walking the core loop

Every admin account is asked for a passkey the first time it opens `/admin` — the enrollment
gate sends it to `/onboarding/passkey?required=1`, and the dashboard opens once one is added. Chrome or
Safari on a Mac will offer Touch ID.

To see the whole application loop end to end: sign in as `admin.muenchen@cwa.local`, open
**Members**, and approve Pernille (`pilot.pending@cwa.local`) with a note. The decision email
lands in Mailpit, the event shows on her page at `/admin/members/[userId]`, and signing in as
her afterwards lands on `/pilot` with the approval celebration — once.

## Walking the growth loop

**The join page.** `/join/muenchen` is public — open it signed out and you get the two role
cards; signed in as `passenger@cwa.local` you get "you are already in". `/join/muenchen/poster`
is the printable A4 sheet with the QR code (⌘P shows the real page size). The other slugs are
`hamburg` and `copenhagen`. An unknown slug such as `/join/nope` renders the not-found copy
rather than a bare 404.

The QR points at `APP_URL`, so on localhost it encodes `http://localhost:3000/join/muenchen` —
scannable from a phone on the same network only if you set `APP_URL` to your machine's LAN
address.

**Assisted signup.** Sign in as `admin.muenchen@cwa.local`, open **Passengers** and
*Add a passenger*. Two cases worth walking:

- *Passenger owns the account* — give the passenger's own email (anything, e.g.
  `resident@cwa.local`); leave the helper box unticked, or tick it and give the helper a
  **different** contact. The new `User` is the rider.
- *Helper owns the account* — tick the box and put the **same** contact in both fields. The
  dialog says so live ("This account will belong to …"), and the account is created in the
  helper's name with `managesOthers`.

Nothing is emailed: a provisioned account has no password, no session and no credential row,
so it simply waits. To claim it, sign out and sign in with that same email — the OTP arrives
in **Mailpit** as usual. The consent step now says "… set this account up for you", and
finishing consent stamps `claimedAt`; the `accountCreated` and `accountClaimed` lines then
show on `/admin/members/[userId]`.

**Invitations.** Same admin, **Members → Invite**. The invitation itself *does* send mail —
read it in Mailpit and follow its button, which lands on `/sign-in?next=/admin` or `/pilot`.
Inviting an address that already has an account still grants the role (the toast says so)
rather than failing.

## The demo org structure

| Country | Chapters |
| --- | --- |
| Deutschland (`DE`) | `muenchen` — München – Seniorenheim Sonnenhof · `hamburg` — Hamburg – Alstergarten |
| Danmark (`DK`) | `copenhagen` — København – Nørrebro |

## Where the data comes from

`prisma/seed.ts` creates users through BetterAuth's admin API (`auth.api.createUser`),
never with raw Prisma inserts, so `user`/`account` rows stay consistent. It passes no
password, so no credential account is created. Countries, chapters, memberships and
applications go through the `chapters` and `membership` facades — the same code paths the
app uses.
