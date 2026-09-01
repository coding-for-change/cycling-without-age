# cwa-context

The Cycling Without Age domain and the requirements from CWA's RFP for a global booking and
scheduling platform.

Lives in `.agents/skills/` (tool-agnostic, like the vendored Vercel skills) and is symlinked to
`.claude/skills/cwa-context` so Claude Code discovers it. Unlike the other entries in
`.agents/skills/` this one is **first-party and hand-written** — it is not in `skills-lock.json` and
must not be pruned by a skills sync.

No install step. `SKILL.md` loads automatically when work touches the CWA domain — rides, scheduling,
chapters, roles, reporting, i18n scope — and routes to the reference files.

| File | Content | Source |
| --- | --- | --- |
| `01-program-overview.md` | Who CWA is, the pre-study, the appendix map, the domain in one paragraph | RFP main document |
| `02-glossary.md` | 24 domain terms + the 6-level org hierarchy | Appendix b (Glossary, Organizational units) |
| `03-roles.md` | 13 roles with aliases and responsibilities | Appendix b (Roles) |
| `04-ride-models.md` | Event / Individual Pleasure / Functional rides compared | Appendix a + Glossary |
| `05-ride-lifecycle.md` | The 7 phases in full | Appendix a |
| `07-functional-ride-user-stories.md` | 33 user stories | Supplementary information e |
| `08-non-functional-requirements.md` | NFRs, anchored `#nfr-N` | Appendix b (Non-functional requirements) |
| `09-reporting-and-statistics.md` | 20 reports, anchored `#rep-N`, + the data they imply | Appendix b (Statistics and Reporting) |
| `10-languages-and-markets.md` | Phase 1 / Phase 2 countries and languages | Appendix b (Languages and Countries) |

Numbering has gaps because the corpus is deliberately partial — `06`, `11` and `12` are unused. Keep
the existing numbers stable; new files take the next free number rather than a renumber, so that
citations in commits and Linear issues keep resolving.

## Conventions

- **These files are transcriptions of CWA's RFP package** (22 August 2025). Change them only when CWA
  issues new source material, and say so in the commit.
- **Cite the source IDs**, not file line numbers: `NFR 7`, `Report 11`, and the process requirement
  IDs quoted inline (`ID 205`, `ID 115`). They are CWA's own numbers and survive re-scoping.
- **Nothing in the supplied appendices was graded by a supplier.** Every requirement is unclassified
  scope, not agreed scope.
- **Domain and requirements only.** UI rules live in the `frontend` skill and `docs/BRAND.md`; the
  layer law lives in `AGENTS.md` and `docs-internal/ARCHITECTURE.md`.

## Not in this corpus

- The full 106-row process catalogue from *Appendix b — All Processes*. Individual requirement IDs are
  still quoted inline where they matter (e.g. `ID 205` for functional-ride intake, `ID 115` for
  chapter role nomenclature).
- *Appendix c. Delivery Schedule* and *Supplementary information d. Pleasure Ride Model — User
  Stories* — never supplied to this repo.
- Current-state notes on this codebase. `AGENTS.md`, `docs-internal/ARCHITECTURE.md` and
  `docs-internal/architecture/dependency-graph.md` are the living source for that.
