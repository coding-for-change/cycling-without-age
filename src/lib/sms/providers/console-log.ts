import { devConsole } from "@/lib/observability/logger";
import type { SmsProvider } from "../types";

export const consoleLog: SmsProvider = async (msisdn, message) => {
  devConsole.log(`[sms:dev] to=+${msisdn} message="${message}"`);
};
