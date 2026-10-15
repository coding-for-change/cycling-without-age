# rider-join-qr

- Account: new account new.rider.docs@cwa.local (becomes "Rosa Rider"), signed out at start
- Start URL: /join/muenchen (the page the chapter's QR code and poster point to, /join/muenchen/poster)

1. The chapter page shows "Cycling Without Age", the heading "München – Seniorenheim Sonnenhof", "Seniorenheim Sonnenhof", and the chapter's welcome text. Then two cards:
   - **Come along for a ride**: "A volunteer does the pedalling. You sit at the front, at walking pace, with nothing between you and the street." with the button "Ride with this chapter"
   - **Do the pedalling**: "Pilots take neighbours out for an hour at a time. Ask to join and a chapter admin gets back to you, usually within a few days." with the button "Ask to pilot here"
   - Further down: "Book a ride" and "Ride with the app" (App Store / Google Play badges).
2. Scroll a little and tap **Ride with this chapter** (the "Come along for a ride" card).
3. Screen "What's your email or phone number?". Type `new.rider.docs@cwa.local` and tap **Continue**.
4. Screen "Enter your code". Type the 6-digit code from the email. It submits by itself.
5. The chapter and the role come from the QR link, so the role and location screens are skipped. Screen "Three quick agreements" with "You're joining München – Seniorenheim Sonnenhof." Tick all three:
   - "I understand that rides are provided by trained volunteers, and I agree to the safety guidelines of the chapter."
   - "I agree to receive email and push notifications for important messages."
   - "I agree to the storage and processing of my data. See the Imprint and the Data processing agreement."
   Tap **Continue**.
6. Screen "A little about you". Fill in First name `Rosa`, Last name `Rider`, Birthday (14 March 1938) and Gender **Female**, then tap **Continue**. (Under it is the mint button "I'm creating this account for someone else to ride", see rider-caretaker.)
7. Screen "Create your passkey". Tap **Not now**.
8. Rider Home: "Hi Rosa", "Your next ride starts here.", the **Book a ride** button, "Next ride" ("Nothing booked yet. When you book a ride, the day, the time and the pilot who's coming to collect you land here."), "Upcoming events" (bookable events of the chapter), and "Your chapter".

Notes:
- The QR preset is a cookie set by /join/<slug>/start?role=passenger. It also works if the person already has an account (they go straight to onboarding).
- Riders get three agreements (including safety). Pilots get two.
- The birthday shows as mm/dd/yyyy in the headless recording. On a real phone it follows the device's format.
