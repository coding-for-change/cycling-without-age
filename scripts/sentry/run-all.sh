#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export DRY_RUN="${DRY_RUN:-0}"

if [ "$DRY_RUN" = "1" ]; then
  printf '### DRY RUN — no Sentry object is created or changed\n'
fi

for script in 00-projects 10-scrubbing 20-alerts 30-dashboards 40-code-mappings 50-uptime; do
  printf '\n########## %s.sh\n' "$script"
  "$SCRIPT_DIR/$script.sh"
done

printf '\n########## done\n'
