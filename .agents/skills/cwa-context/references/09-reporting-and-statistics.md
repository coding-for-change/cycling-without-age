# 09 — Statistics and reporting

Reporting is not a nice-to-have here. The RFP's stated reason for the whole programme is that CWA
*"cannot report on activities across chapters on a global level"* and needs that for **grant
applications** ([01](01-program-overview.md)). Cite a report as `Report 11` and
link `#rep-11`.

In order to have valid reporting and also to track user behavior, important aspects should have a "log". E.g. A Pilot, A Pilot and etc. should have a log history the showes chronologically what the user did when.

| # | Report | Purpose | Description |
| --- | --- | --- | --- |
| <a id="rep-1"></a>**1** | Volunteer Participation | Determine volunteer Activity | In a user definable time frame determine the number of ride shifts the volunteer signed up for, completed, no showed in the volunteer roles active for that chapter. example: Pilot, Ambassador, Transporter, Scout, Event Specialist........ Participation is evaluated in total for the time period and displayed for each rostered volunteer. Include ride shifts that were not cancelled that had unstaffed volunteer shifts. |
| <a id="rep-2"></a>**2** | Rider Participation | Rider Participation | In a user definable time frame determine the number of rides the rider signed up for, completed, no showed. Evaluated in total for the time period and/or monthly. |
| <a id="rep-3"></a>**3** | Ride Site Activity | Determine number of rides by care facility or event | In a user definable time frame determine the number of rides the site scheduled and actually completed. Evaluated in total for the time period and/or monthly trend. Select all would provide total chapter activity. Include cancellation reason codes for Weather, Rider, Facility, CWA (Volunteers or Equipment) |
| <a id="rep-4"></a>**4** | Unstaffed Shifts | Evaluate staffing coverage for scheduled rides | In a user definable time frame determine the number of ride shifts that are not staffed in the roles active for that chapter. example: Pilot, Ambassador, Transporter, Scout, Event Specialist........ . Report can be run for rides in the past or future by date and ride site. |
| <a id="rep-5"></a>**5** | Riders By Site | Rider Census | Provide a report to determine how many riders have completed a waiver for current ride season by Care Center/site and in total for the chapter. |
| <a id="rep-6"></a>**6** | Volunteer Roster | Volunteer Census | Determine the number of volunteers and identity role(s) by volunteer. Display name, role and totals. |
| <a id="rep-7"></a>**7** | Waiver Completed | Rider Census by Site | Display list of riders who have completed waiver by ride site. |
| <a id="rep-8"></a>**8** | Volunteer Onboarding Progression | Volunteer Onboarding Progression | In summary and detailed by name determine who has not yet completed the full onboarding process once an application is submitted. Display steps completed (include date accomplished) and those incomplete. |
| <a id="rep-9"></a>**9** | Volunteer Contact Information | Volunteer Contact Information | Display contact information for each volunteer and the roles they are qualified for. |
| <a id="rep-10"></a>**10** | Bike Ride Activity | Determine Trishaw Usage | Display use hours by bike in a user definable time period. Hours are accumulated by scheduled ride length when a bike is assigned to a specific event and the event was not cancelled. |
| <a id="rep-11"></a>**11** | Ride Distance | Record Trishaw and chapter ride distances | Based on the number of riders and site typical ride length determine rider km/miles for a pleasure ride. For functional ride record actual distance. Select all would provide total chapter km/miles for a user definable time period. |
| <a id="rep-12"></a>**12** | Export Data | User Queries | Export user selectable data to excel or similar for user manipulation. |
| <a id="rep-13"></a>**13** | Ride Route Display | — | Provide link to ride route by care facility. Accessible to pilots and care coordinators |
| <a id="rep-14"></a>**14** | Event/Ride Cancelled | Maintain record of cancellations | Record reason, date and person cancelling scheduled event/ride.Send notice to scheduled staff, scheduler and admin when it occurs. |
| <a id="rep-15"></a>**15** | Maintenance History | Track Trishaw Maintenance History | Display maintenance issues reportede with trishaw and repair activity. This is simply a log |
| <a id="rep-16"></a>**16** | Pilot statistics | — | Pilot rides per month |
| <a id="rep-17"></a>**17** | Ride statistics | — | Number of rides / passengers / (kilometers)... per week / month |
| <a id="rep-18"></a>**18** | Finance overview | Finance reporting to parent org | Earning (individual / partner paid) / Costs (insurance, repairs) per month |
| <a id="rep-19"></a>**19** | Invoicing overview | Prepare invoices end of month | Post-paid trips (functional only) per payer per month |
| <a id="rep-20"></a>**20** | Pilot payout overview | Prepare payout end of month | Trips (functional only, if pilot requests the payout) per pilot per month |

## Data the reports imply must be captured

Work backwards from this list — it is the cheapest specification of the write model:

| Report needs | So the system must record |
| --- | --- |
| [1](#rep-1), [4](#rep-4) | Per volunteer per shift: **signed up / completed / no-showed**, and shifts that stayed **unstaffed on non-cancelled rides**, by role |
| [2](#rep-2) | Per rider: signed up / completed / no-showed |
| [3](#rep-3) | Rides **scheduled** vs **actually completed** per site, plus cancellation reason codes bucketed as **Weather / Rider / Facility / CWA (volunteers or equipment)** |
| [5](#rep-5), [7](#rep-7) | Waiver completion **per ride season**, per Care Center/site |
| [6](#rep-6), [9](#rep-9) | Volunteer roster with roles and contact info |
| [8](#rep-8) | Every onboarding step with the **date it was accomplished**, so incomplete applications can be chased |
| [10](#rep-10) | **Bike hours** — accumulated from the *scheduled* ride length when a bike is assigned and the ride is not cancelled |
| [11](#rep-11) | For pleasure rides: rider km/miles **derived from rider count × the site's typical ride length**. For functional rides: **actual distance** |
| [13](#rep-13) | Ride route documents linked to a care facility, readable by pilots and care coordinators |
| [14](#rep-14) | Cancellation reason, date, **person cancelling**, and a notification to scheduled staff, scheduler and admin |
| [15](#rep-15) | Maintenance issue log with repair activity |
| [18](#rep-18), [19](#rep-19), [20](#rep-20) | Earnings by payer, costs (insurance, repairs), post-paid functional trips per payer per month, and payouts per pilot per month |

## Rules that are easy to get wrong

1. **Two riders on one trip = two rides** ([02](02-glossary.md#ride-objects)). Every count follows
   that rule.
2. **Bike hours come from scheduled length, not actual.** [Report 10](#rep-10) says so explicitly.
3. **Pleasure-ride distance is estimated, functional-ride distance is measured.** [Report 11](#rep-11).
   Two different code paths into one number.
4. **Cancelled rides still count** in [Report 3](#rep-3) (as cancellations with a reason) and are
   *excluded* from [Report 10](#rep-10). Cancellation is not deletion — the ride stays on the Chapter
   Operating Calendar unless a scheduler removes it ([02](02-glossary.md#ride-objects)).
5. **"Ride season" is a real period** ([Report 5](#rep-5)) and is not defined anywhere in the RFP.
   Ask before assuming a calendar year.
6. **Everything must also export.** [Report 12](#rep-12) plus process requirement
   ID 135 (Appendix b · All Processes 8.2 #2) — CSV export of ride event,
   volunteer or rider data between two dates.
7. **Global rollup is anonymised.** Process requirement
   ID 138: *System Wide Reports using Anonymized
   Data for usage and CWA International Level Reports.* Cross-chapter reporting must not move personal
   data out of the chapter partition ([NFR 5](08-non-functional-requirements.md#nfr-5),
   [NFR 10](08-non-functional-requirements.md#nfr-10)).
8. **The tally happens at roster closure** ([05 · 6D](05-ride-lifecycle.md#6-ride-execution)).
