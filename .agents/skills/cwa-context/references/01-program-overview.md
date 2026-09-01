# 01 — Program overview: who CWA is and what is being procured

> Source: *Main Document Request for Proposal-2* (RFP, issued 22 August 2025 by Cycling Without Age).
> Related: [02 — Glossary](02-glossary.md) · [04 — Ride models](04-ride-models.md) · [10 — Languages & markets](10-languages-and-markets.md)

## The organisation

Cycling Without Age (CWA) is a global non-profit founded in Copenhagen, Denmark in 2012. It keeps
elders engaged and active through volunteer-driven **trishaw rides**, on the principle that everyone
has the *"right to the wind in their hair"*.

| Fact | Value |
| --- | --- |
| Founded | 2012, Copenhagen |
| Countries | 41 (2 more expected) |
| Locations | ~3,500 — 2,100 Europe, 1,300 North America, 100 Australasia |
| Volunteers ("pilots") | 43,000+ trained |
| Rides delivered | 5,000,000+ |
| Typical site | A nursing home or senior facility; rides are free to residents |

**Five guiding principles** — generosity, slowness, storytelling, relationships, without age. These principles are also the reason product tone is warm and unhurried rather than transactional (see the `frontend` skill and `docs/BRAND.md`).

## The pre-study and the RFP

A pre-study ran across representative chapters to document processes, non-functional requirements and
reporting needs. Its output is the RFP and its appendices, which are the requirement source of truth:

| RFP appendix | Content | Mapped to |
| --- | --- | --- |
| a. Operating Model: Event, IPR, & Functional Rides | The seven-phase ride lifecycle, in prose + flowcharts | [05 — Ride lifecycle](05-ride-lifecycle.md) |
| b.i Organizational units | Global → Country → State → Chapter → Region → site | [02 — Glossary](02-glossary.md) |
| b.ii Languages and Countries | Phase 1 / Phase 2 rollout | [10 — Languages & markets](10-languages-and-markets.md) |
| b.iii Non-functional requirements | 27 NFRs | [08 — Non-functional requirements](08-non-functional-requirements.md) |
| b.iv Roles | 13 primary roles + aliases | [03 — Roles](03-roles.md) |
| b.v Glossary | 24 domain terms | [02 — Glossary](02-glossary.md) |
| b.vi All Processes | 106 numbered process requirements | — (IDs quoted inline where they matter) |
| b.vii Statistics and Reporting | 20 reports | [09 — Reporting](09-reporting-and-statistics.md) |
| c. Delivery Schedule | Dates; suppliers flag exceptions | — (not in this corpus) |
| d. Pleasure Ride Model — User Stories | Event/IPR stories | — (not supplied) |
| e. Functional Ride Model — User Stories | 33 stories, Antwerp chapter | [07 — Functional ride user stories](07-functional-ride-user-stories.md) |

## The one-paragraph model

CWA sorts rides into three categories — **Event Rides**, **Individual Pleasure Rides (IPR)** and
**Functional Rides** ([04](04-ride-models.md)) — and every one of them moves through the same seven
phases: Ride Request → Ride Scheduling → Ride Staffing → Ride Roster Booking → Pre-Ride Execution →
Ride Execution → Post-Ride Execution ([05](05-ride-lifecycle.md)). Almost every requirement in the
catalogue hangs off one of those seven phases, so that lifecycle is the spine of the data model.
