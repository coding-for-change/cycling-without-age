/* Brand tokens for email. Email clients cannot resolve CSS custom properties or
   load a stylesheet, so every value has to be a literal in an inline style —
   this file is that mirror of the `:root` block in src/app/globals.css, which
   stays the source of truth. `npm run check:brand` fails if the two drift.

   inkSoft / inkFaint / line are the alpha ink tints flattened over --canvas
   (ink at 62% / 42% / 12% over white), because Outlook's Word engine drops
   rgba(). */
export const brand = {
  font: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  fontUrl: "https://rsms.me/inter/font-files/InterVariable.woff2",

  canvas: "#ffffff",
  canvasDeep: "#f4f2ef",
  ink: "#2e2823",
  inkSoft: "#7d7a77",
  inkFaint: "#a7a5a3",
  line: "#e6e5e5",
  mint: "#92d2c6",
  mintDeep: "#28584e",
  red: "#ed1c24",

  radiusCover: "18px",
} as const;
