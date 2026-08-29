# Cycling Without Age — Brand rules for this app

Source of truth: the official CWA Brand Book (Nov 2019), https://cyclingwithoutage.org/brand-book/.
This file condenses it into rules the frontend must follow. The `.claude/skills/frontend`
skill points here.

## Colors — the entire palette

The brand has exactly four colors. Everything on screen derives from them.

| Token         | Value     | Brand meaning / usage                                              |
| ------------- | --------- | ------------------------------------------------------------------ |
| Black         | `#000000` | Font color, line work, ink fills. (Print: CMYK 30/30/30/100)       |
| White         | `#FFFFFF` | Canvas, cards, font color on dark/red grounds                      |
| Mint Green    | `#92D2C6` | "Caretaking." Color blocks, accents, the diagonal-edge motif. PMS 565C |
| Red           | `#ED1C24` | "Energy, action, passion." The logo red. **Reserved for primary actions and alerts.** PMS 485C |

Rules (as applied in this product — the digital interpretation):
- **Font colors are only ink and white.** Never set type in mint, red, or grey-as-a-color.
  (`--ink` is a warm espresso near-black `#2e2823` — the screen rendering of the brand's
  rich black; ink at reduced opacity for secondary text is fine.)
- Derived tints of the four colors are allowed for UI surfaces (the brand book itself uses
  80%-transparency mint/red boxes): e.g. `mint-tint`, `red-tint`, warm greys = ink at low
  opacity. Do not introduce any new hue into UI chrome (no blue, amber, violet, …).
- **No pure-black surfaces.** Solid black blocks with white type read harsh on screen;
  every dark surface (tiles, active tab pill, toasts, hero blocks, admin chat bubbles)
  uses `mint-deep #28584E` — the darkened caretaking green — instead.
- Because mint `#92D2C6` is light, text on mint is **ink**. White type only sits on
  red or `mint-deep`.
- **Illustrations & avatars are exempt from the four-color rule.** The hand-drawn SVG
  art uses natural, logical colors (yellow sun, blue sky, warm skin, soft pastels) so
  scenes read as places — anchored by the two brand constants: mint vegetation and the
  CWA-red trishaw bench. The strict palette governs chrome and typography, not artwork.
- Red must stay scarce: primary CTA, live/critical badges, the slogan bar, the logo. If a
  screen has red everywhere, it is wrong ("we don't turn our rickshaws into canaries").
- Colors shouldn't steal the show — content is king. Default ground is white with black
  type; mint carries warmth; red carries the one action that matters.

## Typography

- **TacaPro** (the corporate font, bundled in `src/fonts/`) — headlines, display numerals,
  buttons that act as headlines. Weights: Regular 400, Bold 700, Extrabold 800.
  Exposed as `--font-taca` / utility class `font-display`.
- **Arial** (system) — all body text. Bold Arial for inline highlights.
  This is straight from the brand book's "online" spec: TacaPro headlines, Arial body.
- Headline / body proportion stays consistent (the book uses 14pt/12pt/10pt print scale:
  small, steady steps — not giant jumps). Line height ≈ 1.2× for text blocks, paragraph
  spacing ≈ 1.6×. **Never justify text.**

## Voice & tone

Light-hearted · fun · engaging · authentic. Storytelling over statistics; concrete over
abstract ("Bubbles, cake, wind in our hair" — not "everyone was happy"). German copy:
Sie-form for passengers, du-form for volunteers. Danish: informal.

- Name: **Cycling Without Age** (chapter naming: "Cycling Without Age + city").
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

Real CWA photography tells stories; this prototype has none, so it uses a hand-drawn flat
SVG system (`src/lib/art.tsx`) instead. Artwork uses natural colors (see above) with
espresso line work, so scenes feel warm and real the way the brand's photography does —
never washed into the UI palette.
