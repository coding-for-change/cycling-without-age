# CWA GO guides

User guides for pilots, riders, chapter admins and super/country admins, published with Mintlify from this folder (deployment `cycling-without-age`, content directory `docs/`, deploy branch `main`), live at https://docs.cwa.codingforchange.com. Colours mirror the app (`style.css`: warm-grey ground, white card, espresso accent).

- Preview: `npm run docs:dev` (http://localhost:3333 with `mint dev --port 3333`), check with `cd docs && mint broken-links` and `mint validate`.
- Pages live in `en/`, `de/` and `da/` with identical trees; navigation is `docs.json`. Writing rules: `_recordings/STYLE.md`.
- Videos are recorded from the running app by `_recordings/` (`npm run docs:record`), shared by all languages.

## Who sees what

Each page lists its readers in `audience:` (`pilot`, `rider`, `chapter-admin`, `country-admin`, `superadmin`; none = everyone). Mintlify hides pages carrying `groups:` from anyone not signed in to the docs, so the list stays under `audience:` until JWT sign-in is on.

To switch it on (needs the Mintlify Enterprise plan):

1. Mintlify dashboard → Access → Custom → JWT, login URL `https://cwa.codingforchange.com/docs-login`, generate the key.
2. Set `DOCS_HOST` and `DOCS_JWT_PRIVATE_KEY` (the PEM, newlines as `\n`) on the server. The app's Help page and account menu then sign readers in through `/docs-login`, which sends Mintlify the reader's groups.
3. Turn the lists into Mintlify groups and drop the temporary public flag on everything but Getting started:
   ```sh
   cd docs
   grep -rl '^audience:' en de da | xargs sed -i '' -e 's/^audience:/groups:/' -e '/^public: true$/d'
   ```
