# 07 — Functional Ride model: user stories

This is one chapter's account of how a functional ride actually runs. It is the most concrete
requirement document CWA supplied, and it is the reason the functional model needs a booking flow that
looks nothing like the pleasure-ride roster flow. A companion document exists for the pleasure model
(*Supplementary information d*) but was not supplied to this repo.

## Actors in this document

| Story actor | Maps to | Notes |
| --- | --- | --- |
| **Client** | Requester / prospective Rider | Potential passenger; may or may not have an account |
| **Passenger** | [Rider](03-roles.md) | The person actually carried |
| **Pilot** | [Pilot](03-roles.md) | Both potential (offered a ride) and effective (grabbed it) |
| **Admin** | [Scheduler](03-roles.md) / operator | Most stories are written from the admin's point of view as *system behaviour I want* |
| **Intermediary** | [Care Center Coordinator](03-roles.md) | Institutional client |

Read "As admin I want the system to…" as a **system requirement**, not a screen for an administrator.

## Intake and channels

1. As a **client** I want to book a ride through multiple channels: **phone, mail or app**.
2. As an **admin** I want the app channel to be given more visibility than the two other channels:
   **app = push, phone = pull, email = pull**.
3. As a **client** I want the **choice whether or not to create an account**.
4. As an **admin** I want the system to **promote accounts, pointing at the advantages**.
5. As an **admin** I want **return rides to be default**, and single rides to be the exception.

## Building the request

6. As a **client** I want to state **day and time** of the requested ride.
   *Nice to have: voice recognition.*
7. As a **client** I want to state my **pick-up location**. *Nice to have: geolocation.*
8. As an **admin** I want the system to **suggest a pick-up location** if the client has an account.
9. As a **client** I want to state my **drop-off location**.
10. As an **admin** I want the system to **suggest drop-off locations from previous bookings** for
    account holders. *Nice to have: last chosen drop-off suggested as default.*
11. As a **client** I want to **choose the bike type**.
12. As an **admin** I want the system to **suggest the bike type from the client's previous choices**
    for account holders. *Nice to have: last chosen bike type as default.*

## Availability and negotiation

13. As an **admin** I want the system to **check availability of the requested bike type for the
    requested time slot**:
    a. availability check **across multiple garages**;
    b. an admin-definable **maximum range from garage to pick-up location**, so distant garages are
       excluded from the check.
14. As an **admin** I want the system to either:
    a. **confirm** the request; or
    b. **suggest another time slot** for the requested bike type, until confirmation; or
    c. **suggest another bike type** for the requested time slot, until confirmation.
15. As an **admin** I want the system to **redirect the request back to story 6** when more bikes are
    needed — carrying the previous time slot and drop-off choices forward as defaults.
16. As an **admin** I want the system to:
    a. **confirm the reservation** *(the bike)*;
    b. **alert that the ride is not yet confirmed**, pending pilot availability.
17. As an **admin** I want the system to **split the request into 2 rides towards pilots** *(the
    outbound and the return leg — matching requirement ID 205, which
    puts both legs on the Ride Request List as separate ride events)*.

## Matching pilots

18. As an **admin** I want a **database of pilots and their characteristics**: days of the week
    available, **proximity to garages**, **experience with bike model**, and whether they are an
    **independent pilot or need a co-pilot**.
19. As an **admin** I want the system to **check whether the client has requests concerning pilots**
    (experience, …).
20. As an **admin** I want the system to **send the rides out to potential pilots**, selected on the
    basis of 18 and 19.
21. As a **pilot** I want to **receive ride offers that fit my profile**.
22. As a **pilot** I want to **grab ride(s) in the app**.
23. As an **admin** I want the system to **alert the operator on no-match** (e.g. 72 hours or 48 hours
    before the ride).
24. As an **admin** I want the system to **confirm matching rides simultaneously** to:
    a. **the client** — name and phone number of the pilot (**for late cancellation only**);
    b. **the pilot(s)** — the app shares the phone number of the client and/or the contact person at
       the institution.
25. As an **admin** I want the system to **send an alert to the operator in case of no-match**.
    *(Restates 23 — the source lists both.)*

## Reminders, changes, cancellations

26. As an **admin** I want the system to **send ride reminder(s) to the client** with pick-up time and
    pilot name (e.g. 24 hours before the ride).
27. **On cancellation** of the ride, as an admin I want the system to:
    a. **make the bike(s) available for new bookings**;
    b. **alert the pilot**.
28. **On alteration** of the ride, as an admin I want the system to:
    a. **redirect the client to story 6**;
    b. **make the initial bike(s) available for new bookings**;
    c. **alert the initial pilot**.
29. If the ride is **neither cancelled nor altered**, as an admin I want the system to **re-confirm the
    ride and details to the pilot**.

## Execution and debrief

30. As a **pilot receiving final confirmation**, I want **all information about picking up the bike**:
    garage and how to get access, bike number, bike lock, battery, accessories, …
31. As a **pilot**, I want to **check in my ride + the passengers at the start and check them out at
    the end**, plus complete the **debriefing** on:
    a. the ride;
    b. the condition of the bike;
    c. donations received;
    d. the cooperation, in case of an institutional ride;
    e. miscellaneous.
32. As an **admin** I want to receive:
    a. **day reports**, including story 30 *(sic — the source says 30; contextually the debrief of
       story 31)* for each ride;
    b. **statistics in our specific formats**.
33. As an **intermediary** I want to **receive debriefing feedback from rides within my organisation**.

---

## What these stories add beyond [Appendix a](05-ride-lifecycle.md)

| Capability | Stories | Not in the generic lifecycle because… |
| --- | --- | --- |
| Guest booking (no account) | 3, 4 | Appendix a assumes enrolment precedes every request |
| Personalised defaults from history | 8, 10, 12 | Pleasure rides book a slot, not a route |
| Garage-radius availability | 13 | Pleasure rides reserve equipment at a known location |
| Negotiation loop until confirmation | 14, 15 | Appendix a rejects or re-lists; it never counter-offers |
| Split reservation vs. ride confirmation | 16 | Pleasure rides confirm once |
| Round trip as two ride events | 17 | Pleasure rides start and end in the same place |
| Pilot profile matching + push offers | 18–22 | Appendix a posts open slots; it does not target them |
| No-match escalation with lead-time thresholds | 23, 25 | Appendix a has an unstaffed-ride notification but no 72/48 h ladder |
| Two-way contact-detail release on match | 24 | Pleasure rides have an on-site coordinator instead |
| Bike-collection handover pack | 30 | Pleasure-ride equipment is transported or co-located |
| Structured per-ride debrief | 31–33 | Appendix a's post-ride step is issues + surveys + donations |

**Rule of thumb:** if a functional-ride behaviour here conflicts with Appendix a, Appendix a describes
the common skeleton and this document describes the functional flesh. Build the skeleton so the flesh
fits — do not build the pleasure flow first and retrofit destinations.
