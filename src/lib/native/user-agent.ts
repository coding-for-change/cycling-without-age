export const NATIVE_USER_AGENT = "CWA-Native";
const IOS_DEVICE = /\b(?:iPhone|iPad)\b/;

export const isNativeIosUserAgent = (userAgent: string | null): boolean =>
  userAgent !== null &&
  userAgent.includes(NATIVE_USER_AGENT) &&
  IOS_DEVICE.test(userAgent);
