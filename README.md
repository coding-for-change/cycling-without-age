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

## Architecture

See [AGENTS.md](AGENTS.md) and [docs-internal/ARCHITECTURE.md](docs-internal/ARCHITECTURE.md). The layering is enforced by `eslint-plugin-boundaries`.

