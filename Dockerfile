# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM mwader/static-ffmpeg:9.0.2-1@sha256:f5d100184884eb3e82b0eb14bb5ebf98da99826ac824989720297fb9ef21c822 AS ffmpeg

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
  npm ci --prefer-offline --no-audit --no-fund

FROM base AS prisma-version
COPY package-lock.json /tmp/
RUN node -p "require('/tmp/package-lock.json').packages['node_modules/prisma'].version" > /prisma-version

# Migrations run from the app container at start, with a CLI installed on its own so the
# layer only changes when Prisma does.
FROM base AS prisma-cli
WORKDIR /opt/prisma
COPY --from=prisma-version /prisma-version ./
RUN --mount=type=cache,target=/root/.npm \
  echo '{"private":true}' > package.json \
  && npm install --omit=dev --no-audit --no-fund --no-package-lock "prisma@$(cat prisma-version)" \
  && find node_modules \( -name '*.map' -o -name '*.d.ts' -o -name '*.d.mts' -o -name '*.d.cts' \) -delete \
  && rm -rf node_modules/prisma/prisma-client

FROM deps AS builder
COPY . .

RUN npx prisma generate

ARG NEXT_PUBLIC_APP_URL="https://cwa.codingforchange.com"
ARG NEXT_PUBLIC_MAPBOX_TOKEN=""
ARG SENTRY_RELEASE=""
ARG NEXT_PUBLIC_SENTRY_DSN=""
ARG NEXT_PUBLIC_SENTRY_ENVIRONMENT="production"
ARG NEXT_PUBLIC_TRANSLATOR_MODE=""
ARG NEXT_PUBLIC_TOLGEE_PROJECT_ID=""
ARG SENTRY_ORG=""
ARG SENTRY_PROJECT=""
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_MAPBOX_TOKEN=$NEXT_PUBLIC_MAPBOX_TOKEN
ENV SENTRY_RELEASE=$SENTRY_RELEASE
ENV NEXT_PUBLIC_SENTRY_RELEASE=$SENTRY_RELEASE
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_SENTRY_ENVIRONMENT=$NEXT_PUBLIC_SENTRY_ENVIRONMENT
ENV NEXT_PUBLIC_TRANSLATOR_MODE=$NEXT_PUBLIC_TRANSLATOR_MODE
ENV NEXT_PUBLIC_TOLGEE_PROJECT_ID=$NEXT_PUBLIC_TOLGEE_PROJECT_ID
ENV SENTRY_ORG=$SENTRY_ORG
ENV SENTRY_PROJECT=$SENTRY_PROJECT

RUN --mount=type=secret,id=sentry_token \
  SENTRY_AUTH_TOKEN="$(cat /run/secrets/sentry_token 2>/dev/null || true)" npm run build

# The queue worker ships in the same image as a second command.
RUN npm run build:worker && npm run build:seed

RUN node scripts/docker-runtime-deps.mjs .next/standalone worker.js worker-instrument.js seed.js \
  && mkdir -p /out/app/src/generated \
  && mv .next/standalone/node_modules /out/node_modules \
  && mv .next/standalone/server.js .next/standalone/package.json .next/standalone/.next /out/app/ \
  && mkdir -p /out/app/.next/cache \
  && mv .next/static /out/app/.next/static \
  && mv public prisma worker.js worker-instrument.js seed.js /out/app/ \
  && mkdir -p /out/app/src/messages \
  && mv src/messages/legal /out/app/src/messages/legal \
  && mv src/generated/prisma /out/app/src/generated/prisma \
  && find /out/app/src/generated/prisma -name '*.d.ts' -delete

FROM base AS runtime
WORKDIR /app

ENV NODE_ENV=production

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs --no-create-home nextjs

COPY --link --from=builder /out/node_modules ./node_modules
COPY --link --from=builder --chown=1001:1001 /out/app ./

ARG SENTRY_RELEASE=""
ENV SENTRY_RELEASE=$SENTRY_RELEASE
ENV NEXT_PUBLIC_SENTRY_RELEASE=$SENTRY_RELEASE

# Transcoding runs in its own image so the app image never carries ffmpeg.
FROM runtime AS media-worker

COPY --link --from=ffmpeg /ffmpeg /ffprobe /usr/local/bin/

ENV FFMPEG_PATH=/usr/local/bin/ffmpeg
ENV FFPROBE_PATH=/usr/local/bin/ffprobe
ENV WORKER_ROLE=media
ENV MEDIA_SCRATCH_DIR=/scratch

RUN mkdir -p /scratch && chown 1001:1001 /scratch

USER nextjs

EXPOSE 9464

CMD ["node", "--require", "./worker-instrument.js", "worker.js"]

FROM runtime AS runner

ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV PATH=/opt/prisma/node_modules/.bin:$PATH

COPY --link --from=prisma-cli /opt/prisma /opt/prisma

USER nextjs

EXPOSE 3000 9464

CMD ["sh", "-c", "prisma migrate deploy && exec node server.js"]
