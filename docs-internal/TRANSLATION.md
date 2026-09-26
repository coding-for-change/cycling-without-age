# Translation workflow

All user-facing text lives in `src/messages/{namespace}/{locale}.json` (ICU message format).
Git holds the source of truth, and people edit in Tolgee Cloud. Architecture is described in
`ARCHITECTURE.md` → Internationalization.

| Namespace | Used by |
|---|---|
| `app` | Every page and component |
| `email` | Emails, push, the in-app inbox, the calendar feed |
| `errors` | The root error screen and the "tell us what happened" drawer |

## Message format

- Placeholders: `"Joined {date}"`. Every placeholder must be given a value.
- Counts: `"{count, plural, =0 {No trishaws} one {1 trishaw} other {# trishaws}}"`. Each language
  lists the categories it needs (Polish needs `few` and `many`); `#` is the formatted number.
- Lists are objects keyed `"1"`, `"2"`, … and read in order.
- A literal `{` or `}` is written `'{'`. An apostrophe before plain text needs nothing.

`src/lib/i18n/messages.test.ts` fails when a locale misses a key, has an extra one, uses
different placeholders than English, lacks a plural category, or doesn't parse.

## Tone

- German: Sie-form for passenger-facing copy, du-form for pilots and volunteers. The calendar feed
  avoids both. Danish: informal. See `BRAND.md`.
- These notes also go into the Tolgee project description, so translators see them.

## Adding or changing text as a developer

1. Add the key to `src/messages/<namespace>/en.json` and, with a first translation, to every
   other locale file (the type check and the test demand it).
2. Merge to `main`. That's the whole step: the sync workflow pushes the keys to Tolgee.

## Automatic sync (`.github/workflows/i18n-sync.yml`)

| Job | Trigger | What it does |
|---|---|---|
| Push | A merge to `main` that touches `src/messages/**` | Checks the messages, then `tolgee push --remove-other-keys`. New keys appear in Tolgee, and keys deleted in git are deleted in Tolgee along with their translations. Translations already edited in Tolgee are kept (`forceMode: KEEP`), so a changed English text in git doesn't overwrite a newer one from Tolgee. |
| Pull | Every night at 03:00 UTC, or **Run workflow** by hand | `tolgee pull`, Prettier, then type check and tests. If anything changed, it opens or updates one PR from `i18n/tolgee-sync`. |

Review the sync PR's wording, then merge it. A job that fails means Tolgee holds something the
app can't use, such as broken ICU, a deleted placeholder or a missing plural form. Fix it in
Tolgee and re-run the job. GitHub doesn't start the CI workflow for PRs a bot opens, which is
why the pull job runs the checks itself.

The workflow reads `TOLGEE_API_KEY` from the vault: a project API key with the `translations.view`,
`translations.edit`, `keys.edit` and `keys.delete` scopes.

## Running a sync by hand

`npm run i18n:pull` and `npm run i18n:push` do the same with the key in `.env.local`. The local
push never deletes keys. Deleting only happens from `main`, so a branch that's behind can't remove
keys another branch just added.

## Translator mode (in-context editing)

For someone who edits texts directly on the site:

1. Run the **Deploy Feature Branch** workflow with **translator_mode** ticked. The build gets
   `NEXT_PUBLIC_TRANSLATOR_MODE=1`, and the server gets `TOLGEE_API_KEY` / `TOLGEE_PROJECT_ID`
   from the vault. The vault key only needs `translations.view`.
2. The translator installs the **Tolgee Tools** extension (Chrome or Firefox), opens the feature
   URL, and enters their own personal API key in the extension.
3. They hold **Alt** (⌥ on a Mac), move the mouse over a text and click it. The first Alt press
   on a page loads the editor, which takes about a second. Loading waits for that press because
   Tolgee rewrites the page's text, and doing that before React has finished hydrating breaks the
   page. The Tolgee editor opens with all
   languages side by side, and their edit is saved to Tolgee right away.
4. Reloading the page shows the edit, because in this mode the server reads Tolgee live.
   Components cached with `"use cache: private"` can take up to five minutes to update.
5. The nightly sync PR picks up their edits. To get them sooner, run the **Tolgee Sync** workflow
   by hand.

Known limits in translator mode:
- Emails can't be edited in context; edit them in the Tolgee web editor.
- Confirmations that compare typed input with a message (the typed `DELETE`) don't accept input,
  because the message carries the invisible marker.
- Pages are heavier, because every text carries its key.

Production is never in translator mode: `deploy.yml` doesn't set the flag, production builds
compile the code path away, and the server refuses it when `SENTRY_ENVIRONMENT=production`.

## Adding a language

1. Add the tag to `locales` and `LOCALE_LABELS` in `src/lib/i18n/locales.ts` (its own name for
   itself, e.g. "Polski").
2. Add the language in Tolgee, let machine translation pre-fill it, and have a person review it.
3. `npm run i18n:pull`, then import the new files next to the others in
   `src/lib/i18n/messages.ts`, `src/emails/strings/index.ts`, `src/lib/i18n/error-strings.ts` and
   `src/instrumentation-client.ts`.
4. `npm test`: the message test checks the new plural categories.
5. Check `src/lib/format.ts` (notation locales) if the market needs a new date or number format.
