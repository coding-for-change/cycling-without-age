# admin-settings-staffing

- Account: chapterAdmin (Anke Admin)
- Start URL: /admin/settings
- State after recording: lead time was set back to "2 days before" off-camera; "Pilots sign up themselves" is on.

1. "Settings" opens with the card "Join link": "Anyone who opens this link lands on your chapter's page and can join from there. Print the poster for the care home wall." It shows the link (here http://localhost:3000/join/muenchen — in production the chapter's own address), the buttons "Copy link" (toast "Link copied."), "Print the poster", "Save QR code as PNG", and the QR code.
2. Further down (not used in the clip): "Notifications" (switches "Someone joins the chapter", "Pilot applications buzz your phone", "Minor damage reaches you too"; "Reply-to address"; "A word of welcome") and "After the ride" (what pilots see when they finish a ride; "Markdown works: **bold**, lists, links.").
3. Scroll to "Staffing" — "How pilots find rides, and when you hear about a ride still short of pilots."
4. "Warn about unstaffed rides" — "Admins are told this long before a ride that still needs pilots. From then on pilots can't step back in the app and call you instead." Change it from "2 days before" to "3 days before" (options: 12 hours, 1 day, 2 days, 3 days, 7 days before).
5. It saves on its own: the card header shows "Saving" then "✓ Saved now", and a toast "Saved." with "Undo".
6. Switch "Pilots sign up themselves" ("Pilots see the rides still missing a pilot and take a seat without asking.") off — saved again ("Saved." toast) — and back on.

Notes:
- "Pilots per ride" (1–10) is the default for new rides; each ride can override it.
- There is no Save button on this page; every change is saved immediately and can be undone from the toast.
