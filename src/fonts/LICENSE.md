# Taca Pro — provenance and licensing status

> **Unresolved.** These files are a commercial desktop typeface being served as a
> webfont. No license covering that use has been located. Read this before shipping
> the app publicly. See "What needs to happen" at the bottom.

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

## How these files got into this repo

Ported byte-identical (verified by SHA-256) from `book2go-mockup/src/fonts/`, where
they were committed in `b133e7b` ("Brand foundation…"). That is the same mockup this
branch's other UI code came from. The original acquisition — who obtained them and
under what terms — is not recorded in either repo.

They were most likely added while implementing `docs/BRAND.md`, which specifies Taca Pro
as the CWA corporate typeface. Note that the brand book specifies the *typeface*; it is
not a source of licensed font files.

## About the `FountainLicense.pdf` that used to sit here

Removed in favour of this file. It contained no license terms — one page, three lines:

> "Our End User License Agreement (EULA) can always be found at our site:
> http://www.fountaintype.com/support/license-agreement"

Its PDF `CreationDate` is **2008-11-25**, four years before these fonts were built
(head table: created 2012-08-29 / 2012-10-05). So it was generic boilerplate bundled
into every Fountain download, not a grant issued for Taca or to any particular
licensee. It named no purchaser, no date of sale, and no scope.

The original file remains in git history at `book2go-mockup/src/fonts/FountainLicense.pdf`
if it is ever needed.

One point in favour of legitimate origin: foundries ship a license PDF alongside the
font files in a retail download, and free-font mirror sites do not. The presence of that
leaflet suggests these came from a genuine Fountain distribution package. It does not
establish who licensed it, or that the license covers web use.

## What needs to happen

In order of preference:

1. **Ask CWA International**, at **start@cyclingwithoutage.org** — the address the brand
   book itself gives for design assets and implementation questions (p. 43). The book
   specifies Taca Pro, so whoever produced it licensed the font; a chapter may be covered
   under the organisation's existing grant. Request the EULA or purchase record before
   buying anything. (Nothing in the book's 44 pages says where to obtain the font.)
2. **Otherwise buy a webfont license** from MyFonts under the chapter's name, replace
   these `.otf`s with the `.woff2` files it ships, and commit the receipt reference
   here. `.woff2` is the better format for web delivery regardless — smaller, and what
   `next/font/local` should be serving. Buying **Bold alone** covers the online spec.
3. **Until either is confirmed**, the fallback chain in `--font-display`
   (`"Arial Black", Arial, sans-serif`) renders acceptably if these files need to be
   pulled at short notice.

This note is a record of what was found, not legal advice.
