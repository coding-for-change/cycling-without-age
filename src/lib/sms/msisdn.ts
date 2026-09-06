export function toMsisdn(phone: string) {
  const trimmed = phone.replace(/[\s()\-.]/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(trimmed)) {
    throw new Error("Phone number must be in E.164 format (+491701234567)");
  }
  return trimmed.slice(1);
}
