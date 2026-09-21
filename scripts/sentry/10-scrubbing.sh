#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"
preflight

SENSITIVE_FIELDS='["email","phone","phoneNumber","msisdn","firstName","lastName","name","fullName","birthDate","dateOfBirth","address","street","postalCode","latitude","longitude","text","body","html","subject","otp","code","token","cookie","authorization","password","secret"]'

ownership_raw() {
  case "$1" in
    "$WEB")
      printf 'path:src/app/** #%s\npath:src/features/** #%s\npath:src/components/** #%s\npath:src/lib/** #%s\n' "$TEAM" "$TEAM" "$TEAM" "$TEAM" ;;
    "$WORKER")
      printf 'path:src/worker/** #%s\npath:src/use-cases/** #%s\npath:src/lib/** #%s\n' "$TEAM" "$TEAM" "$TEAM" ;;
    "$IOS")
      printf 'path:ios/** #%s\n' "$TEAM" ;;
    "$ANDROID")
      printf 'path:android/** #%s\n' "$TEAM" ;;
    *)
      printf 'path:src/** #%s\n' "$TEAM" ;;
  esac
}

heading "Data scrubbing and PII settings"

settings_body="$(jq -cn --argjson fields "$SENSITIVE_FIELDS" '{
  dataScrubber: true,
  dataScrubberDefaults: true,
  scrubIPAddresses: true,
  sensitiveFields: $fields,
  safeFields: []
}')"

while read -r slug; do
  [ -n "$slug" ] || continue
  if api PUT "/api/0/projects/$ORG/$slug/" "$settings_body" && api_ok; then
    applied "$slug: scrubbing on, $(printf '%s' "$SENSITIVE_FIELDS" | jq 'length') sensitive fields, scrubIPAddresses on"
  else
    warn "$slug: PUT project settings failed (HTTP $API_STATUS) $API_BODY"
  fi
done < <(all_projects)

heading "Hide the '$HIDDEN_ENVIRONMENT' environment"

while read -r slug; do
  [ -n "$slug" ] || continue
  if api PUT "/api/0/projects/$ORG/$slug/environments/$HIDDEN_ENVIRONMENT/" '{"isHidden":true}' && api_ok; then
    applied "$slug: '$HIDDEN_ENVIRONMENT' hidden"
  elif [ "$API_STATUS" = "404" ]; then
    say "$slug: no '$HIDDEN_ENVIRONMENT' environment yet — nothing to hide (re-run after the first event)"
  else
    warn "$slug: hiding '$HIDDEN_ENVIRONMENT' failed (HTTP $API_STATUS) $API_BODY"
  fi
done < <(all_projects)

heading "Ownership rules"

while read -r slug; do
  [ -n "$slug" ] || continue
  raw="$(ownership_raw "$slug")"
  body="$(jq -cn --arg raw "$raw" '{raw: $raw, fallthrough: true, autoAssignment: "Auto Assign to Issue Owner"}')"
  if api PUT "/api/0/projects/$ORG/$slug/ownership/" "$body" && api_ok; then
    applied "$slug: $(printf '%s' "$raw" | grep -c . ) ownership rule(s) -> #$TEAM"
  else
    warn "$slug: PUT ownership failed (HTTP $API_STATUS) $API_BODY"
  fi
done < <(all_projects)
