# 02 — Glossary and organisational units

Use these words exactly. They are the ubiquitous language: model names, enum values, table names,
UI copy and ticket titles should all use the **Primary** term, never a synonym.

## Organisational units

CWA is a six-level hierarchy. Levels are the RFP's own numbering.

| ID | Level | Unit type | Example |
| --- | --- | --- | --- |
| 0 | 0 | **Global** | CWA International |
| 1 | 1 | **Country** | USA |
| 2 | 2 | **State / Province** | Flanders (Belgium), Illinois (USA) |
| 3 | 3 | **Chapter** | McHenry County |
| 4 | 4 | **Region** (not strict) | Central / North / South regions inside a chapter |
| 5 | 5 | **Care Center** | *(care centre name)* |
| 6 | 5 | **Public Ride** | *(ride location name)* |
| 7 | 5 | **Special Events** | Parades, one-time events |
| 8 | 5 | **Private Ride** | Functional Rides |

**Open questions Coding for Change raised on this sheet** (unanswered by CWA at time of writing —
treat the answers as design risk, do not silently assume one):

- Why is State/Province an organisational unit at all — calculation only, or are there state leaders?
- Why does a Chapter have multiple Regions, and why must that be modelled?
- How often does one chapter have more than one Care Center? How often are bikes stored centrally?
  Are centrally stored bikes shared between chapters?

The **Chapter** is the tenancy boundary: chapter-level data and configuration partitioning is a hard
non-functional requirement (see [08](08-non-functional-requirements.md#nfr-5)).

## Glossary

Format: **Primary term** *(secondary terms / aliases)* — definition.

### Ride models

- **Event Model** *(Pleasure Ride, Hub and Spoke, Request Level 2, Unstaffed Pleasure Ride)* — a bike
  ride for people who cannot independently ride. It fulfils no transport need; it **starts and ends at
  the same location**, typically a Care Center. Multiple rides may run from that one location during
  the scheduled window. **CWA volunteers are never compensated.**
- **Functional Ride** *(Individual Ride, Request Basic)* — a ride **from** a location **to** a
  location as requested by the rider: doctor, shopping, graveyard, hairdresser.
- **Model** *(Ride Type)* — defines how and to whom rides are delivered.
- **Unstaffed Pleasure Ride** — partnering with schools and youth organisations: CWA delivers the
  equipment, the school coordinates the rides and supplies pilots, ambassadors and riders. The chapter
  supplying the equipment trains the student volunteers.
- **Co-Located Rides** *(Co-Located Events)* — rides delivered at the same location the trishaw is
  stored. **No transport leg.** The transport/no-transport split drives whole branches of
  [05 — Pre-Ride and Post-Ride Execution](05-ride-lifecycle.md#5-pre-ride-execution).

### Places

- **Ride Location** *(Ride Site, Location)* — the address where a ride initiates. Care Center,
  individual residence, park, other.
- **Care Center** *(Client, Client Group, Nursing Home, Community group, Partner)* — an organisation
  for whom rides are run: residential care home, aged care, assisted living, senior home. **Always an
  organisation representing a number of riders, never an individual rider.** Some Care Centers own
  their own trishaw, schedule their own rides and hold approval authority over volunteers.
- **Storage Location** *(Garage)* — where trishaws live when not in use; can include trailers and
  vans. A chapter can have several, each with its own geography and volunteer assignment to specific
  ride locations.

### Equipment

- **Trishaw** *(Bike, Chat, Fun2Go, Tandem)* — transport bike carrying up to two adult passengers plus
  the pilot.
- **Wheelchair Bike** — three-wheeler where the rider stays in their own wheelchair, secured to the
  bike. E-assist, piloted.
- **Trailer** — serialised, unpowered vehicle towed to deliver trishaws and equipment; can hold
  several trishaws/wheelchair bikes.
- **Transport Vehicle** *(Van, Truck)* — chapter, volunteer or donor vehicle used to deliver equipment.
  Either carries bikes directly (van) or tows a trailer.

### Ride objects

- **Ride(s)** — taking a person on a bike trip, functional or pleasure. **Two people on the same trip
  count as two rides.** This is the counting rule for every statistic in [09](09-reporting-and-statistics.md).
- **Ride Request** — an ad hoc request to deliver a ride, functional or pleasure.
- **Ride Request List** — the list of *unscheduled* ride requests a scheduler works through. Inputs
  come from Care Center Coordinators, public individuals or CWA chapter staff.
- **Ride Roster** — the list of riders committed to a specific ride. Applies to Multiple Ride Events,
  Individual Pleasure Rides and Functional Rides alike.
- **Multiple Ride Events** — a Care Center (or other organisation) request covering several rides
  delivered inside one scheduled time frame; can involve multiple trishaws, pilots, ambassadors,
  transporters.
- **Chapter Operating Calendar** *(Ride Calendar)* — the graphical view of when the chapter delivers
  rides of any type. The chapter configures it with the maximum resources and volunteers per role
  available in each schedulable period. When a ride consumes all resources for a period the calendar
  shows unavailable. **Public viewers do not see the rides consuming the period**; chapter admins see
  everything (Care Center, Ride Location, required volunteers by role, trishaw/trailer counts, rider
  names, volunteers committed).
- **Ride Route** — a report/PDF of a predetermined route supporting pleasure rides at a specific care
  centre.
- **Cancellation Reason Code** — per ride type, a code list for why and when a ride was cancelled:
  weather, equipment, insufficient volunteers, insufficient/no riders, etc. **Cancellation does not
  automatically remove the event from the Chapter Operating Calendar.** A scheduler may delete
  cancelled rides to free the slot for a replacement. Individual rides can be cancelled by the rider;
  Care Centers can request cancellation of multiple-ride events, executed by scheduler or chapter admin.

### Chapters
- **Chapter** — an independently operating organisation affiliated with CWA. Can have multiple ride
  regions with their own storage locations and volunteer groups. Has one Administrator/Leader

Person-roles that act in the system are in [03 — Roles](03-roles.md).
