# Docs recordings

Playwright scripts that record the walkthrough videos embedded in the docs.

1. Local stack running (`docker compose up -d --wait`, `npm run db:seed`, `npm run dev`, `npm run dev:worker`).
2. `npm run docs:record` signs in every seed account (OTP from Mailpit, virtual passkey for admins), records every `specs/**/*.rec.ts`, and encodes them to `docs/videos/<slug>.mp4`.
3. One clip: `npx playwright test -c docs/_recordings/playwright.config.ts specs/desktop/admin-schedule-ride.rec.ts && docs/_recordings/scripts/encode.sh admin-schedule-ride`.

Each spec calls `record({ slug, account, warm })`. `warm` URLs are opened in an unrecorded context first so the dev server has compiled them. Helpers in `lib/human.ts` move a visible pointer and type at a human pace.

`notes/<slug>.md` holds the exact steps and on-screen labels of each clip; the guide text follows them.
