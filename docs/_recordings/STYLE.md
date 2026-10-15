# Writing the CWA GO guides

Audience: volunteers. Many are retired, many read on a phone, most are in a hurry before a ride.

Voice
- Short, precise, human, friendly. Second person ("you"). No fluff, no marketing, no "simply", "just", "easily", "seamless".
- One idea per sentence. Most sentences under 15 words.
- Use the exact on-screen labels in **bold** (from the notes / src/messages/app/<locale>.json). Never invent labels.
- Explain the why in half a sentence only when a rule would otherwise feel arbitrary.

Page shape (MDX for Mintlify)
---
title: "Set up a country"                 # task-shaped, verb first
description: "Add a country and give it an admin."   # one line, shown under the title and in search
audience: ["superadmin"]                  # who may read it (see below); becomes `groups` once JWT is on, see docs/README.md
public: true                              # TEMPORARY until JWT auth is switched on; keep on every page
---

One sentence: what you get done and who can do it.

<video autoPlay muted loop playsInline className="w-full rounded-xl border border-gray-200 dark:border-gray-800" src="/videos/<slug>.mp4" />

## Steps            (or 2–3 task headings if the page covers 2–3 tasks)
1. Numbered steps, one action each, matching the video.

<Note>/<Tip>/<Warning>: at most two per page, only for rules that bite (limits, things that can't be undone, who gets notified).

Optional "## Good to know" with 2–4 bullets. No other sections. No "Conclusion", no "Next steps" lists. Link related pages inline with relative links (/en/pilots/stepping-back).

Audience (frontmatter `audience`, later `groups`)
- Getting started: omit audience (public to everyone).
- Pilots: ["pilot", "chapter-admin", "country-admin", "superadmin"]
- Riders: ["rider", "chapter-admin", "country-admin", "superadmin"]
- Chapter admins: ["chapter-admin", "country-admin", "superadmin"]
- Super & country admins: ["country-admin", "superadmin"], or ["superadmin"] for superadmin-only pages (then add `tag: "Superadmin"` to the frontmatter).

Do not document: pilot Calendar, Training, the admin Help page, chat mute/edit/reactions in the member app, a "completed" ride status, ride requests, CSV export. They don't exist or aren't finished.

Terms (EN): chapter, pilot, rider (passenger in admin screens: use the label shown), trishaw, ride, event, pool, storage location, staffing window.
DE/DA: use the app's own words from src/messages/app/de.json and da.json (e.g. DE "Ortsgruppe" for chapter, DA "afdeling"), and the labels exactly as the German/Danish UI shows them, even though the videos show the English UI.
