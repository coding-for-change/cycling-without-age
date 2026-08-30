# Cycling Without Age — Brand rules for this app

Source of truth: the official CWA Brand Book (Nov 2019), https://cyclingwithoutage.org/brand-book/.
This file condenses it into rules the frontend must follow. The `.claude/skills/frontend`
skill points here.

## Colors — the entire palette

The brand has exactly four colors. Everything on screen derives from them.

| Token         | Value     | Brand meaning / usage                                              |
| ------------- | --------- | ------------------------------------------------------------------ |
| Black         | `#000000` | Font color, line work, ink fills. (Print: CMYK 30/30/30/100) **On screen this app renders it as `--ink #2e2823` — see below.** |
| White         | `#FFFFFF` | Canvas, cards, font color on dark/red grounds                      |
| Mint Green    | `#92D2C6` | "Caretaking." Color blocks, accents, the diagonal-edge motif. PMS 565C |
| Red           | `#ED1C24` | "Energy, action, passion." The logo red. **Reserved for primary actions and alerts.** PMS 485C |

### From the book

- **Font colors are only black and white.** Verbatim (p. 8): "Coulors shouldn't steal the
  show. That's why we use only black and white as font colors." Never set type in mint,
  red, or grey-as-a-color.
- The four colors may be used at **80% transparency** for text boxes over photography
  (p. 9, and applied on pp. 26–27).
- "We let the photography tell our stories. Moreover, content is king." (p. 8)
- Photography keeps its own natural colors; **black and white is also allowed** (p. 14).

### Product decisions that go beyond the book

These are ours, not the brand book's. They are deliberate and defensible on screen, but
do not cite the book for them:

- **`--ink` is `#2e2823` — a warm espresso — wherever the book says black.** The book
  specifies pure `#000000` (print CMYK 30/30/30/100, itself a *rich* black rather than
  flat K100). On a lit display pure `#000` is harsher than it is on paper, so we warm it:
  `#2e2823` is hue 27°, saturation 14%, lightness 16% — technically a very dark brown,
  and it reads as the brand's black at every size we use it.

  **This applies to every black mark, not just type:** body and heading text, icon
  strokes, borders and rules, and illustration line work all use `--ink`. One ink, no
  exceptions — a page mixing `#000` outlines with `#2e2823` text shows the mismatch as a
  faint colour shift exactly where the eye compares them. Ink at reduced opacity
  (`--ink-soft`, `--ink-faint`) for secondary text and hairlines is also ours.

  The one thing that stays pure black is **the CWA logo**, which is a supplied asset and
  is never recoloured (see Motifs).
- **Derived tints** (`mint-tint`, `red-tint`, warm greys = ink at low opacity) extend the
  book's 80%-transparency idea to opaque UI surfaces. Introduce no *new* hue into chrome
  (no blue, amber, violet, …).
- **`--mint-deep #28584E` is a fifth color.** It is not in the brand book — the book has
  four. We use it for dark surfaces (tiles, active tab pill, toasts, hero blocks) because
  large black fills with white type read harsh in a UI. Note the book *does* use black
  grounds elsewhere: the bike logo is specified "as our main logo on black backgrounds"
  (p. 7), and black slides, hats and t-shirts appear on pp. 29, 32–33. So this is a
  product choice, not a brand rule.
- **Red is reserved for the primary action.** The book calls red "energy, action and
  passion" and uses it freely — slogan bars, t-shirts, vests, jackets, the canopy. It
  never says "reserve it." Reserving it is a UI decision that follows from "content is
  king": on a screen full of controls, scarce red is what makes the one that matters
  legible. (The line "we don't turn our rickshaws into canaries", p. 20, is about not
  over-decorating the *bikes* — it is not a rule about red.)
- Because mint `#92D2C6` is light, text on mint is **ink**. White type sits on red or
  `mint-deep`.
- **Illustration and avatars are exempt from the four-color rule.** Imagery uses natural,
  logical colors so scenes read as places — anchored by mint vegetation and the CWA-red
  trishaw bench where they appear. The strict palette governs chrome and typography.

## Typography

The book (pp. 10–11) specifies **different pairings for print and online**. Only the
online column applies to this app:

| Role | Print | **Online** |
| ---- | ----- | ---------- |
| Headlines | TacaPro bold | **TacaPro bold** |
| Highlights | TacaPro bold | **Arial bold** |
| Main body text | TacaPro regular | **Arial regular** |

### What this app currently ships: Arial only

**No webfont is loaded.** Everything — headlines, highlights, body — is Arial, with
`"Helvetica Neue"`, `Helvetica` and `"Liberation Sans"` (the metric-compatible Arial on
Linux) behind it. Headlines separate from body by **weight**, not typeface: `h1`–`h4`
default to `--font-display` at 700, and `font-display` is the utility elsewhere. Both
`--font-display` and `--font-sans` resolve to the same stack, so the distinction is
purely a weight change today.

This matches the book for **body text and highlights**, which the online column already
sets in Arial. It **deviates for headlines**, which the book sets in TacaPro bold. That
is a real cost: TacaPro's squircle letterforms are the most recognisable thing about a
CWA headline, and Arial bold carries none of it. Accepted deliberately for now.

Being a system font, Arial also means no download, no layout shift, and no `next/font`
wiring at all.

### Why TacaPro is not bundled

TacaPro **is** the CWA corporate typeface and the brand book is unambiguous about it. It
was bundled here and then removed, because its licence for **web** use could not be
confirmed: the font is a commercial desktop release from Fountain (Peter Bruhn, 2012),
the foundry shut down after Bruhn's death in 2014, and its EULA URL is long dead. The
files did come from CWA's own brand-book page —
`cyclingwithoutage.org/wp-content/uploads/2015/01/CWA-font-TacaPro.zip` — so the
provenance was sound; what was never established is whether CWA's licence extends to a
chapter self-hosting it as a webfont.

**To put it back**, once that is settled:

1. Ask **start@cyclingwithoutage.org** (the address the book gives for design assets,
   p. 43) whether their licence covers chapter webfont use. If not, Taca is sold today
   by the designer, Rúben R. Dias, at <https://myfonts.com/fonts/ruben-dias/taca> —
   a webfont licence for **Bold alone** covers the online spec.
2. Add the `.woff2` to `src/fonts/`, load it with `next/font/local` in
   `src/app/layout.tsx`, and point `--font-display` at it — leaving `--font-sans` on
   Arial, which is what the book asks for.

Full history, including the verified download chain, is in commits `b6e909e`, `ab4bf0c`
and the one that removed it.

- **Do not add a further font.** One family, differentiated by weight.
- Headline / body proportion stays consistent (the book uses 14pt/12pt/10pt print scale:
  small, steady steps — not giant jumps). Line height ≈ 1.2× for text blocks, paragraph
  spacing ≈ 1.6×. **Never justify text.**

## Voice & tone

The book's four tone words (pp. 16–17), each with a do/don't:

- **Light-hearted** — cheerful, positive, playful. Do: "Bubbles, cake, wind in our hair
  and lots of good pedal force on our maiden voyage." Don't: "Everyone was happy for the
  first trip."
- **Fun** — Do: "300 kilometers of delightful bonding between generations."
  Don't: "Many kilometers with elderly and younger."
- **Engaging** — concrete, specific, immersive. Do: "101-year old Thyra got tears in her
  eyes … a heart warm hug from her local grosser." Don't: "Thyra saw many beautiful
  things on the ride."
- **Authentic** — "We are genuine and real, down to earth and don't pose."

The pattern is the same each time: **name the person, the number, the specific detail.**
Abstractions ("happy", "many", "beautiful") are the don't-column in every example.

The five guiding principles behind the copy (p. 4): Generosity, Slowness, Storytelling,
Relationships, Without Age.

German copy: Sie-form for passengers, du-form for volunteers. Danish: informal.

- Name: **Cycling Without Age** (chapter naming: "Cycling Without Age +[city/country]", p. 12).
- Slogan: **"The right to wind in your hair"** / de "Recht auf Wind im Haar" /
  da "Ret til vind i håret". The slogan is never set larger than the CWA headline.

## Motifs

- **The diagonal edge**: a mint block with a sharp diagonal cut (see the brand's postcard /
  bike-sticker layout). Used as the signature decorative shape on covers and hero blocks.
- **The red slogan bar**: a full-width red band with white slogan text, always at the
  bottom edge of a layout.
- **The logo**: horizontal only, generous clear space (2 grid units), never distorted or
  recolored. The "thumbnail" bike glyph serves small spaces and dark grounds.
- **We love space. Less is definitely more.** One clear message per surface; generous
  whitespace; posters keep ~60% calm background. Translate that to screens: one hero
  action, calm sections, no visual clutter.

## Illustration & imagery

From the book (p. 14): photography "captures a slice of everyday life. It's never fake
or frivolous… It's about telling stories through personalities, interactions, and
experiences." Mainly color, but **black and white is also allowed**.

Imagery keeps its own colors and is never tinted or duotoned into the UI palette; the
chrome around it carries the brand instead.

There is no illustration system in this repo yet. If a surface needs artwork before
photography is available, add it deliberately — flat SVG with line work in `--ink` (the
same espresso as the type, per Colors above), mint vegetation and the CWA-red bench —
rather than reaching for stock imagery or emoji.

## Getting assets and answers from CWA

The book routes design questions to the Copenhagen hub (p. 43):

> "There are lots of design applications we can share with you… Don't hesitate to contact
> us at **start@cyclingwithoutage.org**."

That is the address to use for the logo lockups, the InDesign templates, city stickers
(p. 20), and — relevant here — **the TacaPro licensing question** in
`src/fonts/LICENSE.md`. The book specifies the typeface but does not supply or license
it; nothing in its 44 pages says where to obtain the font.
