# admin-calendar-drag

- Account: chapterAdmin (Anke Admin)
- Start URL: /admin/rides (week calendar, week of Mon 12/10)

1. On the week calendar, press and drag downward in an empty spot — here Friday 16/10 from 15:00 to 16:30. A green outline follows the pointer and shows the span ("15:00 – 16:30").
2. Release. The "New ride" drawer opens with the date and time already filled in ("Friday 16 October 15:00 – 16:30", "Europe/Berlin · 1 hr 30 min"). Ride model defaults to "Event ride".
3. Press Esc — the drawer closes, nothing is saved.
4. Grab an existing ride (here the pleasure ride Sat 17/10 14:30, "München – Seniorenheim Sonnenhof · Zugspitze · 1 rider") and drag it down 1½ hours to 16:00. Release.
5. The ride jumps to the new time straight away and a toast says "Ride moved" with an "Undo" button.
6. Click "Undo". The ride goes back to 14:30 and the toast says "Ride moved back".

Notes:
- A single click (no drag) in an empty slot opens the drawer with a default-length slot at that time.
- Dragging works within the calendar's day band; a ride can be moved to another day in the same week by dragging sideways.
- Moving a ride changes its start and end (duration kept).
