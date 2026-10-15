const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8026";

type Summary = {
  ID: string;
  To: { Address: string }[];
  Created: string;
  Subject: string;
};

export async function latestCode(
  email: string,
  since: number,
): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/messages?limit=50`);
    const { messages } = (await res.json()) as { messages: Summary[] };
    const hit = messages.find(
      (m) =>
        m.To.some((t) => t.Address.toLowerCase() === email.toLowerCase()) &&
        new Date(m.Created).getTime() >= since - 2000,
    );
    if (hit) {
      const full = (await (
        await fetch(`${MAILPIT}/api/v1/message/${hit.ID}`)
      ).json()) as {
        Text: string;
        Subject: string;
      };
      const code = `${full.Subject}\n${full.Text}`.match(/\b(\d{6})\b/);
      if (code) return code[1];
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`no code for ${email}`);
}
