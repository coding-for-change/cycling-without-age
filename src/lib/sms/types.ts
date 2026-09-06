export type SmsProvider = (msisdn: string, message: string) => Promise<void>;
