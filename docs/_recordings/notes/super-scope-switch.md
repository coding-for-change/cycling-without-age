# super-scope-switch

- Account: superadmin (Sanne Superadmin, superadmin@cwa.local)
- Start URL: /admin/members
- Duration: ~21 s

## Steps
1. The Members page opens in the **All chapters** scope. The sidebar's top button reads "All chapters / Superadmin" and the breadcrumb reads "All chapters › Members". The "Everyone in the chapter" table lists members from every chapter (München, Hamburg, København, …).
2. Click the scope switcher at the top of the sidebar (accessible name "Switch perspective or chapter"). A menu titled **Scope** opens. It lists "All chapters", one "All chapters in <country>" entry per country (Danmark, Deutschland, Nederland, Singapore, United States) and then every chapter by name.
3. Pick **All chapters in Deutschland**. The switcher and the breadcrumb now read "All chapters in Deutschland". The list drops København and keeps only the German chapters (München, Hamburg, …).
4. Open the switcher again and pick **München – Seniorenheim Sonnenhof**. The breadcrumb reads "München – Seniorenheim Sonnenhof › Members" and the list shows only München members. An **Invite someone** button appears at the top right. It only shows when a single chapter is selected.
5. Press **⌘K**. The command bar opens. Type "All chapters": the **Scope** group shows "All chapters" and the "All chapters in <country>" entries.
6. Click **All chapters**. The page goes back to the full list across all chapters.

## Rules / notes seen on screen
- The scope applies to every admin page (Members, Rides, Trishaws, …), and the page you are on stays open when you switch.
- The scope switcher and the ⌘K "Scope" group hold the same entries. A superadmin sees every country and chapter. A country admin sees only their countries and those countries' chapters.
- Single-chapter actions such as "Invite someone" only appear when one chapter is selected.
- The scope is remembered in a cookie for the admin area.
