#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"
preflight

heading "Slack integration"
if ! require_slack; then
  exit 0
fi

ACTION_CRITICAL="$(slack_action "$SLACK_CHANNEL_CRITICAL")"
ACTION_WARNING="$(slack_action "$SLACK_CHANNEL_WARNING")"

metric_action() {
  jq -cn --arg id "$SLACK_ID" --arg channel "#$1" '{
    type: "slack",
    targetType: "specific",
    targetIdentifier: $channel,
    integrationId: $id
  }'
}

metric_trigger() {
  jq -cn --arg label "$1" --argjson threshold "$2" --argjson action "$3" --argjson below "$4" '{
    label: $label,
    alertThreshold: $threshold,
    thresholdType: (if $below then 1 else 0 end),
    actions: [$action]
  }'
}

create_issue_rule() {
  local project="$1" name="$2" condition="$3" action="$4" frequency="$5"
  if issue_rule_exists "$project" "$name"; then
    say "$project: '$name' already exists"
    return 0
  fi
  sentry_run "$SENTRY_BIN" alert issues create "$ORG/$project" \
    --name "$name" \
    --condition "$condition" \
    --action "$action" \
    --frequency "$frequency" \
    --environment "$ALERT_ENVIRONMENT"
}

create_spike_rule() {
  local project="$1" name="Frequency spike (300% vs 1d)"
  if issue_rule_exists "$project" "$name"; then
    say "$project: '$name' already exists"
    return 0
  fi
  local detector
  detector="$(error_detector_id "$project")"
  if [ -z "$detector" ]; then
    warn "$project: no error detector found — skipping '$name'"
    return 0
  fi
  local body
  body="$(jq -cn \
    --arg name "$name" \
    --arg detector "$detector" \
    --arg environment "$ALERT_ENVIRONMENT" \
    --argjson action "$ACTION_WARNING" '{
      name: $name,
      detectorIds: [$detector],
      environment: $environment,
      config: { frequency: 60 },
      triggers: { logicType: "any-short", conditions: [] },
      actionFilters: [{
        logicType: "all",
        conditions: [{
          type: "event_frequency_percent",
          comparison: { value: 300, interval: "1h", comparisonInterval: "1d" },
          conditionResult: true
        }],
        actions: [$action]
      }]
    }')"
  if api POST "/api/0/organizations/$ORG/workflows/" "$body" && api_ok; then
    applied "$project: '$name' created"
  else
    warn "$project: '$name' failed (HTTP $API_STATUS) $API_BODY"
  fi
}

create_metric_rule() {
  local name="$1" project="$2" dataset="$3" aggregate="$4" query="$5" window="$6"
  shift 6
  if metric_rule_exists "$name"; then
    say "'$name' already exists"
    return 0
  fi
  local -a cmd=("$SENTRY_BIN" alert metrics create "$ORG"
    --name "$name" --query "$query" --aggregate "$aggregate"
    --dataset "$dataset" --time-window "$window" -p "$project")
  local trigger
  for trigger in "$@"; do cmd+=(--trigger "$trigger"); done
  sentry_run "${cmd[@]}"
}

heading "Issue alerts"

for project in "$WEB" "$WORKER" "$IOS" "$ANDROID"; do
  create_issue_rule "$project" "New high-priority issue" \
    '{"type":"new_high_priority_issue","comparison":true,"conditionResult":true}' \
    "$ACTION_CRITICAL" 5
  create_issue_rule "$project" "Regression" \
    '{"type":"regression_event","comparison":true,"conditionResult":true}' \
    "$ACTION_CRITICAL" 30
done

for project in "$WEB" "$WORKER"; do
  create_issue_rule "$project" "New issue" \
    '{"type":"first_seen_event","comparison":true,"conditionResult":true}' \
    "$ACTION_WARNING" 30
  create_spike_rule "$project"
done

heading "Metric alerts"

create_metric_rule "CWA Web - error volume" "$WEB" errors "count()" "event.type:error environment:$ALERT_ENVIRONMENT" 60 \
  "$(metric_trigger warning 30 "$(metric_action "$SLACK_CHANNEL_WARNING")" false)" \
  "$(metric_trigger critical 100 "$(metric_action "$SLACK_CHANNEL_CRITICAL")" false)"

create_metric_rule "CWA Web - p95 http.server" "$WEB" spans "p95(span.duration)" "span.op:http.server environment:$ALERT_ENVIRONMENT" 15 \
  "$(metric_trigger critical 800 "$(metric_action "$SLACK_CHANNEL_CRITICAL")" false)"

create_metric_rule "CWA Web - server action failure rate" "$WEB" spans "failure_rate()" "span.op:function.server_action environment:$ALERT_ENVIRONMENT" 15 \
  "$(metric_trigger critical 0.05 "$(metric_action "$SLACK_CHANNEL_CRITICAL")" false)"

create_metric_rule "CWA Worker - queue.process failure rate" "$WORKER" spans "failure_rate()" "span.op:queue.process environment:$ALERT_ENVIRONMENT" 15 \
  "$(metric_trigger critical 0.05 "$(metric_action "$SLACK_CHANNEL_CRITICAL")" false)"

create_metric_rule "CWA iOS - crash-free sessions" "$IOS" sessions "percentage(sessions_crashed, sessions)" "environment:$ALERT_ENVIRONMENT" 60 \
  "$(metric_trigger critical 99 "$(metric_action "$SLACK_CHANNEL_CRITICAL")" true)"

create_metric_rule "CWA Android - crash-free sessions" "$ANDROID" sessions "percentage(sessions_crashed, sessions)" "environment:$ALERT_ENVIRONMENT" 60 \
  "$(metric_trigger critical 99 "$(metric_action "$SLACK_CHANNEL_CRITICAL")" true)"

cat <<'MSG'

   Check the two crash-free rules in the UI after the first real run: the CLI has no
   rule-level threshold direction, so confirm they read "Below 99" and not "Above 99".
MSG
