export const NATIVE_UA = "CWA-Native";

const HANDHELD_UA = /iPhone|Android.*Mobile/i;

export function isHandheldRequest(headers: Headers): boolean {
  const ua = headers.get("user-agent") ?? "";
  return (
    ua.includes(NATIVE_UA) ||
    headers.get("sec-ch-ua-mobile") === "?1" ||
    HANDHELD_UA.test(ua)
  );
}
