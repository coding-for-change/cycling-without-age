# super-new-chapter

- Account: country (Clara Country (DE), country admin of Deutschland)
- Start URL: /admin/chapters
- Duration: ~41 s

## Steps
1. Chapters page (heading **Chapters**, List/Map toggle). It lists the chapters of the admin's country: Berlin, Hamburg, München.
2. Click **New chapter**. A large drawer titled **New chapter** opens, subtitle "A name and an address are all it takes. Everything else can follow later." A map of the existing chapters is on the right.
3. **Chapter name**: type "Augsburg – Haus am Park". The **Web address** line below shows `http://…/join/` followed by a slug made from the name.
4. Click the pencil (**Edit**) next to Web address. The slug becomes a text field. Replace it with `augsburg`. A badge shows "Checking", then "Free". Click the check mark (**Done**).
5. **Find the address** (hint "Type an address or the care home's name."): type "Rathausplatz Augsburg" and pick "Rathausplatz 86150 Augsburg, Germany".
6. The address card shows the result with a **Search again** link and the hint "Drag the pin to fine-tune. The address follows." **City** fills in (Augsburg). **Country** shows "Deutschland" with "Detected from the address." The map zooms to the pin and draws a circle for the riding radius.
7. Drag the pin slightly on the map. The address updates (to "Mörikestraße 7b, 86161 Augsburg, Germany").
8. Drag the **How far it rides** slider from "10 km around the pin" to "17 km around the pin". The circle grows.
9. (Optional fields under "Optional", left empty: Care home, Description, Logo web address.)
10. Click **Create chapter ⌘↵** (the button shows "Creating" while it saves).
11. The done screen: title "Augsburg – Haus am Park is on the map.", text "Print the poster for the care home wall, or open the chapter to add its people.", a QR code and the join link `…/join/augsburg`, with buttons **Copy link**, **Print the poster** and **Save QR code as PNG**. The footer has **Start another** and **Open chapter**.
12. Hover **Print the poster**, then click **Open chapter**. The chapter detail page opens: header, Location (address, map, radius, Time zone "Berlin"), and a properties column with Properties (Web address, Country, Started), People (Members 0, Passengers 0, Waiting for approval 0) and Join link (QR + Copy link / Print the poster / Save QR code as PNG).

## Rules / notes seen on screen
- Only a name and an address are required. "Create chapter" stays disabled until both are set.
- A country admin creates chapters in their own country. With a single country, Country is fixed and detected from the address.
- The web address must be unique. It shows "Taken" or "That web address is taken. Pick another one."
- If the radius overlaps another chapter, the drawer warns "Overlaps with {name}, {distance} away."
- ⌘↵ submits the drawer.
