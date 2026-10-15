---
name: wrap-up-pr
description: Use when the user asks to wrap up, finish or get a PR ready for review ("wrap up this PR", "make this PR reviewable"). Reviews the branch against main and fixes each finding in its own commit, tests every feature in the running app per role on desktop and phone, records one short MP4 per feature, and writes a PR description with a marked spot for each video.
---

# Wrap up a PR

A large PR is hard to review from a wall of screenshots. Wrapping it up leaves the reviewer three
things:

1. a branch where every review finding is fixed, one commit per fix;
2. a folder of short numbered clips, one per feature, outside the repo;
3. a PR description that says what changed, how the parts fit together, and where each clip goes.

Work through the steps in order. Each one ends with something the user can check.

## Ground rules

- **Ask before you change git or GitHub.** `AGENTS.md` says the user commits. Show the findings
  first; once the user says to fix them, each fix becomes its own commit, pushed to the PR's
  branch. Set the PR description only after the user has read it.
- **One fix, one commit.** Stage by path (`git add <files>`), never `git commit -a`: lint-staged and
  leftover edits get swept into the wrong commit. Message: `COD-<n>: <what the fix does, imperative>`
  plus the attribution line. If two fixes did land together, split them with
  `git reset --soft <sha>~1` before pushing, never after.
- **Bugs already on `main` belong to another PR.** Confirm by reading `git show main:<path>` or
  reproducing on `main`, then list them under "Left for later". Don't fix them here.
- **Describe only what you saw.** Every claim in the description was tested in this session.
  Example data you typed in (a split day, a place name) is called example data, never presented as
  something the product or a chapter does.
- **Never print secrets.** Copy a missing `.env.local` key from a sibling worktree without echoing
  its value; check with `grep -c '^KEY=' .env.local`.

## 1. Review against main

1. Read `git diff main...HEAD`, the Linear issue, the current PR body and `AGENTS.md`.
2. Review with subagents, one per concern: correctness and edge cases; authorization (every action
   guards the record it loads, not just the id it was given); the layering law; i18n in all three
   locales; UI conventions (drawers, `text-balance`/`text-pretty`, 4px grid, logger); tests.
3. Verify each finding against the code before you report it, rank them, and ask the user which
   belong in this PR.
4. Fix them one commit at a time. After the last one run `npx tsc --noEmit`, `npm run lint` and
   `npm test`, then push.
5. Review once more. The second pass catches what the fixes introduced.

## 2. Run the app

Worktrees share the Docker containers but need their own database and port.

1. `docker ps`. If `db`, `mailpit` and `redis` aren't up yet: `docker compose up -d --wait`
   (MySQL 3307, Redis 6380, Mailpit 8026, MinIO 9002).
2. Give the worktree its own database in `.env.local` (`…:3307/cwa_dev_<n>`), then
   `npm run db:migrate && npm run db:seed`.
3. Pick a free port. Another worktree may hold 3000. Set `BETTER_AUTH_URL` in `.env.local` to that
   port, or sign-in fails with `Invalid origin`. Start `npm run dev -- -p <port>` in the background
   and log to a file in your scratchpad.
4. Set up the browser tooling in your scratchpad, never in the repo:

   ```bash
   cp .agents/skills/wrap-up-pr/scripts/*.mjs "$WORK"/
   cd "$WORK" && npm init -y >/dev/null && npm i playwright-core@1.55 ffmpeg-static@5
   npx playwright-core install chromium
   ```

5. Sign in once per role you need. The script reads the OTP from Mailpit, registers a passkey on a
   virtual authenticator when onboarding asks for one, and saves `state-<role>.json`:

   ```bash
   APP_URL=http://localhost:<port> node sign-in.mjs admin.muenchen@cwa.local chapter-admin
   ```

   Accounts are listed in `docs-internal/DEV-ACCOUNTS.md`. The script prints where the account
   landed. An account that still has onboarding steps (a pilot or passenger lands on
   `/onboarding/consent`) needs those finished in a short script before its state is useful. A 429
   means the OTP rate limit kicked in; wait a minute.

## 3. Test every feature

List the features from the diff. For each one, write a short script with `open()` and `steps()`
from `browser.mjs` and test:

- the main flow, start to finish;
- the edges: empty state, archived or deleted records, stale ids, a record from another chapter;
- every role the feature touches, including the one that must not see it;
- desktop (1280 px) and phone (`open({ phone: true })`, 390 px).

Look at what you test. Take screenshots and read them; on a phone, also check
`document.documentElement.scrollWidth > innerWidth` for horizontal overflow. `browser.mjs` logs
every page error and console error. Read them.

When something is wrong, find out whether `main` has it too (see the ground rules). A bug from this
PR is fixed in its own commit and tested again; a bug from `main` is noted.

Playwright notes for this app:

- Map pages never reach `networkidle`; wait for `load` plus a short timeout.
- Select by role and accessible name. Add `exact: true` when one label contains another
  ("Mon 19/10" vs "Week of Mon 19/10"), `.first()` when a label appears twice.
- Set database state with `execFileSync("mysql", [...args])`, never a quoted shell string, and reset
  it before each recording so the clips start from a known state.

## 4. Record one clip per feature

A clip tells one story in 10–35 seconds: open the page, do the thing, show the result. `record()`
in `browser.mjs` records at 2× scale, draws a visible cursor, hides the Next.js dev overlay, cuts the
page load from the start and writes an H.264 MP4 of about 1 MB. `example-clip.mjs` shows the shape.

- Name clips `NN-feature-name.mp4`, numbered in the order the description tells the story.
- Write them to `../pr-media/<issue-id>/` next to the repo (`MEDIA_DIR`). They never go into git.
- Record the phone layout as its own clip with `phone: true`.
- A failing step still leaves a video. After each recording run `node sheet.mjs NN-feature-name`
  and read the contact sheet it prints. Re-record until every frame shows the flow working.

## 5. Write the description

Fill in [`references/pr-description.md`](references/pr-description.md) and save it as
`../pr-media/<issue-id>/PR-DESCRIPTION.md`. It keeps the repo's PR template (summary, `Closes:`,
checklist) and replaces the screenshots section with:

- **How it fits together**: a small mermaid diagram and three bullets on the ideas a reviewer must
  hold in their head;
- **Walkthrough**: one section per clip, two to four lines on what to watch for, then
  `<!-- 📎 drop NN-feature-name.mp4 here -->`;
- **Authorization**, **Decisions to confirm**, **Left for later** (including the bugs found on
  `main`), **How to test** as a checklist that follows the clips, and **Checks** with the real test
  count.

## 6. Hand over

Tell the user, briefly:

- where the clips and the description are, and how long and large the clips are;
- the fixes you pushed, one line each;
- the bugs you found on `main`;
- what you changed locally: `.env.local` keys, database contents, servers still running.

Once the user approves the description:

```bash
gh pr view <n> --json body --jq .body > "$WORK/pr-<n>-body-before.md"
gh pr edit <n> --body-file ../pr-media/<issue-id>/PR-DESCRIPTION.md
```

The user then opens **Edit** on the description, drags each clip onto its `📎` marker (the markers
are HTML comments, visible only in the editor), deletes the marker and saves. Offer to stop the dev
server and containers afterwards.
