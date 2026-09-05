import type { SmsProvider } from "../types";

export const consoleLog: SmsProvider = async (msisdn, message) => {
  console.log(`[sms:dev] to=+${msisdn} message="${message}"`);
};
