import { contactSheet, log } from "./browser.mjs";

const [, , name, frames = "12"] = process.argv;
if (!name) {
  log("usage: node sheet.mjs <clip name without .mp4> [frames]");
  process.exit(1);
}

log(contactSheet(name, Number(frames)));
