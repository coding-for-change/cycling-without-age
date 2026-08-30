import { consoleLog } from "./providers/console-log";
import { gatewayapi } from "./providers/gatewayapi";
import type { SmsProvider } from "./types";

// Country code → provider. Register exceptions here; everything unlisted goes to
// GatewayAPI. E.164 country codes are prefix-free, so probing 3/2/1 digits is
// unambiguous — no country-code table needed.
// ponytail: empty today, GatewayAPI covers every country we send to. A second
// provider is one file in ./providers plus one entry here, e.g. { "1": twilio }.
export const routes: Record<string, SmsProvider> = {};

export function providerFor(msisdn: string): SmsProvider {
  for (const length of [3, 2, 1]) {
    const routed = routes[msisdn.slice(0, length)];
    if (routed) return routed;
  }
  if (process.env.GATEWAYAPI_TOKEN) return gatewayapi;
  if (process.env.NODE_ENV === "production") {
    throw new Error("GATEWAYAPI_TOKEN is unset — cannot send SMS");
  }
  return consoleLog;
}
