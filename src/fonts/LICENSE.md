# Taca Pro — provenance and licensing status

> **Partly resolved.** This font came from **Cycling Without Age's own website**, linked
> from their official brand-book page — so it reached us through the organisation's
> intended channel, not a font-piracy mirror. What is still unconfirmed is whether that
> distribution covers **webfont** use by a chapter. One email should settle it; see
> "What needs to happen".

## What is here

| File                | Weight | Format                 |
| ------------------- | ------ | ---------------------- |
| `TacaPro-Bold.otf`  | 700    | OpenType/CFF (desktop) |

Wired up in `src/app/layout.tsx` via `next/font/local`, exposed as `--font-taca` /
`--font-display`. Required by `docs/BRAND.md` § Typography.

**Bold (700) is the only weight this app ships**, because it is the only one the brand
book's online spec calls for (pp. 10–11): online is TacaPro **bold** headlines over an
Arial body. TacaPro *regular* is the **print** body face, and **Extrabold appears nowhere
in the book**. `TacaPro-Regular.otf` (400) and `TacaPro-Extrabold.otf` (800) were bundled
here originally and have been removed — ~186 KB, and it narrows everything below to one
file. Both remain in git history at `book2go-mockup/src/fonts/` if a print deliverable
ever needs Regular.

## Embedded metadata (verbatim from the `name` table)

```
Copyright   : Copyright (c) 2012 by FOUNTAIN/Peter Bruhn, Sweden. All rights reserved.
              Designed by Ruben Dias.
Trademark   : Taca Pro is a trademark of FOUNTAIN/Peter Bruhn, Sweden.
Designer    : Ruben Dias  (http://www.itemzero.pt)
Version     : 1.004
LicenseDesc : Current license info at www.fountaintype.com
LicenseURL  : http://www.fountaintype.com
```

`OS/2.fsType = 8` — "Editable embedding". This is the OpenType permission bit for
embedding a font **into a document** (PDF, Word). It is permissive as those bits go
(it is *not* "Restricted License"), but it says nothing about self-hosting via
`@font-face`. Web serving is governed by the foundry's EULA, not by fsType.

## Why the licensing question is open

0. **CWA distributing it is not the same as CWA licensing it to us for the web.** A
   foundry license held by CWA International for producing brand materials would not
   automatically extend to a chapter self-hosting the font as a webfont on a public
   site. It is also possible CWA is distributing more broadly than their own license
   allows. This is the one question left, and only CWA can answer it.
1. **The license pointer is dead.** Both the embedded `LicenseURL` and the PDF that
   shipped with these files point at `fountaintype.com`. That domain no longer serves
   the foundry — it resolves to a parked one.com certificate.
2. **The foundry is gone.** Fountain was founded by Peter Bruhn in 1993 and was
   discontinued after his death in 2014. Any Fountain-era grant came from an entity
   that no longer exists.
3. **Rights appear to have reverted to the designer.** Taca is sold today on MyFonts
   under Rúben R. Dias — <https://myfonts.com/fonts/ruben-dias/taca> — where desktop,
   **webfont**, app and e-document licenses are all available and purchasable
   (individual weights ~$42, the five-font family ~$155, as of this writing).
4. **These are desktop OTFs, not a webfont kit.** A MyFonts webfont license ships
   `.woff2` files under a `…wfkit2…` naming scheme. These are `.otf` carrying the
   2012 Fountain copyright — a desktop release.

## How these files got into this repo — the full chain

Every step below is verified by SHA-256, not inferred.

1. **Downloaded from CWA's own website**, via Chrome. macOS recorded the source on the
   archive (`kMDItemWhereFroms`):

   ```
   https://cyclingwithoutage.org/wp-content/uploads/2015/01/CWA-font-TacaPro.zip
   referred from  https://cyclingwithoutage.org/brand-book/
   ```

   That is the **official CWA brand-book page** offering the font package to chapters
   and ambassadors. The archive is still at `~/Downloads/CWA-font-TacaPro.zip`.

2. **The archive is the untouched Fountain retail package** — a `taca_pro/` folder, all
   file dates 2014-02-13, containing five weights (Extralight, Light, Regular, Bold,
   Extrabold) plus `FountainLicense.pdf`. Five weights matches the family MyFonts sells
   today. CWA appears to have uploaded the package as they received it.

3. **Unzipped into `book2go-mockup/src/fonts/`** and committed there in `b133e7b`
   ("Brand foundation…").

4. **Copied into this repo** during the mockup port that this branch trimmed back.

`TacaPro-Bold.otf` here is byte-identical to the one inside the CWA archive
(`256baf0d…`), as is the license PDF that travelled with it (`aa9d3bbf…`).

So the provenance question is answered: the font came from Cycling Without Age.

## About the `FountainLicense.pdf` that used to sit here

Removed in favour of this file. It is still in the CWA archive and in
`book2go-mockup` (git blob `43cca091…`). It contained no license terms — one page,
three lines:

> "Our End User License Agreement (EULA) can always be found at our site:
> http://www.fountaintype.com/support/license-agreement"

Its PDF `CreationDate` is **2008-11-25**, four years before these fonts were built
(head table: created 2012-08-29 / 2012-10-05). So it was generic boilerplate bundled
into every Fountain download, not a grant issued for Taca or to any particular
licensee. It named no purchaser, no date of sale, and no scope.

The original file remains in git history at `book2go-mockup/src/fonts/FountainLicense.pdf`
if it is ever needed.

Its presence was the first hint of legitimate origin — foundries ship a license leaflet
in a retail download and piracy mirrors do not — which the download trail above has since
confirmed outright.

## What needs to happen

In order of preference:

1. **Ask CWA International**, at **start@cyclingwithoutage.org** — the address the brand
   book gives for design assets and implementation questions (p. 43). Because the font
   came from their own brand-book page, the question is narrow and concrete:

   > You distribute the TacaPro package from your brand-book page. We are building a
   > chapter web app and are self-hosting TacaPro Bold as a webfont. Does the license
   > you hold cover that, or should we buy our own webfont license?

   Ask before buying anything — they may already hold a grant that covers chapters.
2. **Otherwise buy a webfont license** from MyFonts under the chapter's name, replace
   these `.otf`s with the `.woff2` files it ships, and commit the receipt reference
   here. `.woff2` is the better format for web delivery regardless — smaller, and what
   `next/font/local` should be serving. Buying **Bold alone** covers the online spec.
3. **Until either is confirmed**, the fallback chain in `--font-display`
   (`"Arial Black", Arial, sans-serif`) renders acceptably if these files need to be
   pulled at short notice.

This note is a record of what was found, not legal advice.
