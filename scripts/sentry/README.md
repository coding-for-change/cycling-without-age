# Sentry configuration as code

Idempotent bash that brings the Sentry org into the shape the observability plan
describes (A8). Nothing here is applied automatically — every script is run by hand,
in order, by someone with an authenticated `sentry` CLI.

```bash
DRY_RUN=1 ./scripts/sentry/run-all.sh   # show every call, change nothing
./scripts/sentry/run-all.sh             # apply
```

Re-running is safe: each script checks whether the object already exists (project,
alert rule name, dashboard title, uptime URL) and skips it. Settings PUTs (scrubbing,
ownership, hidden environment) are declarative — they overwrite with the same values.
The one thing re-running does **not** do is repair a dashboard whose widgets were
edited by hand: if `CWA Web` or `CWA Worker` exists, `30-dashboards.sh` leaves it alone.
Delete the dashboard to have it rebuilt.

## Prerequisites

1. **CLI** — `sentry` v0.45 on `PATH`, plus `jq`. Authenticate once with `sentry auth`
   (or export `SENTRY_AUTH_TOKEN`). The token needs `org:read`, `org:write`,
   `project:write`, `alerts:write`; `40-code-mappings.sh` additionally needs `org:ci`.
2. **Slack** — `20-alerts.sh` does nothing until Slack is connected:
   Org Settings → Integrations → Slack → Add Workspace, then `/invite @Sentry` in
   `#cwa-alerts-critical` and in `#cwa-alerts`. The script discovers the integration id
   itself; `SENTRY_SLACK_INTEGRATION_ID` overrides the lookup.
3. **Seer** — enable it once in Settings → Seer (not scriptable).
4. **Region** — the org is US-region. Every slug and DSN in these scripts is an env
   var, so a region move is a config change, not a rewrite.

## Configuration

Every value is an environment variable with the production default baked in:

| Variable | Default |
|---|---|
| `SENTRY_ORG` | `codingforchange` |
| `SENTRY_TEAM` | `jakob-landbrecht-team` |
| `SENTRY_PROJECT_WEB` / `_WORKER` / `_IOS` / `_ANDROID` | `cycling-without-age`, `cwa-worker`, `cwa-ios`, `cwa-android` |
| `CWA_ALERT_ENVIRONMENT` | `production` |
| `CWA_HIDDEN_ENVIRONMENT` | `development` |
| `CWA_SLACK_CRITICAL` / `CWA_SLACK_WARNING` | `cwa-alerts-critical`, `cwa-alerts` |
| `CWA_HEALTH_URL` | `https://cwa.codingforchange.com/api/health` |
| `CWA_GIT_REPO` / `CWA_GIT_DEFAULT_BRANCH` | `coding-for-change/cycling-without-age`, `main` |
| `DRY_RUN` | `0` |
| `SENTRY_BIN` | `sentry` |

## What each script does

### `lib.sh`
Shared settings and helpers. `api()` wraps `sentry api … --json` and leaves the HTTP
status in `API_STATUS` and the parsed body in `API_BODY`, so a 404 is a value rather
than a crash. `sentry_run` appends `--dry-run` to commands that support it;
`sentry_run_undryable` only prints them. `slack_integration_id` / `require_slack` gate
everything Slack-dependent.

### `00-projects.sh`
Creates any of the four projects that is missing (`sentry project create
"$ORG/<slug>:<platform>" --team "$TEAM"`) and prints every project's **public** DSN.
DSNs are public by design — the auth token is the secret and is never printed.

Copy the DSNs into:

| Where | Key |
|---|---|
| deploy vault | `SENTRY_DSN_WEB` (= `NEXT_PUBLIC_SENTRY_DSN`) |
| deploy vault | `SENTRY_DSN_WORKER` |
| deploy vault | `SENTRY_AUTH_TOKEN` (org auth token, created by hand) |
| `ios/App/Config/Sentry.xcconfig` (gitignored) | `SENTRY_DSN_IOS` |
| Android env → `manifestPlaceholders` | `sentryDsn` |

### `10-scrubbing.sh`
Per project: `dataScrubber`, `dataScrubberDefaults`, `scrubIPAddresses` all on, and 26
`sensitiveFields` covering every CWA domain field that could carry PII (email, phone,
names, birth dates, address, coordinates, message text, OTP, tokens, cookies).
Then it hides the `development` environment and writes ownership rules
(`path:… #jakob-landbrecht-team`, scoped per project: `src/app|features|components|lib`
for web, `src/worker|use-cases|lib` for the worker, `ios/**` and `android/**` for the
shells).

The hidden-environment call 404s until the first event from that environment arrives —
the script says so and carries on.

### `20-alerts.sh` — needs Slack
Issue alerts (workflow engine, one per project):

| Rule | Projects | Trigger | Channel | Frequency |
|---|---|---|---|---|
| New high-priority issue | all four | `new_high_priority_issue` | critical | 5 min |
| Regression | all four | `regression_event` | critical | 30 min |
| New issue | web, worker | `first_seen_event` | warnings | 30 min |
| Frequency spike (300% vs 1d) | web, worker | — | warnings | 60 min |

The spike rule is the one that cannot go through `sentry alert issues create`:
`event_frequency_percent` is an *action filter*, not a trigger, and the workflow engine
has no `every_event` trigger, so the script POSTs the workflow directly with an empty
trigger condition list (which matches every event) and the frequency filter attached to
the action. The error detector id it binds to comes from
`GET /organizations/$ORG/detectors/?project=<slug>&query=type:error`, exactly as the CLI
resolves it.

Metric alerts (org-scoped; the CLI translates them into `metric_issue` detectors):

| Rule | Project | Dataset | Aggregate | Query | Window | Thresholds |
|---|---|---|---|---|---|---|
| CWA Web - error volume | web | `errors` | `count()` | `event.type:error environment:production` | 60 min | warn 30 / crit 100 |
| CWA Web - p95 http.server | web | `spans` | `p95(span.duration)` | `span.op:http.server …` | 15 min | crit 800 ms |
| CWA Web - server action failure rate | web | `spans` | `failure_rate()` | `span.op:function.server_action …` | 15 min | crit 0.05 |
| CWA Worker - queue.process failure rate | worker | `spans` | `failure_rate()` | `span.op:queue.process …` | 15 min | crit 0.05 |
| CWA iOS / Android - crash-free sessions | ios, android | `sessions` | `percentage(sessions_crashed, sessions)` | `environment:production` | 60 min | crit 99, **below** |

Three things to check in the UI after the first real (non-dry) run:

- **Threshold direction.** `sentry alert metrics create` has no rule-level
  `--threshold-type`, so the two crash-free rules carry `thresholdType: 1` inside the
  trigger. If Sentry ignores it, the rules will read "Above 99" — flip them to "Below".
- **Slack target.** The action is
  `{"type":"slack","config":{"targetType":"specific","targetIdentifier":"","targetDisplay":"cwa-alerts-critical"},"integrationId":"<id>"}`,
  the shape Sentry's own docs give for workflow Slack actions (channel name in
  `targetDisplay`, id resolved by Sentry). If a rule ends up unrouted, set
  `targetDisplay` to `#cwa-alerts-critical` — Sentry's resolver accepts both spellings.
- **Metric trigger shape.** The CLI passes `--trigger` objects straight through into the
  detector's `conditionGroup.conditions`. `metric_trigger` in `20-alerts.sh` is the one
  place that builds them; if the API rejects the legacy `{label, alertThreshold,
  actions}` shape, change that function to the workflow-engine condition shape
  (`{"type":"gt","comparison":<n>,"conditionResult":75}`) and re-run.

Sessions-dataset alerts take `--query "environment:production"` rather than
`--environment production`, because the CLI rejects an empty `--query`.

### `30-dashboards.sh`
`CWA Web` and `CWA Worker`, 6-column grid, rows 2+2+2 / 3+3 / 6.

- **CWA Web** — Errors (1 h), p95 http.server, Throughput · Errors by release, LCP p75 ·
  Slowest server actions.
- **CWA Worker** — Jobs processed (24 h), p95 queue.process, Worker errors (1 h) ·
  queue.process p95 by queue, Publish to process latency p95 · Failed jobs by queue.

Attribute keys to **adjust after the first spans arrive**: `messaging.destination.name`
and `messaging.message.receive.latency` are written by `src/lib/observability/queue.ts`,
so the two worker widgets stay empty until the worker ships spans; `span.description` is
what carries the server-action name. `span.op`, `span.duration`, `measurements.lcp`,
`release` and `environment` are confirmed Explore fields.

The plan's "replays" widget is not built: `sentry dashboard widget add` has no replays
dataset (spans, errors, metrics, logs, issue only). Use the Replays page instead.

### `40-code-mappings.sh` + `code-mappings.json`
Uploads the stack-trace-root → source-root mapping for the web and worker projects.
`sentry code-mappings upload` has no `--project` flag and auto-detects its target, so the
script pins it with `SENTRY_ORG` / `SENTRY_PROJECT` per call. Three roots are mapped:
`./` (Turbopack/Node relative frames), `app:///` (browser bundle frames) and `/app/`
(the container WORKDIR). The native projects symbolicate from dSYMs and ProGuard
mappings instead — nothing to map here.

### `50-uptime.sh`
Creates the uptime monitor on `/api/health` (60 s interval, 10 s timeout, GET,
environment `production`, owner `#jakob-landbrecht-team`). **The uptime API is not in
`sentry schema`** — `GET /organizations/$ORG/uptime/` answers 200 and
`GET /projects/$ORG/<project>/uptime/` answers "Method GET not allowed", which is how we
know the POST path exists, but the request body is unpublished. The script therefore
tries the POST and, if Sentry rejects it, prints the exact UI steps and exits 0.

It also prints the cron monitors to expect. Those are **not** created here — the worker
SDK upserts them on its first check-in (`withMonitor` in `runMaintenance`):

| Monitor | Schedule | Margin | Max runtime | Failure threshold |
|---|---|---|---|---|
| `sweep` | interval, 1 min | 2 | 5 | 3 |
| `prune-devices` | `0 4 * * *` | 10 | 30 | 1 |
| `prune-chat` | `0 3 * * *` | 10 | 30 | 1 |

All UTC. Verify with `sentry monitor list "$SENTRY_ORG/cwa-worker"` after one worker run.

### `run-all.sh`
Runs 00 → 50 in order and exports `DRY_RUN` to all of them.

## API endpoints used

| Endpoint | How it was verified |
|---|---|
| `POST /organizations/{org}/projects/{project}/detectors/` (via `sentry project create`, `sentry alert metrics create`) | `sentry schema detectors` |
| `GET /organizations/{org}/detectors/` | `sentry schema detectors`; live GET returns the per-project `error` + `issue_stream` detectors |
| `GET|POST /organizations/{org}/workflows/` (via `sentry alert issues …`) | `sentry schema --all`; live GET returns the three default email workflows |
| `GET /organizations/{org}/integrations/?provider_key=slack` | live GET (currently `[]`) |
| `GET /organizations/{org}/teams/` | live GET |
| `GET /projects/{org}/{project}/keys/` | live GET |
| `PUT /projects/{org}/{project}/` | `sentry schema projects` (`updateProject`) |
| `PUT /projects/{org}/{project}/environments/{environment}/` | `sentry schema --search environments` (`updateProjectEnvironment`) |
| `PUT /projects/{org}/{project}/ownership/` | `sentry schema --search ownership` (`updateProjectOwnership`); body shape from the live GET |
| `GET /organizations/{org}/uptime/`, `POST /projects/{org}/{project}/uptime/` | **not in the schema**; live GET 200 / method-not-allowed probe only |

`GET /projects/{org}/{project}/rules/configuration/` and
`GET /organizations/{org}/alert-rules/` both answer *"This API no longer exists"* — the
org is fully on the workflow engine, which is why condition and action ids come from the
live `workflows/` objects and from `sentry docs query` rather than from `rules/configuration/`.
