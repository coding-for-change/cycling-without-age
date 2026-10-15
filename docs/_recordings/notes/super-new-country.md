# super-new-country

- Account: superadmin (Sanne Superadmin)
- Start URL: /admin/countries
- Duration: ~27 s

## Steps
1. Countries page (heading **Countries**). The table has the columns Country name, Country code and Country admins. Each row has "Add admin" plus edit (pencil) and delete (trash) icons.
2. Click **New country** (top right). A drawer titled **New country** opens.
3. In **Country** (combobox, placeholder "Type a country") type "Austr". The suggestions show "Austria AT" and "Australia AU". Pick **Austria**.
4. **Country name** fills in by itself with "Austria" (hint: "How it reads in the sidebar and on chapter pages."). The code AT comes from the country you picked.
5. Click **Save country**. Toast: "Austria joined the movement." Austria appears in the table with code AT.
6. In Austria's row, click **Add admin**. A drawer titled **Add a country admin** opens. Subtitle: "They need to have signed in once."
7. In **Email address** type `multi@cwa.local` and click **Add a country admin**. Toast: "multi@cwa.local runs this country now." A "Malou Multi ×" chip appears in the Country admins column.
8. Click the **Malou Multi ×** chip. A confirmation asks "Remove Malou Multi as country admin?" with **Cancel** and **Remove Malou Multi**.
9. Click **Remove Malou Multi**. Toast: "Saved." The chip disappears.

## Rules / notes seen on screen
- Only superadmins see Countries and can create countries or appoint country admins.
- A country admin must already have an account ("They need to have signed in once."). Unknown emails fail with "Nobody with that email address has an account yet."
- Country codes are unique ("That country code is taken.").
- The delete icon opens a typed confirmation: "Every chapter in this country goes with it, and everything that belongs to them. This cannot be undone."
- Data left behind: the country **Austria (AT)** still exists, with no admin and no chapters.
