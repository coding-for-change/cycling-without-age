# Cycling Without Age

Next.js 16 app with Prisma (MySQL), Tailwind CSS v4, and shadcn/ui. Deployed to https://cwa.codingforchange.com.

## Local development

```bash
cp .env.example .env.local   # local DB credentials
docker compose up -d --wait  # MySQL 8 on localhost:3307
npm install
npm run db:migrate           # apply Prisma migrations
npm run dev                  # http://localhost:3000
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run lint` | ESLint (incl. architecture boundaries) |
| `npm run format` / `npm run format:check` | Prettier |
| `npm run db:migrate` | `prisma migrate dev` against `.env.local` |
| `npm run db:push` | `prisma db push` against `.env.local` |

A pre-commit hook (husky + lint-staged) formats staged files with Prettier.

## Native apps (iOS / Android)

`ios/` and `android/` are thin [Capacitor](https://capacitorjs.com) shells: the WebView loads the
deployed site (`server.url` in [capacitor.config.ts](capacitor.config.ts)) — there is no static
export. Rules for native code live in [AGENTS.md](AGENTS.md) §7.

The Capacitor CLI needs Node ≥22; this repo's default is Node 20, so prefix cap commands:

```bash
PATH="/opt/homebrew/opt/node@22/bin:$PATH" npx cap sync
open ios/App/App.xcodeproj          # or: npx cap open ios
npx cap open android
```
### Testing local changes in the app

`server.url` is baked into the native projects at `cap copy`/`cap sync` time, so pointing the app
at your dev server means re-running copy with an override:

```bash
npm run dev                                                  # binds 0.0.0.0
PATH="/opt/homebrew/opt/node@22/bin:$PATH" \
  CAP_SERVER_URL=http://192.168.178.86:3000 npx cap copy ios  # your Mac's LAN IP
```

## Architecture

See [AGENTS.md](AGENTS.md) and [docs-internal/ARCHITECTURE.md](docs-internal/ARCHITECTURE.md). The layering is enforced by `eslint-plugin-boundaries`.


## License

[PolyForm Noncommercial 1.0.0](LICENSE.md) — source-available, not open source. Free for personal use and for charities, educational institutions, public research bodies, public health and safety organisations, environmental organisations, and government institutions, including CWA, every CWA chapter, and any municipality.

The Cycling Without Age name and logo are trademarks of Cycling Without Age and are not covered by this license. The logo artwork in `assets/` and the native app icons generated from it are copyright Cycling Without Age, used with permission, and carved out of the license — replace them with your own branding before deploying. See [NOTICE.md](NOTICE.md).

### Commercial use

Any other use — for example a for-profit care home operator running its own instance, or an agency selling hosting of it — needs a separate license. Write to info@codingforchange.com.
