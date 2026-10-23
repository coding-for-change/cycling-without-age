# rider-caretaker

- Account: new account new.carer.docs@cwa.local
- Start URL: /sign-in (location permission granted, device in central München)

1. Screen "What's your email or phone number?". Type `new.carer.docs@cwa.local` and tap **Continue**. Then type the 6-digit code from the email.
2. Screen "How would you like to take part?". Tap **I want to be a Passenger**.
3. Screen "Where should we pick you up?" with two tabs, **Care home** (selected) and **My own address**, the search "Chapter or city", and the chapters nearest first ("München – Seniorenheim Sonnenhof · 770 m away"). Tap **München – Seniorenheim Sonnenhof**, then **Next**.
4. Screen "2 quick agreements". Tick "I accept the terms of use." and the safety guidelines, then tap **Continue**.
5. Screen "A little about you". Leave the fields empty and tap the mint button **I'm creating this account for someone else to ride**.
6. A select appears: **Your relationship to them** (Carer / Son or daughter / Friend / Other / Partner / Another relative). Choose **Son or daughter**. The mint button now reads **Continue**. Tap it.
7. Screen "Create your passkey". Tap **Not now**.
8. Home: "Hi" (no name), "Book a ride", "Next ride" (empty), and "Your chapter".

What the app does NOT do (yet), so the guide should say so:
- Onboarding never asks for the rider's details (name, birthday) or the carer's own name. The account is only marked as "manages others" with the relationship (`src/use-cases/complete-onboarding-profile.ts`, `markManagesOthers`).
- The carer cannot add the person they book for in the app. A chapter admin links riders to the account (Admin → Passengers, "Add passenger" drawer). Once riders are linked, the carer sees "Upcoming events" and can book seats for them (see rider-book-event, where Carla Caretaker books for Inge and Walter).
