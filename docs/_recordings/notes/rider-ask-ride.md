# rider-ask-ride

- Account: new.rider.docs@cwa.local (Rosa Rider, from rider-join-qr; no rides yet)
- Start URL: /passenger

1. Home: "Hi Rosa", "Your next ride starts here.", the **Book a ride** button, and "Next ride": "Nothing booked yet. When you book a ride, the day, the time and the pilot who's coming to collect you land here."
2. Tap **Book a ride**. It opens "My rides".
3. "My rides" shows "Upcoming events" (the bookable event "Ausfahrt in den Englischen Garten · 6 seats left") and, with no rides planned, the empty state: "Nothing booked yet. Once your chapter opens booking, this is where your rides wait — the day, the time, and the pilot who rings the bell."

What a rider sees when the chapter has set a reply-to email (München has not, so it is not in the clip):
- Heading "No rides planned right now", card **Ask München – Seniorenheim Sonnenhof for a ride**: "Write a few lines to the team: when you would like to go out, and where to. They'll find a day, a time and a pilot for you." The button "Write" opens an email to the chapter (subject "A ride with Cycling Without Age"), and the address is shown as text next to it.
- Admins turn this on with the chapter's reply-to email in the chapter settings (`chapter_settings.replyToEmail`).
- Ride requests themselves are not in the app yet. /join/<slug> "Book a ride" ends with "Ride booking is coming soon — nothing has been sent yet."
