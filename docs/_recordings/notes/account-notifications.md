# account-notifications

- Account: pilot@cwa.local
- Start URL: /pilot

1. On Home, tap the avatar (**Your account**, top left).
2. The **Account** sheet slides up: avatar, "Piet Pilot", "pilot@cwa.local", then the **Profile** rows (Name, Birthday, Gender).
3. In **Language**, tap the row **Language · English**. A menu opens with English (checked), Dansk and Deutsch. It is closed again without a change. Hint under the row: "Emails and notifications come in this language too."
4. Scroll to **Notifications**. There are four switches:
   - **Push**: "A tap on your phone when something happens."
   - **Email**: "The same news, in your inbox."
   - **Messages**: "A buzz when someone writes — unless you already have that chat open."
   - **Messages by email**: "Only when your phone can't be reached: one mail with what you missed."
   - Footnote: "The essentials — a ride confirmed, a chapter answering — always reach you. These are the extras."
5. Tap **Email** (on), then **Push** (on). The header shows "Saving" and then "Saved now". A toast "Saved." offers **Undo**.
6. In **Calendar** ("Your rides, in the calendar you already use. Subscribe once and it keeps up by itself: new rides turn up, moved ones move, cancelled ones say so."), tap **Create my calendar link**.
7. Toast: "Your calendar link is ready." The section now shows the subscription URL, **Copy link**, "No calendar has picked it up yet. Calendars check for changes on their own schedule — usually within a few hours, on Google sometimes a day.", and "Add it to" Apple Calendar / Google Calendar / Outlook.com / Outlook for work or school.

Also in the sheet (not used): Passkeys ("Add a passkey"), "Something not working?" ("Report a problem"), and "Sign out or delete" ("Sign out", "Delete account").
Notes: in the dev recording the calendar URL starts with http://localhost:3000. Production shows the real domain. "Turn off" (with a confirmation) removes the link again.
