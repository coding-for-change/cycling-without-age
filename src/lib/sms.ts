export async function sendSms(to: string, message: string) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("No SMS provider configured (COD-165)");
  }
  console.log(`[sms:dev] to=${to} message="${message}"`);
}
