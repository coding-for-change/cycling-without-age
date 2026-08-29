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

## CI/CD

- `ci.yml` — on push/PR to `main`: format check, lint, build.
- `deploy.yml` — on push to `main`: builds the Docker image, pushes it to `registry.infra.codingforchange.com/cwa`, and deploys to the Hetzner server (`/var/www/cwa`, host port 3001, Caddy serves cwa.codingforchange.com). Migrations run on container start (`prisma migrate deploy`).
- `deploy-feature.yml` — manual (`workflow_dispatch`): deploys the selected branch to `https://<branch>.cwa.codingforchange.com` with its own MySQL container.

The only GitHub Actions secret is `ANSIBLE_VAULT_PASSWORD`. All other secrets live encrypted in [.config/secrets.yml](.config/secrets.yml) (Ansible Vault, inline `!vault` values — safe to commit). Non-secret env values (`NEXT_PUBLIC_APP_URL`) are hardcoded in the workflows.

Prod database: shared MySQL on the host, database `application_cwa_prod` (user `application_cwa_prod`, managed in the coding-for-change-infra repo), reached from the container via `host.docker.internal`.
