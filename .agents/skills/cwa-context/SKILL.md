---
name: cwa-context
description: Use when working on anything domain-related in the Cycling Without Age (CWA GO) app — rides, ride requests, scheduling, staffing, rosters, chapters, roles, volunteers, pilots, passengers/riders, trishaws, care centers, waivers, cancellations, reporting/statistics, or i18n/market scope. Carries the RFP requirements: glossary, 13 roles, 3 ride models, the 7-phase ride lifecycle, non-functional requirements, 20 reports, and the phase 1/2 market scope. Load before designing a feature, naming a model, or estimating scope.
---

# CWA domain, requirements and context

Cycling Without Age is a global non-profit running volunteer trishaw rides for elders. This repo is a new booking
system, Coding for Change's answer to CWA's RFP for a global booking and scheduling platform. This
skill is the requirement corpus.

## Read this first

Two rules save the most rework:

1. **Use CWA's words.** Chapter, Ride, Ride Request, Ride Roster, Pilot, Rider, Care Center,
   Trishaw, Storage Location, Chapter Operating Calendar. They are defined in
   [02 — Glossary](references/02-glossary.md) and they are what CWA people say out loud. Don't invent
   synonyms; don't use a secondary alias as a model name.
2. **Everything is chapter-scoped and chapter-configurable.** A chapter is the tenancy boundary
   ([NFR 5](references/08-non-functional-requirements.md#nfr-5)), roles are configurable per chapter
   ([NFR 4](references/08-non-functional-requirements.md#nfr-4)), and most lifecycle steps say
   "if configured". Configuration is the substrate, not a later feature.

## Which file to open

| You are… | Read |
| --- | --- |
| New to the project | [01 — Program overview](references/01-program-overview.md), then [04](references/04-ride-models.md) and [05](references/05-ride-lifecycle.md) |
| Naming a model, table, enum or route | [02 — Glossary](references/02-glossary.md) |
| Touching permissions, RBAC, portals | [03 — Roles](references/03-roles.md) |
| Building anything ride-shaped | [04 — Ride models](references/04-ride-models.md) then [05 — Ride lifecycle](references/05-ride-lifecycle.md) |
| Working on functional (A→B) rides | [07 — Functional ride user stories](references/07-functional-ride-user-stories.md) |
| Making a platform/security/performance decision | [08 — Non-functional requirements](references/08-non-functional-requirements.md) |
| Adding a metric, export or dashboard | [09 — Reporting and statistics](references/09-reporting-and-statistics.md) |
| Doing i18n, locales, currency, GDPR scope | [10 — Languages and markets](references/10-languages-and-markets.md) |

## The whole domain in one screen

**Three ride models** ([04](references/04-ride-models.md)): **Event Rides** and **Individual Pleasure
Rides** start and end in the same place, usually a Care Center, and serve joy rather than transport.
**Functional Rides** go from A to B to accomplish a task, default to a round trip, and are booked and
matched quite differently.

**One seven-phase lifecycle** ([05](references/05-ride-lifecycle.md)) that all three share:

```
1 Ride Request → 2 Ride Scheduling → 3 Ride Staffing → 4 Ride Roster Booking
      → 5 Pre-Ride Execution → 6 Ride Execution → 7 Post-Ride Execution
```

**Thirteen roles** ([03](references/03-roles.md)), of which this codebase currently models three
(`admin`, `pilot`, `passenger`) plus superadmin and country admin.

**NFRs and 20 reports** ([08](references/08-non-functional-requirements.md),
[09](references/09-reporting-and-statistics.md)) carry stable IDs — cite them as `NFR 7`, `Report 11`.
Process requirement IDs from *Appendix b — All Processes* are quoted inline where they matter.

**Rollout**: phase 1 is January 2026, 16 countries, 10 languages; phase 2 is March 2027, 5 more
countries, 3 more languages ([10](references/10-languages-and-markets.md)).