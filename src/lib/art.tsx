/* ==========================================================================
   The illustration system — hand-written flat SVG scenes, zero binary assets.

   Ported from the vanilla mockup's art.js, recolored to the CWA brand book:
   black line work · white/warm-grey neutrals · mint greens (caretaking) ·
   red strictly as the single warm accent (the bench, flowers, the heart).

     <Scene name="park"/>     -> 400x240 event / section cover art
     <Hero name="trishaw"/>   -> 360x260 storytelling illustration
     <Avatar name="Maria"/>   -> deterministic per-person avatar chip
     weather(ts)              -> stable mock weather

   Line work uses var(--art-ink) so the same drawing works on dark grounds
   (set `--art-ink: #fff` on the container).
   ========================================================================== */

/* Illustration palette — natural, friendly colors (a yellow sun, a blue sky,
   warm skin). The strict four-color brand rule governs UI chrome and type,
   not the hand-drawn artwork (see docs/BRAND.md); the artwork keeps the two
   brand anchors — mint vegetation and the CWA-red bench. */
const C = {
  mint: "#92CBBE",
  mintBg: "#DAF1EB",
  mintInk: "#1D534C",
  mintDeep: "#28584E",
  rose: "#ED1C24" /* the logo red — the trishaw bench, flowers, hearts */,
  roseBg: "#FDE9EA",
  sun: "#FBC337",
  sunBg: "#FEEAB9",
  sunInk: "#79460C",
  sky: "#3EA8F0",
  skyBg: "#CAE8FC",
  lav: "#B078DC",
  lavBg: "#EBD8F8",
  peach: "#F88359",
  peachBg: "#FDD8C9" /* warm skin tone */,
  peachInk: "#842B15",
  ink: "var(--art-ink, #332B26)" /* structure: re-colours on dark grounds */,
  face: "#332B26" /* eyes and mouths stay dark on skin */,
  paper: "#fff",
  canvasDeep: "#F2F0ED",
  white: "#fff",
};

/* ---------------------------------------------------------------- parts */
function sun(x: number, y: number, r: number, color?: string) {
  let rays = "";
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    rays += `<line x1="${(x + Math.cos(a) * (r + 5)).toFixed(1)}" y1="${(y + Math.sin(a) * (r + 5)).toFixed(1)}" x2="${(x + Math.cos(a) * (r + 13)).toFixed(1)}" y2="${(y + Math.sin(a) * (r + 13)).toFixed(1)}" stroke="${color || C.sun}" stroke-width="4" stroke-linecap="round"/>`;
  }
  return `<g class="spin-slow" style="transform-origin:${x}px ${y}px">${rays}</g><circle cx="${x}" cy="${y}" r="${r}" fill="${color || C.sun}"/>`;
}

function cloud(x: number, y: number, s: number, color?: string) {
  return `<g class="float-slow" transform="translate(${x},${y}) scale(${s})"><path d="M0 12a12 12 0 0 1 12-12 14 14 0 0 1 12 7 10 10 0 0 1 14 5 8 8 0 0 1-6 12H8A9 9 0 0 1 0 12Z" fill="${color || C.white}"/></g>`;
}

function tree(x: number, y: number, s: number, leaf?: string, trunk?: string) {
  return `<g transform="translate(${x},${y}) scale(${s})"><rect x="-4" y="-26" width="8" height="30" rx="4" fill="${trunk || C.peachInk}"/><circle cx="0" cy="-42" r="24" fill="${leaf || C.mint}"/><circle cx="-16" cy="-30" r="15" fill="${leaf || C.mint}"/><circle cx="16" cy="-31" r="14" fill="${leaf || C.mint}"/></g>`;
}

function conifer(x: number, y: number, s: number, color?: string) {
  return `<g transform="translate(${x},${y}) scale(${s})"><rect x="-3" y="-14" width="6" height="18" rx="3" fill="${C.peachInk}"/><path d="M0-60 20-22H-20Z" fill="${color || C.mintInk}"/><path d="M0-42 24-8H-24Z" fill="${color || C.mintInk}"/></g>`;
}

function bush(x: number, y: number, s: number, color?: string) {
  return `<g transform="translate(${x},${y}) scale(${s})"><circle cx="-11" cy="0" r="11" fill="${color || C.mint}"/><circle cx="11" cy="0" r="13" fill="${color || C.mint}"/><circle cx="0" cy="-8" r="14" fill="${color || C.mint}"/></g>`;
}

function flower(x: number, y: number, s: number, color?: string) {
  let p = "";
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
    p += `<circle cx="${(Math.cos(a) * 6).toFixed(1)}" cy="${(Math.sin(a) * 6).toFixed(1)}" r="5" fill="${color || C.rose}"/>`;
  }
  return `<g transform="translate(${x},${y}) scale(${s})"><line x1="0" y1="0" x2="0" y2="22" stroke="${C.mintInk}" stroke-width="3" stroke-linecap="round"/>${p}<circle cx="0" cy="0" r="3.5" fill="${C.sun}"/></g>`;
}

function ground(y: number, color: string) {
  return `<rect x="0" y="${y}" width="400" height="${240 - y}" fill="${color}"/>`;
}

/* a person: head + shoulders, seen from the side/front */
function person(
  x: number,
  y: number,
  s: number,
  opt: {
    skin?: string;
    hair?: string;
    cloth?: string;
    bald?: boolean;
    hairLong?: boolean;
  } = {},
) {
  const skin = opt.skin || C.peachBg;
  const hair = opt.hair || C.face;
  const cloth = opt.cloth || C.sky;
  return (
    `<g transform="translate(${x},${y}) scale(${s})">` +
    `<path d="M-16 30c0-11 7-19 16-19s16 8 16 19Z" fill="${cloth}"/>` +
    `<circle cx="0" cy="0" r="12" fill="${skin}"/>` +
    (opt.bald
      ? `<path d="M-12-1a12 12 0 0 1 24 0c0-9-5-13-12-13S-12-10-12-1Z" fill="${hair}"/>`
      : `<path d="M-12-2c0-9 5-14 12-14s12 5 12 14c0-4-4-6-12-6s-12 2-12 6Z" fill="${hair}"/>`) +
    (opt.hairLong
      ? `<path d="M-12-2c-4 8-4 16-2 22 3-6 4-12 3-18Z" fill="${hair}"/><path d="M12-2c4 8 4 16 2 22-3-6-4-12-3-18Z" fill="${hair}"/>`
      : "") +
    `<circle cx="-4.5" cy="1" r="1.6" fill="${C.face}"/>` +
    `<circle cx="4.5" cy="1" r="1.6" fill="${C.face}"/>` +
    `<path d="M-4 6q4 4 8 0" stroke="${C.face}" stroke-width="1.8" stroke-linecap="round"/>` +
    `</g>`
  );
}

function birds(x: number, y: number, s: number, color?: string) {
  return `<g transform="translate(${x},${y}) scale(${s})" stroke="${color || C.ink}" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".45" class="float-slow"><path d="M0 0q6-7 12 0q6-7 12 0"/><path d="M26 14q5-6 10 0q5-6 10 0"/></g>`;
}

function windLines(x: number, y: number, color?: string) {
  return `<g stroke="${color || C.white}" stroke-width="4" stroke-linecap="round" opacity=".85"><path d="M${x} ${y}h34" class="dash"/><path d="M${x + 10} ${y + 14}h24" class="dash" style="animation-delay:.2s"/><path d="M${x + 4} ${y + 28}h30" class="dash" style="animation-delay:.4s"/></g>`;
}

/* The trishaw, side view, facing left: two front wheels carrying the passenger
   bench (in CWA red, like the real canopies), one rear wheel with the pilot. */
function trishawDrawing(x: number, y: number, s: number) {
  const ink = C.ink;
  return (
    `<g transform="translate(${x},${y}) scale(${s})">` +
    `<circle cx="-40" cy="22" r="19" fill="none" stroke="${ink}" stroke-width="5" opacity=".3"/>` +
    `<circle cx="88" cy="14" r="28" fill="none" stroke="${ink}" stroke-width="6"/>` +
    `<circle cx="88" cy="14" r="4.5" fill="${ink}"/>` +
    `<path d="M88 14 42-4 -4 8" stroke="${ink}" stroke-width="6" fill="none" stroke-linecap="round"/>` +
    `<path d="M42-4 32-40" stroke="${ink}" stroke-width="6" stroke-linecap="round"/>` +
    `<circle cx="42" cy="-4" r="8" fill="none" stroke="${ink}" stroke-width="4"/>` +
    `<path d="M-6 8-4-54 16-58" stroke="${ink}" stroke-width="5" fill="none" stroke-linecap="round"/>` +
    `<path d="M28-42 48-18 36 6" stroke="${C.peachInk}" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M14-44h26a6 6 0 0 1 0 11H18Z" fill="${ink}"/>` +
    `<path d="M30-40 12-68" stroke="${C.mint}" stroke-width="22" stroke-linecap="round"/>` +
    `<path d="M14-70-2-56" stroke="${C.mint}" stroke-width="7" stroke-linecap="round"/>` +
    `<circle cx="8" cy="-82" r="12" fill="${C.peachBg}"/>` +
    `<circle cx="2" cy="-80" r="1.7" fill="${C.face}"/>` +
    `<path d="M-3-74q5 4 9 0" stroke="${C.face}" stroke-width="1.8" stroke-linecap="round" fill="none"/>` +
    `<path d="M-4-86a12 12 0 0 1 24-2l-2 3Z" fill="${ink}"/>` +
    `<path d="M-4-84h-6" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>` +
    `<path d="M-108 18h76c7 0 11-5 11-12v-10c0-11-9-20-20-20h-46c-12 0-21 9-21 20v22Z" fill="${C.rose}"/>` +
    `<path d="M-108 6h84" stroke="${C.white}" stroke-width="3" opacity=".28"/>` +
    `<path d="M-104-24h64a7 7 0 0 1 7 7v9h-78v-9a7 7 0 0 1 7-7Z" fill="${C.sun}"/>` +
    person(-78, -52, 1.05, {
      skin: C.peachBg,
      hair: "#b9b3ad",
      cloth: C.lav,
      hairLong: true,
    }) +
    person(-46, -47, 0.95, {
      skin: C.peachBg,
      hair: "#cfc7bf",
      cloth: C.mintBg,
      bald: true,
    }) +
    `<circle cx="-96" cy="22" r="21" fill="none" stroke="${ink}" stroke-width="6"/>` +
    `<circle cx="-96" cy="22" r="4" fill="${ink}"/>` +
    `</g>`
  );
}

/* ---------------------------------------------------------------- scenes */
const SCENES: Record<string, () => string> = {
  /* a green park loop — the classic pleasure ride */
  park: () =>
    ground(176, C.mintBg) +
    `<path d="M0 176q120-10 190 12t210 6v46H0Z" fill="${C.mint}" opacity=".35"/>` +
    sun(338, 46, 20) +
    cloud(40, 40, 1.1) +
    cloud(190, 28, 0.8) +
    tree(58, 186, 1.05) +
    tree(120, 180, 0.72, C.mintInk) +
    conifer(342, 190, 0.9) +
    bush(196, 196, 0.9) +
    bush(268, 200, 0.7, C.mintInk) +
    `<path d="M-10 232q120-38 200-30t220-14" stroke="${C.sunBg}" stroke-width="16" stroke-linecap="round"/>` +
    flower(160, 208, 0.8) +
    flower(232, 214, 0.7, C.lav) +
    birds(238, 62, 1),
  /* summer festival — bunting, tents, balloons */
  festival: () => {
    let bunt = "";
    for (let i = 0; i < 11; i++) {
      const bx = 12 + i * 38;
      const by = 34 + Math.sin(i * 0.9) * 9;
      bunt += `<path d="M${bx} ${by}l11 0-5.5 15Z" fill="${[C.rose, C.sun, C.mint, C.sky, C.lav][i % 5]}"/>`;
    }
    return (
      ground(180, C.sunBg) +
      `<path d="M-10 26q100 26 200 4t220 12" stroke="${C.ink}" stroke-width="2.5" fill="none"/>` +
      bunt +
      sun(56, 62, 17, C.peach) +
      `<path d="M96 180 140 110l44 70Z" fill="${C.rose}"/>` +
      `<path d="M140 110 118 180h22Z" fill="${C.white}" opacity=".35"/>` +
      `<path d="M212 180 250 126l38 54Z" fill="${C.sky}"/>` +
      `<rect x="300" y="140" width="72" height="40" rx="8" fill="${C.mint}"/>` +
      `<rect x="300" y="140" width="72" height="12" rx="6" fill="${C.mintInk}"/>` +
      `<g class="float"><circle cx="60" cy="128" r="14" fill="${C.lav}"/><path d="M60 142v30" stroke="${C.ink}" stroke-width="2"/></g>` +
      `<g class="float" style="animation-delay:.8s"><circle cx="36" cy="150" r="11" fill="${C.sun}"/><path d="M36 161v18" stroke="${C.ink}" stroke-width="2"/></g>` +
      bush(340, 196, 0.8) +
      flower(190, 206, 0.8, C.rose) +
      flower(64, 210, 0.7, C.sun)
    );
  },
  /* care home / partner facility */
  care: () =>
    ground(178, C.mintBg) +
    cloud(70, 34, 1) +
    sun(330, 44, 18) +
    `<rect x="104" y="86" width="196" height="94" rx="10" fill="${C.white}"/>` +
    `<path d="M96 88 202 40l106 48Z" fill="${C.rose}"/>` +
    `<rect x="126" y="106" width="34" height="30" rx="5" fill="${C.skyBg}"/>` +
    `<rect x="176" y="106" width="34" height="30" rx="5" fill="${C.skyBg}"/>` +
    `<rect x="226" y="106" width="34" height="30" rx="5" fill="${C.skyBg}"/>` +
    `<rect x="180" y="146" width="42" height="34" rx="6" fill="${C.sunBg}"/>` +
    `<circle cx="214" cy="164" r="3" fill="${C.ink}"/>` +
    tree(58, 190, 0.9) +
    tree(348, 188, 0.8, C.mintInk) +
    bush(120, 192, 0.7) +
    flower(276, 196, 0.75, C.lav) +
    flower(300, 202, 0.65, C.rose),
  /* lake / riverside outing */
  lake: () =>
    `<rect x="0" y="0" width="400" height="240" fill="${C.skyBg}"/>` +
    sun(64, 52, 20, C.peach) +
    cloud(230, 36, 1.1) +
    `<path d="M0 150q80-34 150-10t250-24v124H0Z" fill="${C.mintInk}" opacity=".35"/>` +
    `<rect x="0" y="150" width="400" height="90" fill="${C.mint}"/>` +
    `<g stroke="${C.white}" stroke-width="3" stroke-linecap="round" opacity=".6"><path d="M40 178h40M120 194h56M230 176h44M296 202h48M60 214h52"/></g>` +
    `<path d="M236 150 236 96l44 54Z" fill="${C.white}"/>` +
    `<path d="M230 150h58l-10 12h-38Z" fill="${C.rose}"/>` +
    conifer(46, 156, 0.8) +
    conifer(90, 152, 0.6) +
    tree(348, 152, 0.7),
  /* café stop — the errand ride's happy end */
  cafe: () =>
    ground(182, C.peachBg) +
    cloud(56, 36, 0.9) +
    sun(342, 40, 16) +
    `<path d="M104 118h192l-14-26H118Z" fill="${C.rose}"/>` +
    `<path d="M118 92h178l6 12H112Z" fill="${C.white}" opacity=".3"/>` +
    `<rect x="112" y="118" width="176" height="64" rx="8" fill="${C.white}"/>` +
    `<rect x="140" y="136" width="52" height="46" rx="6" fill="${C.skyBg}"/>` +
    `<rect x="212" y="136" width="52" height="46" rx="6" fill="${C.sunBg}"/>` +
    `<rect x="42" y="164" width="52" height="7" rx="3.5" fill="${C.ink}"/>` +
    `<path d="M64 171v22M72 171v22" stroke="${C.ink}" stroke-width="5" stroke-linecap="round"/>` +
    `<path d="M50 152h20v9a5 5 0 0 1-5 5h-10a5 5 0 0 1-5-5Z" fill="${C.mint}"/>` +
    `<path d="M70 154h6a4 4 0 0 1 0 8h-6" stroke="${C.mint}" stroke-width="3"/>` +
    `<g class="float"><path d="M58 142c4-5-4-8 0-13" stroke="${C.ink}" stroke-width="2.5" stroke-linecap="round" opacity=".45"/></g>` +
    bush(340, 196, 0.8) +
    flower(324, 176, 0.6, C.rose),
  /* weekly market run */
  market: () => {
    const stall = (x: number, c: string) =>
      `<g transform="translate(${x},0)"><rect x="0" y="112" width="90" height="12" rx="4" fill="${C.ink}"/><path d="M0 112 12 78h66l12 34Z" fill="${c}"/><path d="M12 78h22l-6 34H0Z" fill="${C.white}" opacity=".35"/><rect x="8" y="124" width="74" height="46" rx="6" fill="${C.white}"/><circle cx="26" cy="140" r="8" fill="${C.rose}"/><circle cx="45" cy="140" r="8" fill="${C.sun}"/><circle cx="64" cy="140" r="8" fill="${C.mint}"/></g>`;
    return (
      ground(170, C.sunBg) +
      cloud(200, 30, 0.9) +
      sun(48, 44, 16) +
      stall(56, C.rose) +
      stall(180, C.sky) +
      stall(300, C.mint) +
      `<path d="M-10 214q200-22 420 0" stroke="${C.peachBg}" stroke-width="14" stroke-linecap="round"/>`
    );
  },
  /* rose garden (Westpark) */
  rose: () =>
    ground(172, C.mintBg) +
    sun(60, 46, 18) +
    cloud(280, 34, 1) +
    `<path d="M0 200q120-30 200-12t200-16v68H0Z" fill="${C.mint}" opacity=".4"/>` +
    `<path d="M-10 186q120-16 210 0t210-8" stroke="${C.sunBg}" stroke-width="12" stroke-linecap="round"/>` +
    flower(126, 150, 1.15, C.rose) +
    flower(168, 158, 1, C.peach) +
    flower(210, 146, 1.2, C.rose) +
    flower(252, 158, 1, C.lav) +
    flower(292, 150, 1.1, C.rose) +
    flower(96, 196, 0.85, C.sun) +
    flower(320, 198, 0.85, C.lav) +
    bush(46, 200, 1) +
    bush(364, 196, 0.9, C.mintInk) +
    birds(206, 58, 0.9),
  /* the chapter garage */
  garage: () =>
    ground(184, C.canvasDeep) +
    cloud(70, 34, 0.9) +
    sun(336, 44, 16) +
    `<rect x="86" y="96" width="228" height="88" rx="8" fill="${C.white}"/>` +
    `<path d="M74 98 200 44l126 54Z" fill="${C.ink}"/>` +
    `<rect x="122" y="116" width="156" height="68" rx="6" fill="${C.sky}" opacity=".25"/>` +
    `<path d="M122 132h156M122 150h156M122 168h156" stroke="${C.white}" stroke-width="3"/>` +
    trishawDrawing(196, 152, 0.42) +
    bush(56, 196, 0.8) +
    bush(352, 194, 0.7, C.mintInk),
};

/* ---------------------------------------------------------------- heroes */
const HEROES: Record<string, () => string> = {
  /* the money shot: a ride in progress */
  trishaw: () =>
    sun(298, 52, 24) +
    cloud(48, 44, 1.2) +
    cloud(196, 26, 0.85) +
    `<path d="M-20 214q110-26 200-8t200-10v70H-20Z" fill="${C.mintBg}"/>` +
    tree(22, 218, 0.6, C.mint) +
    tree(332, 220, 0.58, C.mintInk) +
    windLines(238, 118, C.mint) +
    `<g class="roll">${trishawDrawing(150, 176, 0.92)}</g>` +
    `<path d="M-20 224q200-16 400 0" stroke="${C.sunBg}" stroke-width="10" stroke-linecap="round"/>`,
  /* wind in the hair */
  wind: () =>
    `<circle cx="180" cy="128" r="96" fill="${C.mintBg}"/>` +
    `<g transform="translate(196,132) scale(3.1)"><circle cx="0" cy="0" r="12" fill="${C.peachBg}"/><path d="M-12-2c0-9 5-14 12-14s12 5 12 14c0-4-4-6-12-6s-12 2-12 6Z" fill="#b6afa8"/><circle cx="-4.5" cy="1" r="1.6" fill="#000"/><circle cx="4.5" cy="1" r="1.6" fill="#000"/><path d="M-5 6q5 5 10 0" stroke="#000" stroke-width="1.8" stroke-linecap="round"/></g>` +
    `<g stroke="#b6afa8" stroke-width="9" stroke-linecap="round" fill="none"><path d="M150 92q-52 8-70 34" class="float"/><path d="M148 118q-58 4-84 26" class="float" style="animation-delay:.5s"/><path d="M152 146q-48 10-66 30" class="float" style="animation-delay:.9s"/></g>` +
    windLines(46, 60, C.mint) +
    `<g class="float"><path d="M292 84c6-10 22-6 22 6 0 10-12 18-22 24-10-6-22-14-22-24 0-12 16-16 22-6Z" fill="${C.rose}"/></g>`,
  /* two people talking */
  chat: () =>
    `<circle cx="180" cy="130" r="98" fill="${C.skyBg}"/>` +
    `<g class="float"><rect x="52" y="62" width="150" height="72" rx="24" fill="${C.white}"/><path d="M84 130 72 156l34-22Z" fill="${C.white}"/><rect x="76" y="86" width="90" height="9" rx="4.5" fill="${C.ink}" opacity=".18"/><rect x="76" y="104" width="60" height="9" rx="4.5" fill="${C.ink}" opacity=".18"/></g>` +
    `<g class="float" style="animation-delay:.7s"><rect x="158" y="132" width="150" height="70" rx="24" fill="${C.ink}"/><path d="M276 198 288 224l-34-22Z" fill="${C.ink}"/><rect x="182" y="154" width="94" height="9" rx="4.5" fill="${C.white}" opacity=".55"/><rect x="182" y="172" width="56" height="9" rx="4.5" fill="${C.white}" opacity=".55"/></g>` +
    `<g class="beat"><path d="M300 62c5-9 19-5 19 5 0 9-11 16-19 21-8-5-19-12-19-21 0-10 14-14 19-5Z" fill="${C.rose}"/></g>`,
  /* pick a day */
  calendar: () => {
    let cells = "";
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 5; c++) {
        const on = r === 1 && c === 2;
        cells += `<rect x="${96 + c * 34}" y="${118 + r * 34}" width="26" height="26" rx="8" fill="${C.ink}" opacity="${on ? 1 : 0.12}"${on ? ' class="pop"' : ""}/>`;
      }
    }
    return (
      `<circle cx="180" cy="130" r="98" fill="${C.lavBg}"/>` +
      `<rect x="78" y="58" width="204" height="168" rx="26" fill="${C.white}"/>` +
      `<rect x="78" y="58" width="204" height="42" rx="26" fill="${C.mint}"/>` +
      `<rect x="78" y="86" width="204" height="14" fill="${C.mint}"/>` +
      `<rect x="112" y="42" width="12" height="30" rx="6" fill="${C.ink}"/>` +
      `<rect x="236" y="42" width="12" height="30" rx="6" fill="${C.ink}"/>` +
      cells +
      `<g class="float"><circle cx="286" cy="200" r="26" fill="${C.mint}"/><path d="M274 200l8 9 16-18" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></g>`
    );
  },
  /* training / safety */
  helmet: () =>
    `<circle cx="180" cy="130" r="98" fill="${C.mintBg}"/>` +
    `<path d="M96 158a84 84 0 0 1 168 0Z" fill="${C.rose}"/>` +
    `<path d="M96 158h180a10 10 0 0 1 0 20H96a10 10 0 0 1 0-20Z" fill="${C.ink}"/>` +
    `<path d="M132 106a56 56 0 0 1 44-18" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity=".5"/>` +
    `<g class="pop"><circle cx="264" cy="190" r="30" fill="${C.mint}"/><path d="M250 190l10 11 18-22" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></g>` +
    `<g class="float"><path d="M74 84l7 15 15 7-15 7-7 15-7-15-15-7 15-7Z" fill="${C.sun}"/></g>`,
  /* passkey / secure sign-in */
  key: () =>
    `<circle cx="180" cy="130" r="96" fill="${C.sunBg}"/>` +
    `<rect x="106" y="96" width="148" height="112" rx="28" fill="${C.ink}"/>` +
    `<circle cx="180" cy="138" r="24" fill="none" stroke="${C.mint}" stroke-width="9"/>` +
    `<path d="M180 162v26M180 178h16" stroke="${C.mint}" stroke-width="9" stroke-linecap="round"/>` +
    `<path d="M138 96V78a42 42 0 0 1 84 0v18" stroke="${C.ink}" stroke-width="12" fill="none" stroke-linecap="round"/>` +
    `<g class="float"><circle cx="286" cy="76" r="14" fill="${C.mint}"/></g>` +
    `<g class="float" style="animation-delay:.6s"><circle cx="74" cy="188" r="10" fill="${C.rose}"/></g>`,
  /* community / volunteering */
  hands: () =>
    `<circle cx="180" cy="130" r="96" fill="${C.peachBg}"/>` +
    `<g class="beat"><path d="M180 88c14-26 56-16 56 18 0 30-34 52-56 66-22-14-56-36-56-66 0-34 42-44 56-18Z" fill="${C.rose}"/></g>` +
    `<path d="M62 200c14-16 34-16 48-4" stroke="${C.ink}" stroke-width="9" stroke-linecap="round"/>` +
    `<path d="M298 200c-14-16-34-16-48-4" stroke="${C.ink}" stroke-width="9" stroke-linecap="round"/>` +
    `<g class="float"><circle cx="86" cy="82" r="11" fill="${C.sun}"/></g>` +
    `<g class="float" style="animation-delay:.8s"><circle cx="286" cy="88" r="14" fill="${C.mint}"/></g>`,
  /* done / celebrate */
  celebrate: () => {
    let conf = "";
    const xs = [58, 96, 140, 226, 268, 306, 78, 300, 176];
    const ys = [72, 44, 60, 48, 66, 92, 168, 172, 30];
    const cs = [
      C.sun,
      C.rose,
      C.mint,
      C.sky,
      C.lav,
      C.peach,
      C.sun,
      C.mint,
      C.rose,
    ];
    for (let i = 0; i < xs.length; i++) {
      conf += `<rect x="${xs[i]}" y="${ys[i]}" width="12" height="12" rx="3" fill="${cs[i]}" transform="rotate(${i * 37} ${xs[i] + 6} ${ys[i] + 6})" class="float" style="animation-delay:${(i * 0.14).toFixed(2)}s"/>`;
    }
    return (
      `<circle cx="180" cy="140" r="86" fill="${C.mintBg}"/>` +
      conf +
      `<g class="pop"><circle cx="180" cy="140" r="58" fill="${C.mint}"/><path d="M154 140l18 19 34-40" stroke="#fff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" class="draw"/></g>`
    );
  },
  /* where we pick you up */
  map: () =>
    `<circle cx="180" cy="130" r="98" fill="${C.skyBg}"/>` +
    `<rect x="82" y="66" width="196" height="140" rx="24" fill="${C.white}"/>` +
    `<path d="M82 150q54-26 96 0t100-18" stroke="${C.mintBg}" stroke-width="18" fill="none"/>` +
    `<path d="M110 206q22-70 74-70t84-52" stroke="${C.sunBg}" stroke-width="12" fill="none" stroke-linecap="round"/>` +
    `<path d="M124 66v140M212 66v140" stroke="${C.ink}" stroke-width="3" opacity=".08"/>` +
    `<path d="M82 118h196M82 172h196" stroke="${C.ink}" stroke-width="3" opacity=".08"/>` +
    `<g class="float"><path d="M212 84c20 0 36 16 36 36 0 26-36 58-36 58s-36-32-36-58c0-20 16-36 36-36Z" fill="${C.rose}"/><circle cx="212" cy="120" r="13" fill="#fff"/></g>` +
    `<circle cx="120" cy="176" r="12" fill="${C.ink}"/>` +
    `<circle cx="120" cy="176" r="24" fill="${C.ink}" opacity=".12" class="beat"/>`,
};

/* each scene gets its own sky so covers read as places, not as plates */
const SKIES: Record<string, string> = {
  park: C.skyBg,
  festival: C.lavBg,
  care: C.skyBg,
  lake: C.skyBg,
  cafe: C.peachBg,
  market: C.skyBg,
  rose: C.lavBg,
  garage: C.skyBg,
};

export const sceneNames = Object.keys(SCENES);
export const heroNames = Object.keys(HEROES);

export function Scene({
  name,
  bg = true,
  className = "",
}: {
  name: string;
  bg?: boolean;
  className?: string;
}) {
  const fn = SCENES[name] || SCENES.park;
  const bgRect = bg
    ? `<rect width="400" height="240" fill="${SKIES[name] || C.canvasDeep}"/>`
    : "";
  return (
    <svg
      viewBox="0 0 400 240"
      className={`art art-scene ${className}`}
      fill="none"
      role="img"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
      dangerouslySetInnerHTML={{ __html: bgRect + fn() }}
    />
  );
}

export function Hero({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  const fn = HEROES[name] || HEROES.trishaw;
  return (
    <svg
      viewBox="0 0 360 260"
      className={`art art-hero ${className}`}
      fill="none"
      role="img"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: fn() }}
    />
  );
}

/* deterministic avatar: same person -> same tone, every render.
   Soft pastel chips with dark ink — friendly, never harsh. */
const AV_TONES = [
  { bg: C.sunBg, fg: C.sunInk },
  { bg: C.mintBg, fg: C.mintInk },
  { bg: C.skyBg, fg: "#104474" },
  { bg: C.lavBg, fg: "#503465" },
  { bg: C.peachBg, fg: C.peachInk },
  { bg: C.roseBg, fg: "#7A1216" },
];

export function avatarTone(name: string) {
  const s = String(name || "?");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AV_TONES[h % AV_TONES.length];
}

export function initials(name: string): string {
  return String(name || "?")
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/* mock but stable weather, so the demo never contradicts itself */
const WX = [
  { icon: "sunMedium", tKey: "wx.sunny", c: 21 },
  { icon: "sun", tKey: "wx.clear", c: 24 },
  { icon: "cloud", tKey: "wx.mild", c: 18 },
  { icon: "sunset", tKey: "wx.golden", c: 19 },
  { icon: "sunMedium", tKey: "wx.breezy", c: 17 },
];

export function weather(ts?: number): {
  icon: string;
  tKey: string;
  deg: number;
} {
  const d = new Date(ts || Date.now());
  const k = d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate();
  const w = WX[k % WX.length];
  return { icon: w.icon, tKey: w.tKey, deg: w.c + (k % 4) };
}
