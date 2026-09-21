#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"
preflight

ENV_FILTER="environment:$ALERT_ENVIRONMENT"

widget() {
  local dashboard="$1" title="$2"
  shift 2
  sentry_run_undryable "$SENTRY_BIN" dashboard widget add "$ORG/" "$dashboard" "$title" "$@"
}

build_web() {
  local d="CWA Web"
  widget "$d" "Errors (1 h)" --display big_number --dataset errors -q count -w "$ENV_FILTER" -x 0 -y 0 --width 2 --height 2
  widget "$d" "p95 http.server" --display big_number --dataset spans -q p95:span.duration -w "span.op:http.server $ENV_FILTER" -x 2 -y 0 --width 2 --height 2
  widget "$d" "Throughput" --display big_number --dataset spans -q count -w "span.op:http.server $ENV_FILTER" -x 4 -y 0 --width 2 --height 2
  widget "$d" "Errors by release" --display line --dataset errors -q count -g release -w "$ENV_FILTER" -x 0 -y 2 --width 3 --height 2
  widget "$d" "LCP p75" --display line --dataset spans -q p75:measurements.lcp -w "$ENV_FILTER" -x 3 -y 2 --width 3 --height 2
  widget "$d" "Slowest server actions" --display table --dataset spans -q p95:span.duration -q count -g span.description -w "span.op:function.server_action $ENV_FILTER" -s "-p95:span.duration" -n 10 -x 0 -y 4 --width 6 --height 2
}

build_worker() {
  local d="CWA Worker"
  widget "$d" "Jobs processed (24 h)" --display big_number --dataset spans -q count -w "span.op:queue.process $ENV_FILTER" -x 0 -y 0 --width 2 --height 2
  widget "$d" "p95 queue.process" --display big_number --dataset spans -q p95:span.duration -w "span.op:queue.process $ENV_FILTER" -x 2 -y 0 --width 2 --height 2
  widget "$d" "Worker errors (1 h)" --display big_number --dataset errors -q count -w "$ENV_FILTER" -x 4 -y 0 --width 2 --height 2
  widget "$d" "queue.process p95 by queue" --display line --dataset spans -q p95:span.duration -g messaging.destination.name -w "span.op:queue.process $ENV_FILTER" -x 0 -y 2 --width 3 --height 2
  widget "$d" "Publish to process latency p95" --display line --dataset spans -q p95:messaging.message.receive.latency -w "span.op:queue.process $ENV_FILTER" -x 3 -y 2 --width 3 --height 2
  widget "$d" "Failed jobs by queue" --display table --dataset spans -q count -g messaging.destination.name -g span.description -w "span.op:queue.process span.status:internal_error $ENV_FILTER" --sort=-count -n 10 -x 0 -y 4 --width 6 --height 2
}

heading "Dashboards"

for entry in "CWA Web:build_web" "CWA Worker:build_worker"; do
  title="${entry%%:*}"
  builder="${entry##*:}"
  if dashboard_exists "$title"; then
    say "'$title' already exists — leaving it untouched"
    continue
  fi
  say "creating '$title'"
  sentry_run_undryable "$SENTRY_BIN" dashboard create "$ORG/" "$title"
  "$builder"
done
