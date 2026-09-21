#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"
preflight

ui_steps() {
  cat <<MSG

   Create it by hand instead (2 minutes):
     1. https://$ORG.sentry.io/insights/uptime/  ->  Create Uptime Monitor
     2. Project      $WEB
        Environment  $ALERT_ENVIRONMENT
        URL          $HEALTH_URL
        Method       GET
        Interval     1 minute
        Timeout      10000 ms
        Owner        #$TEAM
     3. Save. The monitor fails on any non-2xx, so the 503 that /api/health
        returns when the DB or Redis check fails is what pages.
MSG
}

heading "Uptime monitor for $HEALTH_URL"

if ! api_get "/api/0/organizations/$ORG/uptime/" || ! api_ok; then
  warn "cannot list uptime monitors (HTTP $API_STATUS) — the endpoint is not public in this region"
  ui_steps
  exit 0
fi

if printf '%s' "$API_BODY" | jq -e --arg url "$HEALTH_URL" '[.[]? | select(.url == $url)] | length > 0' >/dev/null 2>&1; then
  say "a monitor for $HEALTH_URL already exists"
else
  owner="$(team_id || true)"
  body="$(jq -cn \
    --arg url "$HEALTH_URL" \
    --arg environment "$ALERT_ENVIRONMENT" \
    --arg owner "${owner:+team:$owner}" '{
      name: "CWA web health",
      url: $url,
      environment: $environment,
      intervalSeconds: 60,
      timeoutMs: 10000,
      method: "GET",
      headers: [],
      traceSampling: false
    } + (if $owner == "" then {} else { owner: $owner } end)')"
  if api POST "/api/0/projects/$ORG/$WEB/uptime/" "$body" && api_ok; then
    applied "uptime monitor created"
  else
    warn "the uptime API rejected the request (HTTP $API_STATUS) $API_BODY"
    warn "this path is not in 'sentry schema' — treat it as unsupported"
    ui_steps
  fi
fi

heading "Cron monitors (created by the worker SDK on its first check-in)"

cat <<MSG
   Expected in $WORKER after one worker run:
     sweep          interval 1 min   margin 2    max runtime 5    failure threshold 3
     prune-devices  0 4 * * *        margin 10   max runtime 30   failure threshold 1
     prune-chat     0 3 * * *        margin 10   max runtime 30   failure threshold 1
   All UTC. Verify with:
     sentry monitor list "$ORG/$WORKER"
MSG

if "$SENTRY_BIN" monitor list "$ORG/$WORKER" --json >/tmp/cwa-monitors.$$ 2>/dev/null; then
  count="$(jq -r '[.data[]?] | length' </tmp/cwa-monitors.$$ 2>/dev/null || echo 0)"
  say "currently $count monitor(s) in $WORKER"
  jq -r '.data[]? | "     \(.slug)\t\(.status)"' </tmp/cwa-monitors.$$ 2>/dev/null || true
  rm -f /tmp/cwa-monitors.$$
else
  say "no monitors yet — the worker has not checked in"
fi
