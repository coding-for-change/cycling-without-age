# super-chapter-invite-admin

- Account: country (Clara Country (DE))
- Start URL: /admin/members
- Duration: ~23 s

## Steps
1. Members page in the scope "All chapters in Deutschland".
2. Click the sidebar scope switcher ("Switch perspective or chapter") and pick **Augsburg – Haus am Park**. The breadcrumb reads "Augsburg – Haus am Park › Members". The empty chapter shows "No members yet. Approve a pilot request and the first name appears here." **Invite someone** appears top right.
3. Click **Invite someone**. A drawer titled **Invite someone** opens, subtitle "They get an email with a link to join Augsburg – Haus am Park."
4. **Their name**: "Anna Augsburg". **Email address**: "anna.augsburg@example.org". A preview avatar appears next to the fields.
5. **Role** has two checkable cards: **Chapter admin** ("Runs the chapter, approves new pilots and invites people.") and **Pilot** ("Does the pedalling and takes passengers out for a ride."). Pilot is ticked by default. Tick **Chapter admin** and untick **Pilot**.
6. Click **Send the invitation**. Toast: "Invitation sent to Anna Augsburg." Anna appears in "Everyone in the chapter" with the role badge **Chapter admin**.

## Rules / notes seen on screen
- Invite someone only shows when exactly one chapter is selected in the scope switcher.
- Several roles can be ticked at once (Chapter admin and/or Pilot).
- The invite creates the account right away and emails a join link.
- Who can invite (from the server guard `requireChapterAdmin`, not shown on screen): chapter admins of that chapter, plus the country admins and superadmins above it.
