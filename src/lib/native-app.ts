export const NATIVE_APP = {
  domain: "cwa.codingforchange.com",
  iosTeamId: "8TPMU6R9FN",
  bundleId: "com.codingforchange.cwa",
  androidPackage: "com.codingforchange.cwa",
} as const;

export const NATIVE_OFFLINE_PAGE_ORIGINS: ReadonlySet<string> = new Set([
  "capacitor://localhost",
  "https://localhost",
]);
