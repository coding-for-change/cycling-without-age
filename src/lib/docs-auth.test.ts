import { generateKeyPairSync, verify } from "node:crypto";
import type { Access } from "./access";
import {
  DOCS_SESSION_SECONDS,
  DEFAULT_DOCS_HOST,
  docsCallbackUrl,
  docsEntryHref,
  guidesLink,
  docsGroups,
  docsRedirectPath,
  readDocsKey,
  signDocsToken,
} from "./docs-auth";

const access = (over: Partial<Access>): Access => ({
  role: null,
  countryAdminOf: [],
  memberships: [],
  ...over,
});

describe("docsGroups", () => {
  it("gives a pilot only the pilot group", () => {
    expect(
      docsGroups(
        access({ memberships: [{ chapterId: "c1", roles: ["pilot"] }] }),
      ),
    ).toEqual(["pilot"]);
  });

  it("gives a passenger the rider group", () => {
    expect(
      docsGroups(
        access({ memberships: [{ chapterId: "c1", roles: ["passenger"] }] }),
      ),
    ).toEqual(["rider"]);
  });

  it("collects every role across chapters once", () => {
    expect(
      docsGroups(
        access({
          countryAdminOf: ["dk"],
          memberships: [
            { chapterId: "c1", roles: ["admin", "pilot"] },
            { chapterId: "c2", roles: ["pilot"] },
          ],
        }),
      ).sort(),
    ).toEqual(["chapter-admin", "country-admin", "pilot"]);
  });

  it("recognises a superadmin", () => {
    expect(docsGroups(access({ role: "user,superadmin" }))).toEqual([
      "superadmin",
    ]);
  });

  it("gives someone without roles no group", () => {
    expect(docsGroups(access({}))).toEqual([]);
  });
});

describe("docsRedirectPath", () => {
  it.each(["/en/pilots/ride-day", "/de/chapter-admins/staffing"])(
    "keeps %s",
    (path) => expect(docsRedirectPath(path)).toBe(path),
  );

  it.each([
    null,
    "",
    "//evil.example",
    "https://evil.example",
    "/\\evil.example",
  ])("drops %p", (path) => expect(docsRedirectPath(path)).toBeNull());
});

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

describe("signDocsToken", () => {
  const now = Date.UTC(2026, 9, 15, 12);

  it("signs an EdDSA token Mintlify can verify", () => {
    const key = readDocsKey(pem)!;
    const token = signDocsToken({
      key,
      host: "docs.example.org",
      groups: ["pilot"],
      now,
    });
    const [header, payload, signature] = token.split(".");

    expect(
      verify(
        null,
        Buffer.from(`${header}.${payload}`),
        publicKey,
        Buffer.from(signature, "base64url"),
      ),
    ).toBe(true);
    expect(JSON.parse(Buffer.from(header, "base64url").toString())).toEqual({
      alg: "EdDSA",
      typ: "JWT",
    });
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    expect(claims).toEqual({
      host: "docs.example.org",
      groups: ["pilot"],
      iat: now / 1000,
      exp: now / 1000 + 10,
      expiresAt: now / 1000 + DOCS_SESSION_SECONDS,
    });
  });

  it("accepts a key with escaped newlines from the environment", () => {
    expect(readDocsKey(pem.replace(/\n/g, "\\n"))).not.toBeNull();
  });

  it("refuses a missing or non-Ed25519 key", () => {
    const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 })
      .privateKey.export({ type: "pkcs8", format: "pem" })
      .toString();
    expect(readDocsKey(undefined)).toBeNull();
    expect(readDocsKey("not a key")).toBeNull();
    expect(readDocsKey(rsa)).toBeNull();
  });
});

describe("docsCallbackUrl", () => {
  it("puts the token in the hash and keeps the page to return to", () => {
    expect(
      docsCallbackUrl({
        host: "docs.example.org",
        token: "a.b.c",
        redirect: "/en/pilots/ride-day",
      }),
    ).toBe(
      "https://docs.example.org/login/jwt-callback?redirect=%2Fen%2Fpilots%2Fride-day#a.b.c",
    );
  });
});

describe("docsEntryHref", () => {
  it("falls back to the CWA docs domain", () => {
    expect(docsEntryHref("en", {})).toBe(`https://${DEFAULT_DOCS_HOST}/en`);
    expect(DEFAULT_DOCS_HOST).toBe("docs.cwa.codingforchange.com");
  });

  it("links straight to the public guides without a signing key", () => {
    expect(docsEntryHref("de", { DOCS_HOST: "docs.example.org" })).toBe(
      "https://docs.example.org/de",
    );
  });

  it("links to the public guides when the signing key is broken", () => {
    expect(
      docsEntryHref("de", {
        DOCS_HOST: "docs.example.org",
        DOCS_JWT_PRIVATE_KEY: "k",
      }),
    ).toBe("https://docs.example.org/de");
  });

  it("goes through the handshake once a signing key is set", () => {
    expect(
      docsEntryHref("da", {
        DOCS_HOST: "docs.example.org",
        DOCS_JWT_PRIVATE_KEY: pem,
      }),
    ).toBe("/docs-login?redirect=%2Fda");
  });
});

describe("guidesLink", () => {
  it("opens the public guides in the reader's language without signing in", () => {
    expect(guidesLink("Help & support", "da")).toEqual({
      href: `https://${DEFAULT_DOCS_HOST}/da`,
      label: "Help & support",
    });
  });
});
