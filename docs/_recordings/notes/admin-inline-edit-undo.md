# admin-inline-edit-undo

- Account: chapterAdmin (Anke Admin)
- Start URL: /admin/rides/<id> — detail of the pleasure ride Sat 17/10/2026 14:30–15:30 (Zugspitze, Erna Huber, Pernille Pending)

1. On the ride's detail page, the section "Note for pilots" — "Pilots read this before they set off." — shows the placeholder "Anything the pilots should know — e.g. ring at the side door" with a pencil icon.
2. Click the placeholder. It turns into a text box with a character counter (max 2000).
3. Type "Ring at the side door — Erna waits in the winter garden."
4. Press ⌘↵ (or click outside the box; Esc cancels the edit).
5. It saves straight away: top right of the header shows "Saving", then "✓ Saved now"; a toast "Saved." with "Undo" appears; History adds "You changed the note for pilots".
6. Click "Undo" in the toast. The note goes back to empty, the toast says "Put back.", and History records the change back.

Notes:
- The same in-place editing works for every field on a ride's detail page (Properties: model, date, start, duration, pilots needed; Where; Trishaws; Riders).
