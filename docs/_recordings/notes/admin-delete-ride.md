# admin-delete-ride

- Account: chapterAdmin (Anke Admin)
- Start URL: /admin/rides/<id> — the pleasure ride Sat 17/10/2026 10:00 that was cancelled in admin-cancel-ride (now deleted).

1. The cancelled ride's detail page: title struck through, badge "Cancelled", box "Cancelled · Weather …". The header button is now "Delete ride" (trash icon) instead of "Cancel ride".
2. Click "Delete ride".
3. Dialog "Delete the ride on 17/10/2026 for good?" — "It disappears from the calendar and from every report. Riders, pilots and trishaws stay."
4. A red box lists what goes with it: "This also deletes, for good:" "1 rider booking", "1 pilot assignment", "4 history entries".
5. "Type DELETE-17-10-2026 to confirm": type exactly "DELETE-17-10-2026". The red "Delete ride" button stays disabled until the text matches. ("Cancel" backs out.)
6. Click "Delete ride".
7. Toast "The ride on 17/10/2026 was deleted." and you land on the Rides calendar; the 10:00 slot on Sat 17/10 is empty again.

Notes:
- The confirm word is scoped to the ride's date (DELETE-DD-MM-YYYY).
- Cancelled rides show "Cancelled — delete it to free the slot" on the calendar.
