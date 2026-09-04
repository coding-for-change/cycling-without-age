# 04 — The three ride models

CWA delivers three kinds of ride. They share one lifecycle ([05](05-ride-lifecycle.md)) but differ in
who requests, who books the roster, and whether there is a destination.

| | **Event Ride** | **Individual Pleasure Ride (IPR)** | **Functional Ride** |
| --- | --- | --- | --- |
| Purpose | Joy, community, no transport need | Joy, one rider | Accomplish a task — doctor, shopping, hairdresser, graveyard |
| Geometry | Starts and **ends at the same location** | Same-location | **From A to B**, round trip by default, one-way by exception |
| Typical origin | Care Center or public site | Care Center or residence | Rider's home / registered address |
| Requester | Care Center Coordinator, chapter staff, public | Rider or Care Center | Rider (client), possibly via an Intermediary |
| Roster | Many riders across a time window ("Multiple Ride Events") | Short roster | Effectively one booking party |
| Equipment | Trishaw / wheelchair bike, possibly transported by trailer | Same | Same, usually collected from a garage by the pilot |
| Money | Sometimes a $50–$100 appearance fee to the Care Center | Same | Sometimes ~€3/hour from the rider; fee kept by pilot **or** given to the chapter |
| Volunteer pay | **Never.** CWA volunteers are not compensated | Never | Never — but the pilot may keep the ride fee, and there is a *pilot payout* report ([09 #20](09-reporting-and-statistics.md)) |
| Model tag in Appendix b | `Event` | `Event` (shares the pleasure-ride model) | `Functional` |

Requirements tagged `Common` in Appendix b (All Processes) apply to all three.

## Event / Pleasure model — what makes it different

- **Hub and spoke.** One location, one time window, many rides in sequence off the same trishaw(s).
  Counting rule: two people on one trip = two rides ([02](02-glossary.md#ride-objects)).
- **Equipment may be co-located or transported.** Co-located means the trishaw already lives at the
  Care Center; transported means a Transporter tows a trailer from a Storage Location and back
  afterwards. This single flag branches Pre-Ride and Post-Ride Execution.
- **The roster is managed by an intermediary.** For Internal/Partner rides the Care Center
  Coordinator enrols riders and orders them on the Ride Roster. For Public rides, riders self-serve
  open ride slots on the public website and the ride closes when all slots are taken.
- **Unstaffed Pleasure Ride** is a real variant: CWA supplies equipment and training, a school or
  youth organisation supplies pilots, ambassadors and riders.
- **Ride Routes** are pre-prepared per care centre and handed to pilots ([09 #13](09-reporting-and-statistics.md)).

## Functional model — what makes it different

Documented in most depth by the Antwerp chapter (RiksjaRijden Antwerpen), see
[07](07-functional-ride-user-stories.md). The load-bearing differences:

1. **Pickup and drop-off are first-class fields.** Requirement ID 205: intake must capture pickup and
   drop-off, **default to a round trip** unless one-way is requested, default pickup from geolocation
   if enabled and otherwise from the user's registered address, suggest frequently used drop-offs —
   and **the system treats a round trip as two separate ride events in the Ride Request List.**
2. **Multi-channel intake.** Phone, mail and app all feed the same Ride Request List, with the app
   channel deliberately given more visibility (app = push, phone and email = pull).
3. **Accounts are optional but promoted.** The client chooses whether to create one; the system
   advertises the advantages. Personalised defaults (pickup, drop-off, bike type) only exist for
   account holders.
4. **Availability is a garage-radius problem.** Bike-type availability is checked across multiple
   garages, bounded by an admin-configured maximum range from garage to pickup location.
5. **Negotiation loop.** If the requested bike type is unavailable at the requested slot, the system
   offers another slot, or another bike type, and loops until confirmation.
6. **Two-stage confirmation.** The *reservation* (bike) can be confirmed while the *ride* is still
   unconfirmed pending a pilot. Matching pushes offers to pilots filtered by their profile; pilots
   grab rides in the app; unmatched rides raise an operator alert at, e.g., 72 h and 48 h.
7. **Contact-detail exchange on match** — the client gets the pilot's name and phone (for late
   cancellation only); the pilot gets the client's and/or the institution's phone.
8. **Bike-collection handover.** Final confirmation to the pilot carries garage access, bike number,
   lock, battery and accessories.
9. **Debrief is structured.** Ride, bike condition, donations received, cooperation with the
   institution, miscellaneous — feeding day reports for admins and feedback to the Intermediary.
10. **Money is closer to the surface**: post-paid trips per payer per month (invoicing) and pilot
    payouts per pilot per month are both named reports.

## Design consequences

- Model is a **property of the ride**, not of the chapter — a chapter can run all three.
- Ride Request → Ride is not 1:1. A recurring request produces many rides; a functional round trip
  produces exactly two.
- Anything named `Ride` in the codebase must be able to carry a destination and a return leg without
  a schema change; anything named `Roster` must work for both "twelve residents in an afternoon" and
  "one passenger to the doctor".
