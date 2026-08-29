---
name: frontend
description: Use when writing or changing ANY user-facing UI in this repo — pages, components, styles, copy, icons. Enforces the official Cycling Without Age brand style guide (colors, typography, tone) and this codebase's UI conventions.
---

# CWA frontend rules

Every visible pixel in this app follows the official Cycling Without Age Brand Book.
Read `docs/BRAND.md` (the condensed brand rules) before styling anything new.

## Non-negotiables

Rules 1, 2, 5–9 come from the brand book. Rules 3 and 4 are this product's screen
interpretation and are marked as such — `docs/BRAND.md` separates the two in full, with
page references. Don't cite the book for a rule it doesn't make.

1. **Four colors for UI chrome**: ink, white, mint `#92D2C6`, red `#ED1C24` — plus
   tints of those. Never introduce another hue into chrome (buttons, badges, tiles,
   nav, backgrounds). The tokens live in `src/app/globals.css` and are exposed as
   Tailwind utilities (`bg-mint`, `text-ink`, `border-line`, …). **Use the tokens;
   never hardcode a hex value in a component.**
2. **Type is ink or white. Only.** `--ink` is a warm espresso near-black (`#2e2823`) —
   softer than pure `#000`, still reads as the brand's black. Secondary text =
   `--ink-soft` (ink at reduced opacity), never mint or red text in chrome.
3. **Red is reserved** (a product decision, not a brand-book rule): the primary action on
   a screen, live/critical states, the logo, the slogan bar. If red appears more than a
   couple of times per screen, cut it back. The book uses red freely in the physical
   world; on screen, scarcity is what makes the one action that matters legible.
4. **Mint is the caretaking color**: color blocks, positive states, progress, the
   signature diagonal-edge motif. **Dark surfaces are `--mint-deep`, never pure black** —
   no black pills with white type. White type belongs on red or `--mint-deep` only.
   Note `--mint-deep` is a fifth color this product added; the book has four. Keep it for
   dark surfaces and don't spawn further shades off it.
5. **Typography**: the book's *online* spec is TacaPro **bold** headlines, Arial bold
   highlights, Arial regular body (`docs/BRAND.md` has the table). Here: TacaPro carries
   headlines — `h1`–`h4` default to it, elsewhere use the `font-display` utility — and
   body text stays on the app's sans (Inter, substituting Arial). **Weight 700 is the
   only TacaPro weight the online spec calls for.** Do not add any further font.
6. **Whitespace is a feature** ("We love space. Less is definitely more."): one clear
   hero action per screen, calm sections, never justify text.
7. **Tone**: light-hearted, fun, engaging, authentic. Storytelling copy, concrete detail
   over abstraction. Copy is currently English-only; when i18n lands, German uses
   Sie-form for passengers and du-form for pilots/volunteers, Danish is informal — so
   write strings that can be extracted, and never bake user-visible text into a
   conditional or a template deep in the markup.
8. **Logo**: horizontal lockup, clear space, never restyled. The slogan "The right to
   wind in your hair" is never set larger than the accompanying CWA headline.
9. **Icons**: `lucide-react` only (the configured icon library). No emoji as icons, no
   icon fonts, no external image assets for iconography.

## Codebase conventions

- **Architecture**: `AGENTS.md` is the authority — strict vertical slices, imports flow
  downward only. UI lives in `src/app/**` (routes) and `src/features/*/components`
  (feature-specific "smart" components). Presentation calls Server Actions, Use Cases,
  or Feature Facades — never a Service or the DB.
- **Primitives**: build on the shadcn components already in `src/components/ui/`
  (`button`, `card`, `dialog`, `badge`, `table`, `tabs`, `sheet`, …) before writing a new
  one. Style is `new-york`, RSC on. Compose class names with `cn()` from `@/lib/utils`.
  Anything genuinely shared and stateless that shadcn doesn't cover belongs in
  `src/components/ui/`; anything domain-specific belongs in its feature slice.
- **Brand vs. shadcn**: the shadcn primitives ship with their own neutral token set
  (`--primary`, `--muted`, …) that is *not* the brand palette. When a component is a
  brand surface, pass brand tokens explicitly (`className="bg-mint text-ink"`); don't
  quietly redefine the shadcn tokens, or every dialog and dropdown in the app shifts
  with it.
- **Formatting**: currency in EUR, times 24h, dates locale-aware via `Intl` (not a
  hand-rolled formatter).
- **Accessibility**: every interactive element keyboard-reachable, `aria-label` on
  icon-only buttons, visible focus states, and respect `prefers-reduced-motion` on any
  animation you add.

## What is deliberately not here yet

There is no shared UI kit beyond shadcn, no i18n module, no client store, and no
illustration system in this repo yet. If a task needs one, build it in the right layer
per `AGENTS.md` and extend this skill in the same change — do not import from a mockup.
