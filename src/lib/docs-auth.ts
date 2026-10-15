import { createPrivateKey, sign, type KeyObject } from "node:crypto";
import { isSuperAdmin, type Access } from "@/lib/access";
import { isAppPath } from "@/lib/app-path";

export type DocsGroup =
  "superadmin" | "country-admin" | "chapter-admin" | "pilot" | "rider";

export const DOCS_SESSION_SECONDS = 24 * 60 * 60;
const TOKEN_SECONDS = 10;

export function docsGroups(access: Access): DocsGroup[] {
  const groups = new Set<DocsGroup>();
  if (isSuperAdmin(access)) groups.add("superadmin");
  if (access.countryAdminOf.length > 0) groups.add("country-admin");
  for (const { roles } of access.memberships) {
    if (roles.includes("admin")) groups.add("chapter-admin");
    if (roles.includes("pilot")) groups.add("pilot");
    if (roles.includes("passenger")) groups.add("rider");
  }
  return [...groups];
}

export const docsRedirectPath = (raw: string | null) =>
  isAppPath(raw) ? raw : null;

const base64url = (input: Buffer | string) =>
  Buffer.from(input).toString("base64url");

export function readDocsKey(pem: string | undefined): KeyObject | null {
  if (!pem) return null;
  try {
    const key = createPrivateKey(pem.replace(/\\n/g, "\n"));
    return key.asymmetricKeyType === "ed25519" ? key : null;
  } catch {
    return null;
  }
}

export function signDocsToken(input: {
  key: KeyObject;
  host: string;
  groups: DocsGroup[];
  now: number;
}) {
  const issuedAt = Math.floor(input.now / 1000);
  const header = base64url(JSON.stringify({ alg: "EdDSA", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      host: input.host,
      groups: input.groups,
      expiresAt: issuedAt + DOCS_SESSION_SECONDS,
      iat: issuedAt,
      exp: issuedAt + TOKEN_SECONDS,
    }),
  );
  const signature = sign(null, Buffer.from(`${header}.${payload}`), input.key);
  return `${header}.${payload}.${base64url(signature)}`;
}

export function docsCallbackUrl(input: {
  host: string;
  token: string;
  redirect: string | null;
}) {
  const url = new URL(`https://${input.host}/login/jwt-callback`);
  if (input.redirect) url.searchParams.set("redirect", input.redirect);
  url.hash = input.token;
  return url.toString();
}

type Env = Record<string, string | undefined>;

export const DEFAULT_DOCS_HOST = "docs.cwa.codingforchange.com";

export const docsHost = (env: Env = process.env) =>
  env.DOCS_HOST || DEFAULT_DOCS_HOST;

export function docsEntryHref(locale: string, env: Env = process.env) {
  const path = `/${locale}`;
  return readDocsKey(env.DOCS_JWT_PRIVATE_KEY)
    ? `/docs-login?redirect=${encodeURIComponent(path)}`
    : `https://${docsHost(env)}${path}`;
}
