#!/usr/bin/env bash
set -euo pipefail

SENTRY_BIN="${SENTRY_BIN:-sentry}"

ORG="${SENTRY_ORG:-codingforchange}"
TEAM="${SENTRY_TEAM:-jakob-landbrecht-team}"

WEB="${SENTRY_PROJECT_WEB:-cycling-without-age}"
WORKER="${SENTRY_PROJECT_WORKER:-cwa-worker}"
IOS="${SENTRY_PROJECT_IOS:-cwa-ios}"
ANDROID="${SENTRY_PROJECT_ANDROID:-cwa-android}"

WEB_PLATFORM="javascript-nextjs"
WORKER_PLATFORM="node"
IOS_PLATFORM="apple-ios"
ANDROID_PLATFORM="android"

DRY_RUN="${DRY_RUN:-0}"

ALERT_ENVIRONMENT="${CWA_ALERT_ENVIRONMENT:-production}"
HIDDEN_ENVIRONMENT="${CWA_HIDDEN_ENVIRONMENT:-development}"
SLACK_CHANNEL_CRITICAL="${CWA_SLACK_CRITICAL:-cwa-alerts-critical}"
SLACK_CHANNEL_WARNING="${CWA_SLACK_WARNING:-cwa-alerts}"

HEALTH_URL="${CWA_HEALTH_URL:-https://cwa.codingforchange.com/api/health}"
GIT_REPO="${CWA_GIT_REPO:-coding-for-change/cycling-without-age}"
GIT_DEFAULT_BRANCH="${CWA_GIT_DEFAULT_BRANCH:-main}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

API_STATUS=""
API_BODY=""
SLACK_ID=""

heading() { printf '\n== %s\n' "$*"; }
say() { printf '   %s\n' "$*"; }
warn() { printf '   ! %s\n' "$*" >&2; }
fail() { printf '   x %s\n' "$*" >&2; exit 1; }

need() {
  command -v "$1" >/dev/null 2>&1 || fail "missing required binary: $1"
}

preflight() {
  need "$SENTRY_BIN"
  need jq
}

api() {
  local method="$1" path="$2" body="${3-}"
  API_STATUS=""
  API_BODY=""
  if [ "$method" != "GET" ] && [ "$DRY_RUN" = "1" ]; then
    printf '   [dry-run] %s %s %s\n' "$method" "$path" "${body:-<no body>}"
    API_STATUS="000"
    API_BODY="null"
    return 0
  fi
  local -a cmd=("$SENTRY_BIN" api "$path" -X "$method" --json)
  if [ -n "$body" ]; then cmd+=(-d "$body"); fi
  local out
  out="$("${cmd[@]}" 2>&1)" || true
  API_STATUS="$(printf '%s' "$out" | jq -r '.status // empty' 2>/dev/null || true)"
  if [ -z "$API_STATUS" ]; then
    warn "unparseable response for $method $path"
    printf '%s\n' "$out" >&2
    return 1
  fi
  API_BODY="$(printf '%s' "$out" | jq -c '.body' 2>/dev/null || printf 'null')"
  return 0
}

api_ok() { case "$API_STATUS" in 2*|000) return 0 ;; *) return 1 ;; esac; }

applied() { [ "$API_STATUS" = "000" ] || say "$*"; }

api_get() { api GET "$@"; }

sentry_run() {
  if [ "$DRY_RUN" = "1" ]; then
    printf '   [dry-run] %s --dry-run\n' "$*"
    "$@" --dry-run
  else
    "$@"
  fi
}

sentry_run_undryable() {
  if [ "$DRY_RUN" = "1" ]; then
    printf '   [dry-run] would run: %s\n' "$*"
    return 0
  fi
  "$@"
}

project_platform_pairs() {
  printf '%s %s\n' "$WEB" "$WEB_PLATFORM"
  printf '%s %s\n' "$WORKER" "$WORKER_PLATFORM"
  printf '%s %s\n' "$IOS" "$IOS_PLATFORM"
  printf '%s %s\n' "$ANDROID" "$ANDROID_PLATFORM"
}

all_projects() { printf '%s\n%s\n%s\n%s\n' "$WEB" "$WORKER" "$IOS" "$ANDROID"; }

project_exists() {
  "$SENTRY_BIN" project view "$ORG/$1" --json >/dev/null 2>&1
}

team_id() {
  api_get "/api/0/organizations/$ORG/teams/" >/dev/null || return 1
  printf '%s' "$API_BODY" | jq -r --arg slug "$TEAM" '.[] | select(.slug == $slug) | .id' | head -1
}

error_detector_id() {
  api_get "/api/0/organizations/$ORG/detectors/?project=$1&query=type:error" >/dev/null || return 1
  printf '%s' "$API_BODY" | jq -r '.[0].id // empty'
}

slack_integration_id() {
  api_get "/api/0/organizations/$ORG/integrations/?provider_key=slack" >/dev/null || return 1
  printf '%s' "$API_BODY" | jq -r '[.[] | select(.status == "active")][0].id // empty'
}

require_slack() {
  SLACK_ID="${SENTRY_SLACK_INTEGRATION_ID:-$(slack_integration_id || true)}"
  if [ -n "$SLACK_ID" ]; then
    say "Slack integration id $SLACK_ID"
    return 0
  fi
  cat >&2 <<MSG
   ! Slack is not connected to the Sentry org "$ORG" — skipping every Slack-routed alert.
     Connect it once, by hand:
       1. https://$ORG.sentry.io/settings/integrations/slack/ -> Add Workspace -> authorise
       2. In Slack: /invite @Sentry in #$SLACK_CHANNEL_CRITICAL and in #$SLACK_CHANNEL_WARNING
       3. Re-run: ./scripts/sentry/20-alerts.sh
MSG
  return 1
}

slack_action() {
  jq -cn --arg id "$SLACK_ID" --arg channel "$1" '{
    type: "slack",
    integrationId: $id,
    data: {},
    config: { targetType: "specific", targetIdentifier: "", targetDisplay: $channel }
  }'
}

issue_rule_exists() {
  "$SENTRY_BIN" alert issues list "$ORG/$1" --json --limit 100 2>/dev/null \
    | jq -e --arg name "$2" '[.data[]? | select(.name == $name)] | length > 0' >/dev/null 2>&1
}

metric_rule_exists() {
  "$SENTRY_BIN" alert metrics list "$ORG/" --json --limit 100 2>/dev/null \
    | jq -e --arg name "$1" '[.data[]? | select(.name == $name)] | length > 0' >/dev/null 2>&1
}

dashboard_exists() {
  "$SENTRY_BIN" dashboard list "$ORG/" --json --limit 100 2>/dev/null \
    | jq -e --arg title "$1" '[.data[]? | select(.title == $title)] | length > 0' >/dev/null 2>&1
}
