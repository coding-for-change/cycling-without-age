#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"
preflight

MAPPINGS="$SCRIPT_DIR/code-mappings.json"
[ -f "$MAPPINGS" ] || fail "missing $MAPPINGS"

heading "Code mappings ($GIT_REPO @ $GIT_DEFAULT_BRANCH)"

for project in "$WEB" "$WORKER"; do
  say "$project"
  sentry_run_undryable env SENTRY_ORG="$ORG" SENTRY_PROJECT="$project" \
    "$SENTRY_BIN" code-mappings upload "$MAPPINGS" \
    --repo "$GIT_REPO" --default-branch "$GIT_DEFAULT_BRANCH"
done

cat <<MSG

   Native projects use debug files, not code mappings:
     $IOS      dSYM upload from the Xcode release build phase
     $ANDROID  ProGuard mapping upload from the Sentry Android Gradle plugin
MSG
