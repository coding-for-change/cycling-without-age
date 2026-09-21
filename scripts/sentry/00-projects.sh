#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"
preflight

heading "Projects in $ORG (team $TEAM)"

while read -r slug platform; do
  [ -n "$slug" ] || continue
  if project_exists "$slug"; then
    say "$slug ($platform) already exists"
  else
    say "$slug ($platform) missing — creating"
    sentry_run "$SENTRY_BIN" project create "$ORG/$slug:$platform" --team "$TEAM"
  fi
done < <(project_platform_pairs)

heading "Public DSNs (copy into the vault / xcconfig — these are public, the auth token is not)"

while read -r slug; do
  [ -n "$slug" ] || continue
  if ! api_get "/api/0/projects/$ORG/$slug/keys/" || ! api_ok; then
    warn "$slug: no DSN yet (project not created — re-run without DRY_RUN)"
    continue
  fi
  printf '%s' "$API_BODY" \
    | jq -r --arg slug "$slug" '.[] | select(.isActive) | "   \($slug)\t\(.dsn.public)"'
done < <(all_projects)

cat <<MSG

   Vault keys:
     SENTRY_DSN_WEB        = $WEB
     NEXT_PUBLIC_SENTRY_DSN= $WEB (same value)
     SENTRY_DSN_WORKER     = $WORKER
     ios/App/Config/Sentry.xcconfig  SENTRY_DSN_IOS = $IOS
     android env / manifestPlaceholders sentryDsn = $ANDROID
MSG
