# 05 — The seven-phase ride lifecycle

Every ride — Event, IPR or Functional — passes through these seven phases. The process catalogue in
*Appendix b — All Processes* is organised by the same numbering, so a requirement's category tells
you which phase it belongs to.

```
1 Ride Request → 2 Ride Scheduling → 3 Ride Staffing → 4 Ride Roster Booking
      → 5 Pre-Ride Execution → 6 Ride Execution → 7 Post-Ride Execution
```

Two crosscutting truths before the detail:

- **Almost everything is chapter-configurable.** Validation criteria, notification intervals,
  reminder lead times, auto vs. manual scheduling, waiver text, role labels. Where the source says
  "if configured" it means a chapter-level setting must exist.
- **Two actors can do most things: a human role, or the system.** The catalogue's `Role` column is
  frequently `Automatic by System if configured (Chapter Option)`.

---

## 1. Ride Request

Collect information from Requesters via a **Ride Request Form** and assemble the **Ride Request List**
for scheduling.

- **A. Assumptions.** All chapter-specific Master Model data is pre-configured and ready: equipment,
  storage locations, ride locations, chapter operating calendar. Internal, Partner and Public websites
  are published with access to the Ride Request Forms.
- **B. log in check.** On a request the system first checks for a valid account.

- **C. Form completed.** The Internal, Partner or Public Requester fills in the Ride Request Form **as
  configured by the chapter**. A request may be for a single ride or multiple rides; a single trishaw
  or multiple trishaws; a one-time ride or **multiple recurring rides**. If the chapter has designated
  open blocks in the Chapter Operating Calendar, the requester can pick a ride block.
- **D. Chapter-specific validation.** If configured, validate automatically against chapter criteria:
  **lead time, resource conflicts, Chapter Operating Calendar conflicts**. On failure the client is
  given the conflict reason and asked to modify the request.
- **E. Add to Ride Request List.** On pass, the request joins the list for Ride Scheduling.

Functional-ride specifics (pickup/drop-off, round trip default, multi-channel intake) are in
[04](04-ride-models.md#functional-model--what-makes-it-different) and [07](07-functional-ride-user-stories.md).

---

## 2. Ride Scheduling

Turn a request into a Ride that exists in the system and can accept volunteers and riders.

- **A. Assumptions.** The chapter's Ride Request List has requests to process. Partner and volunteer
  enrolments are complete, including contact information, waivers and **availability data**.
- **B. Scheduling method** — per ride type, per chapter configuration:
  - **a. Scheduler method.** A Chapter Scheduler determines Date(s), Time, Duration, Ride Location,
    Resource Needs and Volunteer Role Needs. The entry is checked against existing availability; if
    conflict-free the ride is added to the Chapter Ride Calendar.
  - **b. Auto method.** The Ride Location carries **default resources and required volunteer roles**.
    Given Date(s), Time and Duration the system checks resource availability and adds the ride.
    If none: **the request is rejected and the requester notified.** If configured, the request can be
    sent back for a new request *or* re-listed on the scheduler's list for oversight. If not
    re-listed, **the request is terminated.**
- **C. Commit resources, volunteer needs and rosters.** Required resources (trishaws, bikes,
  wheelchair bikes, trailers…) are **reserved for the ride and no longer available to others**.
  Volunteer Role Slots are created for the date(s), time and duration. **Empty Ride Rosters** are
  created for the ride date(s).
- **D. Notification to volunteers.** If configured, announce the ride's volunteer role needs —
  immediately or at a chapter-defined date.
- **E. Websites updated.** Volunteer, Partner Booking and Public Booking websites all show the ride;
  Ride Rosters are exposed through the relevant booking websites.
- **F. Complete.** The ride awaits volunteers and riders.

---

## 3. Ride Staffing

Fill the required Volunteer Roles. Some chapters assign centrally; others post openings and let
volunteers self-serve. **Both must be supported.**

- **A. Assumptions.** The ride is on the calendar with required volunteer roles identified.
- **B. Volunteer commitment:**
  - **a. Scheduler assignment.** The scheduler consults the **Volunteer Availability Roster** and picks
    people matching day of week, time, location and duration, then applies them to the required roles.
  - **b. Volunteer sign-up.** Unstaffed roles appear as **Open** on the Volunteer Website calendar;
    volunteers sign up to one or more roles within a ride.
- **C. Confirmation.** Notifications confirm the commitment with the ride details.
- **D. Pre-event staffing check.** At a chapter-defined interval before the ride, if the ride is not
  fully staffed the **scheduler is notified of the unstaffed roles** and can assign or recruit.
- **E. Ride staffed.** All required roles filled; ready to execute.

---

## 4. Ride Roster Booking

Book riders onto the Ride Roster — the official rider list. The roster is universal; the booking
method is not.

- **A. Assumptions.** The ride is scheduled with a Ride Roster created and posted to the Partner
  Website or the Public Website.
- **B. Booking:**
  - **a. Internal / Partner rides.** The Internal/Partner coordinator handles rider enrolment and
    maintains their overall Rider Roster. A configurable reminder can be sent to that coordinator at a
    chapter-defined interval before the ride. The coordinator completes any enrolments, then assigns
    riders from their Partner Rider Roster to the Ride Roster **in the order they will ride**. On
    submission, a configurable confirmation notification can go back to the coordinator.
  - **b. Public rides.** The ride appears on the Public Website with **open ride slots**. Public
    clients self-enrol all riders online and reserve their desired slot. A confirmation notification
    is sent. When every slot is reserved the website shows the ride as **Closed**.
- **C. Pre-ride check for demand.** At a configurable interval before the ride, check the roster is
  non-zero. Non-zero → proceed to execution. Zero → **flag the ride for cancellation by a scheduler
  for no rider demand.**
- **D. Ride cancellation.** A scheduler confirms the flagged ride as cancelled and updates all
  **Calendars, Rosters and Websites**. Notifications go to **all roles associated with the ride**.

---

## 5. Pre-Ride Execution

Prepare for the actual rides at the Ride Location, including moving equipment there, and decide any
cancellation.

- **A. Assumptions.** All required volunteer roles staffed, roster ready, all resources reserved and
  available.
- **B. Ride reminders.** Sent automatically before the ride date at a chapter-configurable interval.
  Chapters can also send automatic reminders to committed volunteers at a configurable interval.
  - **a. Internal / Partner rides** — one reminder to the Internal/Partner coordinator, who can
    **confirm the ride or request cancellation**.
  - **b. Public rides** — an individual reminder to **each rider**, who can confirm or cancel their
    timeslot. **If all riders cancel, the scheduler is notified for potential ride cancellation.**
- **C. Ride cancellation.** For any reason (weather, demand, equipment) all Calendars, Rosters and
  Websites are updated to cancelled and all associated roles notified. **A CWA volunteer records the
  Cancellation Reason Code** and associated data.
- **E. Non-transport roles.** Pilots, scouts, coordinators etc. meet at the Ride Location; resources
  are prepared.
- **F. Ready to execute.**

---

## 6. Ride Execution

Everything at the Ride Location.

- **A. Assumptions.** All required volunteer roles and resources on site; riders and roster ready.
- **B. Check-in** — off the Ride Roster; who does it varies:
  - **a. Internal / Partner rides.** An Internal/Partner coordinator **or** a CWA volunteer checks in
    each rider and marks them off as they ride. **A previously unenrolled rider can be enrolled on the
    spot and added to the roster.**
  - **b. Public rides.** A CWA volunteer checks each rider in. Walk-ups can be enrolled on the spot
    and added to the roster.
- **C. Rides.** Executed continuously per the roster until all are complete.
- **D. Ride Roster closure.** A CWA volunteer closes the roster as completed. **The system then tallies
  all data needed for statistics and reports** — this is the moment ride counts, volunteer hours and
  trishaw hours become real (see [09](09-reporting-and-statistics.md)).
- **E. Ride complete.**

---

## 7. Post-Ride Execution

- **A. Assumptions.** Ride complete, roster closed.
- **C. Storage.** Resources parked at their Storage Location: on-site for co-located rides, remote for
  transported rides.
- **D. Return tow vehicle.** If borrowed or rented, the Transporter returns it.
- **E. Ride closure.** Volunteers report **equipment issues** and complete any chapter-required input
  or surveys. **Any donations received are deposited to the chapter.**
- **F. Ride complete.**

---

## Cross-phase notes for implementers

| Concern | Where it shows up |
| --- | --- |
| Waivers | Enrolment (1B), pre-assignment gate at the site (Ambassador, [03](03-roles.md)), waiver reports ([09](09-reporting-and-statistics.md) #5, #7) |
| Resource reservation | Committed at 2C, released on cancellation (4D/5C), returned at 7C |
| Notifications | 2D, 3C, 3D, 4B, 4D, 5B, 5C — every one has a configurable interval and audience |
| Cancellation | Reachable from 4C/4D (no demand), 5C (weather/equipment/anything), and partially mid-ride (ID 42) |
| Chapter configuration | 1A, 1C, 1D, 2B, 2D, 4B, 5B, 7E — configuration is not a feature, it is the substrate |
| Statistics tally | Triggered by roster closure at 6D |
