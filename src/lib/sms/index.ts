import { toMsisdn } from "./msisdn";
import { providerFor } from "./routes";

export { toMsisdn } from "./msisdn";
export { routes } from "./routes";
export type { SmsProvider } from "./types";

export async function sendSms(to: string, message: string) {
  const msisdn = toMsisdn(to);
  await providerFor(msisdn)(msisdn, message);
}
