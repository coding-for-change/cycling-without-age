# 03 — Roles

Thirteen primary roles. The **Secondary** column is the list of names chapters actually use — the
platform must let a chapter relabel roles (see Appendix b · All Processes 0.2 #11,
requirement ID 115, *Configure Chapter Nomenclature*). Store the primary name; display the chapter's.

Permissions are **configurable per role** ([NFR 4](08-non-functional-requirements.md#nfr-4)) and all
data is partitioned per chapter ([NFR 5](08-non-functional-requirements.md#nfr-5)). So a role is
*(person, chapter, role)* — not a global attribute of a user. A user holds several roles at once; the
Pilot definition explicitly assumes multiple pilots share one ride and trade off.

| Role | Also called | What they are responsible for |
| --- | --- | --- |
| **Chapter administrator** | Admin, Manager, President, Owner, Founder, Location Manager, National Superuser, Chapter Administrator, Chapter Manager | Final say in operating the chapter. Responsible for financial and operating performance. Hire/fire authority for all personnel. Answerable to the Board if one exists. **Has access to all data for the chapter.** Can delegate areas of responsibility. |
| **Superuser** | System Administrator | Configures the scheduling system for a chapter within CWA parent-org guidelines. Trains users on use and configuration. Builds ad-hoc reports. Represents the chapter to the parent org on system issues. |
| **Scheduler** | Chapter Scheduler, Scheduling Admin, Coordinator | Schedules ride events, manages and monitors volunteer sign-ups. Coordinates ride events with care centres and riders. Assigns specific equipment/bikes when required. Where customary, assigns volunteers to specific rides. |
| **Pilot** | Co-Pilot, Primary Pilot, Secondary Pilot, Trishaw Driver | Volunteer who has completed pilot training **for a specific trishaw type** (Triobike Taxi, VeloPlus, …) and may conduct rides on those types. Several pilots can sign up to one event and trade off individual roles. |
| **Rider** | Rider – Care Community, Public, Relative/Public Rider at Event, Care Center Staff, Passenger, Carer, Home Resident, Residential Client, Customer | Any person who takes a ride on the front of a trishaw — elder, aged/disabled care resident, accompanying family or friend, care facility staff, carer, supporter. **Has enrolled as a rider with the CWA chapter delivering the ride.** |
| **Trainer** | Training Admin, Instructor, Captain | Runs volunteer training with **pass/fail authority** for pilot, scout, ambassador and transporter roles. Covers safe trishaw operation, ride site set-up and coordination, trailer use. |
| **Maintenance** | Mechanic | Monitors reported equipment issues, decides when repairs are needed, ensures they are completed. May manage spare parts. Can be a bike shop or chapter volunteers. |


## Role-adjacent facts that trip people up

- **Pilot qualification is per trishaw type.** Staffing a ride is not "any pilot"; it is a pilot
  trained on the equipment reserved for that ride. Functional-ride story
  [#18](07-functional-ride-user-stories.md) extends this to a pilot profile: weekday availability,
  proximity to garages, experience with bike model, and whether they can fly solo or need a co-pilot.
- **Approval is location-scoped** in the functional model: coordinators approve pilots *for a
  location* (ID 47), captains and coordinators register preferred locations (ID 202), and a captain is
  emailed when an approved pilot matches their preferred location (ID 203).
- **Ambassador owns the waiver gate at the ride site.** The waiver check is a role responsibility,
  not only a form validation.
- **Trainer has pass/fail authority**, which means "Mark Volunteer as Trained" (ID 100) is a
  privileged write, allowed to *Chapter Admin or Captain*.

## Portals

[NFR 2](08-non-functional-requirements.md) asks for a single launch point per chapter with sub-views
into each audience. CWA GO provides three dashboards — **Passenger, Pilot and Administrative** — and
scopes administrative sub-roles by showing or hiding features rather than adding portals.
