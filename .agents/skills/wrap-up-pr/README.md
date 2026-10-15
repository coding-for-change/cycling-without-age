# wrap-up-pr

Gets a large PR ready for review: review against `main` with one commit per fix, a test pass in the
running app, one short MP4 per feature, and a PR description with a marked spot for each clip.

Lives in `.agents/skills/` and is symlinked to `.claude/skills/wrap-up-pr` so Claude Code finds it.
Like `cwa-context`, it is **first-party and hand-written**: it is not in `skills-lock.json` and must
not be pruned by a skills sync.

| File | Content |
| --- | --- |
| `SKILL.md` | The procedure, step by step |
| `references/pr-description.md` | The PR description template |
| `scripts/browser.mjs` | Playwright helpers: sign-in via Mailpit OTP and a virtual passkey, recording, contact sheets |
| `scripts/sign-in.mjs` | Signs one dev account in and saves its session |
| `scripts/sheet.mjs` | Writes a contact sheet of a clip, to check it frame by frame |
| `scripts/example-clip.mjs` | A complete clip script to copy from |

The scripts need `playwright-core` and `ffmpeg-static`, which are not dependencies of the app. Copy
them into a scratch directory and install those two there, as step 2 of `SKILL.md` describes.
