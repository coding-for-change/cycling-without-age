import { chromium } from "playwright-core";
import ffmpeg from "ffmpeg-static";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const BASE = process.env.APP_URL ?? "http://localhost:3000";
export const MEDIA = process.env.MEDIA_DIR ?? path.resolve("clips");
const MAILPIT = `${process.env.MAILPIT_URL ?? "http://localhost:8026"}/api/v1`;
const WORK = path.dirname(new URL(import.meta.url).pathname);

const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };

const HIDE_DEV_OVERLAY = `
  document.addEventListener("DOMContentLoaded", () => {
    const style = document.createElement("style");
    style.textContent = "nextjs-portal{display:none!important}";
    document.head.appendChild(style);
  });
`;

const CURSOR = `
  (() => {
    if (window.__cursor) return;
    window.__cursor = true;
    const make = () => {
      const dot = document.createElement("div");
      Object.assign(dot.style, {
        position: "fixed", left: "0px", top: "0px", width: "18px", height: "18px",
        marginLeft: "-9px", marginTop: "-9px", borderRadius: "50%",
        background: "rgba(20,20,20,.35)", border: "2px solid rgba(255,255,255,.9)",
        boxShadow: "0 1px 4px rgba(0,0,0,.35)", pointerEvents: "none",
        zIndex: "2147483647", transition: "transform .12s ease",
      });
      document.documentElement.appendChild(dot);
      addEventListener("mousemove", (e) => { dot.style.left = e.clientX + "px"; dot.style.top = e.clientY + "px"; }, true);
      addEventListener("mousedown", () => { dot.style.transform = "scale(.7)"; }, true);
      addEventListener("mouseup", () => { dot.style.transform = "scale(1)"; }, true);
    };
    if (document.documentElement) make(); else addEventListener("DOMContentLoaded", make);
  })();
`;

const statePath = (role) => path.join(WORK, `state-${role}.json`);

export const log = (...parts) => process.stdout.write(`${parts.join(" ")}\n`);

export async function open({ role, phone = false, video = false } = {}) {
  const browser = await chromium.launch({ headless: true });
  const size = phone ? PHONE : DESKTOP;
  const state = role ? statePath(role) : null;
  const context = await browser.newContext({
    viewport: size,
    deviceScaleFactor: 2,
    isMobile: phone,
    hasTouch: phone,
    locale: "en-GB",
    timezoneId: "Europe/Berlin",
    colorScheme: "light",
    ...(state && fs.existsSync(state) ? { storageState: state } : {}),
    ...(video ? { recordVideo: { dir: path.join(WORK, "raw"), size } } : {}),
  });
  await context.addInitScript(HIDE_DEV_OVERLAY);
  if (video) await context.addInitScript(CURSOR);
  const page = await context.newPage();
  page.on("pageerror", (error) => log("pageerror:", error.message));
  page.on("console", (message) => {
    if (message.type() === "error") log("console:", message.text());
  });
  return { browser, context, page };
}

export async function virtualAuthenticator(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
}

async function otpFor(email, since) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const search = await fetch(
      `${MAILPIT}/search?query=${encodeURIComponent(`to:${email}`)}&limit=5`,
    );
    const { messages = [] } = await search.json();
    const fresh = messages.find(
      (message) => new Date(message.Created).getTime() >= since,
    );
    if (fresh) {
      const message = await (
        await fetch(`${MAILPIT}/message/${fresh.ID}`)
      ).json();
      const code = /\b(\d{6})\b/.exec(
        `${message.Subject} ${message.Text}`,
      )?.[1];
      if (code) return code;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No OTP arrived in Mailpit for ${email}`);
}

export async function signIn(page, email, role) {
  const since = Date.now() - 2000;
  await virtualAuthenticator(page);
  await page.goto(`${BASE}/sign-in`, { waitUntil: "networkidle" });
  await page.locator("input").first().fill(email);
  await page.getByRole("button", { name: "Continue" }).click();
  const code = await otpFor(email, since);
  const otp = page
    .locator('input[autocomplete="one-time-code"], input[inputmode="numeric"]')
    .first();
  await otp.waitFor({ timeout: 30000 });
  await otp.pressSequentially(code, { delay: 30 });
  const settled = (...skip) =>
    page.waitForURL((url) => !skip.includes(url.pathname), { timeout: 60000 });
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"), {
    timeout: 60000,
  });
  await settled("/onboarding");
  if (new URL(page.url()).pathname === "/onboarding/passkey") {
    await page.getByRole("button", { name: "Create passkey" }).click();
    await settled("/onboarding", "/onboarding/passkey");
  }
  await page.context().storageState({ path: statePath(role) });
}

export function steps(page) {
  const pause = (ms = 700) => page.waitForTimeout(ms);
  const move = async (locator) => {
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    if (box)
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
        steps: 20,
      });
    await pause(250);
  };
  const click = async (locator, after = 600) => {
    await move(locator);
    await locator.click();
    await pause(after);
  };
  const type = async (locator, text, after = 400) => {
    await click(locator, 150);
    await locator.pressSequentially(text, { delay: 35 });
    await pause(after);
  };
  const scroll = async (dy, parts = 8) => {
    for (let part = 0; part < parts; part++) {
      await page.mouse.wheel(0, dy / parts);
      await pause(40);
    }
    await pause(400);
  };
  return { pause, move, click, type, scroll };
}

export async function record(name, { role, phone = false, start }, run) {
  const opened = Date.now();
  const { browser, context, page } = await open({ role, phone, video: true });
  await page.goto(`${BASE}${start}`, { waitUntil: "load" });
  await page.waitForTimeout(2500);
  const lead = (Date.now() - opened) / 1000;
  try {
    await run(page, steps(page));
    await page.waitForTimeout(1200);
  } finally {
    const video = page.video();
    await context.close();
    await browser.close();
    fs.mkdirSync(MEDIA, { recursive: true });
    const out = path.join(MEDIA, `${name}.mp4`);
    execFileSync(ffmpeg, [
      "-y",
      "-loglevel",
      "error",
      "-ss",
      String(lead + 0.2),
      "-i",
      await video.path(),
      "-c:v",
      "libx264",
      "-preset",
      "slow",
      "-crf",
      "22",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-an",
      out,
    ]);
    log(`${name}.mp4`, `${(fs.statSync(out).size / 1e6).toFixed(1)} MB`);
  }
}

export function contactSheet(name, frames = 12) {
  const clip = path.join(MEDIA, `${name}.mp4`);
  const { stderr } = spawnSync(ffmpeg, ["-i", clip], { encoding: "utf8" });
  const [, h, m, s] = /Duration: (\d+):(\d+):([\d.]+)/.exec(stderr);
  const seconds = Number(h) * 3600 + Number(m) * 60 + Number(s);
  const out = path.join(WORK, `sheet-${name}.png`);
  execFileSync(ffmpeg, [
    "-y",
    "-loglevel",
    "error",
    "-i",
    clip,
    "-vf",
    `fps=${frames / seconds},scale=640:-1,tile=4x${Math.ceil(frames / 4)}`,
    "-frames:v",
    "1",
    out,
  ]);
  return out;
}
