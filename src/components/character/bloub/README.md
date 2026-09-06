# Vendored: bloub animation engine

Source: <https://github.com/jeremy-prt/bloub> — `src/bot/*`
Commit: `b4bb3c1b5f93c7b87a2e8d620f667c4093d97749` (2026-08-17)
License: MIT, © 2026 Jérémy Perret — see `LICENSE` in this folder.

Upstream is a Vue 3 app, and is not published to npm. Only its *view* is Vue;
everything in `src/bot/` is framework-free, deterministic TypeScript with no
DOM, no `Date.now()` and no `Math.random()` (all randomness is seeded
mulberry32 at module load). So the engine is vendored as-is and the view is
rewritten in React in `../character.tsx`.

## Rules

- **Every file here is byte-for-byte upstream, except the one diff below.**
  Keep it that way so `diff` against a future upstream stays readable.
- Prettier is switched off for this folder (`.prettierignore`) and
  `no-unused-vars` is off for it (`eslint.config.mjs`) — upstream's style is
  no-semi / single-quote / 100 col, this repo's is semi / double-quote / 80.
- Not vendored: `cycles.ts` (nothing in `src/bot/` imports it) and
  `src/ui/gaze.ts`, which `../gaze.ts` replaces rather than ports: upstream
  leans the head toward the cursor by a flat amount, ours aims at it.

## The one diff — `skins.ts`

`SHAPES` is trimmed to the single `cercle` entry; the `pebble` / `cloud` /
`droplet` / `capsule` consts, the `normalize` helper and the `./shape` imports
that only they used are deleted. `ShapeId`, `COLORS`, `COLOR_BY_ID` and
`DEFAULT_COLOR` are kept as-is (dead here, but deleting them is churn).

Why: `eyefit.ts` runs `const DECALAGES = batir()` at module import — 8 shapes ×
5 body states × 17 expressions, each a 12-direction × 8-step dichotomy over
64-point contours. That blocks the main thread on every page load. `cercle`
short-circuits inside `resous()` ("Deja bon : le cas du cercle"), so with one
shape the table is nearly free.

Measured on this machine (Node 20, transpile cached, time to evaluate the
`eyefit.ts` module body):

| `SHAPES` | import cost |
| --- | --- |
| upstream, 8 shapes | ~38 ms |
| trimmed, `cercle` only | ~10 ms |

To restore a shape, put its const and its `./shape` import back and re-add the
entry; nothing else in the engine needs to change.
