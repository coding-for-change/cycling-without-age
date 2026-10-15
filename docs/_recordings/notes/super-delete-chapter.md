# super-delete-chapter

- Account: country (Clara Country (DE))
- Start URL: /admin/chapters
- Duration: ~19 s

## Steps
1. Chapters list. Click the row **Augsburg – Haus am Park**. The chapter detail page opens.
2. Click the trash icon in the header (**Delete chapter**).
3. A dialog titled "Delete Augsburg – Haus am Park for good?" opens: "Everything that belongs to the chapter goes with it. This cannot be undone." A red box "This also deletes, for good:" lists "1 storage location" and "1 trishaw model".
4. Below: "Type DELETE-AUGSBURG-HAUS-AM-PARK to confirm". Type `DELETE-AUGSBURG-HAUS-AM-PARK` into the field (placeholder shows the same word). **Delete chapter** is disabled until the word matches.
5. Click **Delete chapter**. Toast: "Augsburg – Haus am Park is gone." The app returns to the Chapters list without Augsburg.

## Rules / notes seen on screen
- The confirmation word is DELETE- plus the chapter name in capitals, with spaces and dashes turned into "-". Case does not matter when typing.
- The consequences list counts what cascades: members, passengers, pending requests, rides, storage locations, trishaw models, and so on. Only non-zero items are shown.
- Who can delete (from the server guard `requireCountryAdminOfChapter`, not shown on screen): the chapter's country admins and superadmins. Chapter admins cannot.
