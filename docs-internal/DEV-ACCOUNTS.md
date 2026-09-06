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
