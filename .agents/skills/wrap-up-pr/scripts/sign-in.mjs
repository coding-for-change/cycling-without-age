import { log, open, signIn } from "./browser.mjs";

const [, , email, role] = process.argv;
if (!email || !role) {
  log("usage: node sign-in.mjs <email> <role>");
  process.exit(1);
}

const { browser, page } = await open();
await signIn(page, email, role);
log(role, "signed in, landed on", new URL(page.url()).pathname);
await browser.close();
