---
name: frontend
description: Use when writing or changing ANY user-facing UI in this repo — pages, components, styles, copy, icons, artwork. Enforces the official Cycling Without Age brand style guide (colors, typography, tone) and this codebase's component conventions.
---

# CWA frontend rules

Every visible pixel in this app follows the official Cycling Without Age Brand Book.
Read `docs/BRAND.md` (condensed brand rules) before styling anything new.

## Non-negotiables (the brand book, condensed)

1. **Four colors for UI chrome**: ink, white, mint `#92D2C6`, red `#ED1C24` — plus
   tints of those. Never introduce another hue into chrome (buttons, badges, tiles,
   nav, backgrounds). All tokens exist in `src/app/globals.css`; use tokens, never
   hardcoded hex in components. **Illustrations are exempt**: the SVG art system
   (`src/lib/art.tsx`) and avatar chips use natural, logical colors (a yellow sun, a
   blue sky, warm skin) — anchored by mint vegetation and the CWA-red trishaw bench.
2. **Type is ink or white. Only.** `--ink` is a warm espresso near-black (`#2e2823`) —
   softer than pure `#000`, still reads as the brand's black. Secondary text =
   `--ink-soft` (ink at reduced opacity), never mint/red text in chrome.
3. **Red is reserved**: the primary action on a screen, live/critical states, the logo,
   the slogan bar. If red appears more than a couple of times per screen, cut it back.
4. **Mint is the caretaking color**: color blocks, positive states, progress, the
   signature diagonal-edge motif. **Dark surfaces are `--mint-deep`, never pure black** —
   no black bubbles/pills with white type; solid-dark tiles, active tab pills, toasts,
   hero blocks and admin chat bubbles all sit on deep mint. White type belongs on red
   or `--mint-deep` only.
5. **Typography**: TacaPro (`font-display`, bundled locally) for headlines/display
   numerals; Arial for body text. No other fonts, no Google-font imports.
6. **Whitespace is a feature** ("We love space. Less is definitely more."): one clear
   hero action per screen, calm sections, never justify text.
7. **Tone**: light-hearted, fun, engaging, authentic. Storytelling copy, concrete detail.
   All UI strings go through i18n (`src/lib/i18n`) in EN + DE + DA — German uses Sie-form
   for passengers, du-form for pilots/volunteers; Danish is informal. Never hardcode a
   visible string.
8. **Logo**: horizontal lockup, clear space, never restyled. Slogan "The right to wind in
   your hair" never larger than the accompanying CWA headline.
9. **Artwork**: only the built-in SVG art system (`src/lib/art.tsx`), which is already
   brand-mapped (black line work, mint/grey/white fills, red accents). No emoji as icons,
   no external images; icons come from `lucide-react`.

## Codebase conventions

- Structure: Next.js App Router + TypeScript. Shared state: the zustand store in
  `src/lib/store.ts` — ALL writes go through `update(fn)`; queue mock push notifications
  with `notify(db, audience, key, params, href)` inside the same update.
- Components: reuse the primitives in `src/components/` (Tile, BtnHero, HeroHead,
  BackHead, TabBar, Cover, EventCard, Ring, Seg, BigOption, ChatThread, …) before
  inventing new ones. Senior-facing screens (passenger app) use the big-type variants —
  the `senior` wrapper class scales type and touch targets automatically.
- Formatting: dates/numbers via `fmt` from the i18n module (locale-aware), currency in
  EUR, times 24h.
- Accessibility: every interactive element keyboard-reachable, aria-labels on icon-only
  buttons, `prefers-reduced-motion` respected (the global CSS already disables the motion
  classes — don't add unguarded animations).
