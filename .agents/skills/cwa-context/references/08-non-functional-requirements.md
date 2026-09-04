# 08 — Non-functional requirements

| # | Requirement | Type | CWA comment | Raised by |
| --- | --- | --- | --- | --- |
| <a id="nfr-1"></a>**1** | Available via Desktop Browser and via Mobile Apps (iOS & Android) | Platform | Most volunteers will use mobile access | Dave Yen |
| <a id="nfr-3"></a>**3** | Personal Data (Contact Info, Waiver Data) secured from Public Access | Security | — | Dave Yen |
| <a id="nfr-4"></a>**4** | Configurable Permissions per Role | Platform | This would provide flexibility within the chapter to configure the system as needed. | Dave Yen |
| <a id="nfr-5"></a>**5** | Chapter level data and configuration partitioning | Platform | Each chapter should feel that they are in charge of all their data and configurations they have set up. | Dave Yen |
| <a id="nfr-6"></a>**6** | Map capability to show all locations (Care Centers, Public Rides, Storage Locations) and then have at least one level of further detail about that location to include details such as Route Maps of where to ride. | Platform | Could leverage some 3rd party mapping capability such as Google Maps. | Dave Yen |
| <a id="nfr-7"></a>**7** | The system's user interface need to be multilingual, meaning that the user can ask for a particular human spoken language. This means that the labels next to fields change, but also error messages of the system, and masterdata like in dropdowns. | Platform | See Languages and Countries tab for priority to Localize / Internationalize | Tom Haepers |
| <a id="nfr-8"></a>**8** | The system needs to be multi-cultural, it should display decimal numbers, currencies, dates and times based on the culture of the user. Culture is usually defined by a country of residence. | Platform | See Languages and Countries tab for priority to Localize / Internationalize | Tom Haepers |
| <a id="nfr-9"></a>**9** | System Response times | Performance | — | Tom Haepers |
| <a id="nfr-10"></a>**10** | Security and compliance (GDPR) (for countries in scope) | Security | See languages and countries tab | Hanne |
| <a id="nfr-11"></a>**11** | Back-ups | — | — | Tom Haepers |
| <a id="nfr-12"></a>**12** | Payment for functional rides | Platform | Interface to payment system ? / Cash (to be moved to All processes | Tom Haepers |
| <a id="nfr-13"></a>**13** | Service agreements with nursing homes | Platform | Interface to payment system ? / Cash (to be moved to All processes | Amos |
| <a id="nfr-14"></a>**14** | Store operating and care manuals from OEM for bikes | Platform | — | Steve Brahm |
| <a id="nfr-15"></a>**15** | Store training documents and role descriptions for chapter | Platform | — | Steve Brahm |
| <a id="nfr-16"></a>**16** | It is a requirement that the solution is manageble for chapters | Platform | — | All / Hanne |
| <a id="nfr-17"></a>**17** | Describe the proces for error handling, change requests and upgrades. Is there a ticket system ? | Vendor | — | Hanne |
| <a id="nfr-18"></a>**18** | Describe the technical platform/architecture | Vendor | — | Hanne |
| <a id="nfr-19"></a>**19** | What is delivered in terms of system documentation and technical training/handover | Vendor | — | Hanne |
| <a id="nfr-20"></a>**20** | What are delivered in terms of user documentation and user training / instruction | Vendor | — | Hanne |
| <a id="nfr-21"></a>**21** | For which requirements exsists a Best Practice | Vendor | — | Hanne |
| <a id="nfr-22"></a>**22** | List countries and languages in scope (phase 1 and phase 2) | Platform | See Languages and Countries tab for priority | Hanne |
| <a id="nfr-23"></a>**23** | 2end line support to super users in country organizations and larger chapters | Support | — | Hanne |
| <a id="nfr-24"></a>**24** | Describe the process/concept for knowledge sharing with vendor and other user organizations | — | — | Hanne |
| <a id="nfr-25"></a>**25** | How is sustainability taken into account | Vendor | — | Hanne |
| <a id="nfr-26"></a>**26** | Describe the admin access including user and access administration and how system setup works for creating new organizational and other structures/units and master data | Platform | — | Hanne |
| <a id="nfr-27"></a>**27** | A User to User or Group Messaging function for communications. | Platform | — | Dave Yen |

## The three that shape the architecture

- **NFR 2 — three dashboards, one launch point per chapter.** Passenger, Pilot and Administrative.
  Administrative sub-roles and their permissions are scoped by showing or hiding features, not by
  adding further portals.
- **[NFR 4](#nfr-4) + [NFR 5](#nfr-5) — configurable permissions per role, and chapter-level data and
  configuration partitioning.** CWA's words: *each chapter should feel that they are in charge of all
  their data and configurations.* This is a multi-tenant requirement with per-tenant RBAC
  configuration, and it is why every role in [03](03-roles.md) is scoped to a chapter.
- **[NFR 7](#nfr-7) + [NFR 8](#nfr-8) — multilingual *and* multicultural.** Not only labels: error
  messages and **master data in dropdowns** must translate, and numbers, currencies, dates and times
  must follow the **culture of the user** (usually country of residence). Language and region are two
  independent axes. See [10](10-languages-and-markets.md).


## Content storage requirements often missed

[NFR 14](#nfr-14) (store OEM operating and care manuals for bikes) and [NFR 15](#nfr-15) (store
training documents and role descriptions per chapter) mean the platform needs **document storage per
chapter**, not just structured records.
