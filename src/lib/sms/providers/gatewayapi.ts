import type { SmsProvider } from "../types";

export const gatewayapi: SmsProvider = async (msisdn, message) => {
  const baseUrl = process.env.GATEWAYAPI_URL ?? "https://gatewayapi.com";
  const sender = process.env.GATEWAYAPI_SENDER ?? "CyclingWA";

  const response = await fetch(`${baseUrl}/rest/mtsms`, {
    method: "POST",
    headers: {
      Authorization: `Token ${process.env.GATEWAYAPI_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sender, message, recipients: [{ msisdn }] }),
  });

  if (!response.ok) {
    throw new Error(`GatewayAPI ${response.status}: ${await response.text()}`);
  }
};
