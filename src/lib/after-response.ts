import { after } from "next/server";

/**
 * Defer a side effect until after the response has been sent — but only where
 * there is a response. A Use Case must stay callable from CRON, a script or a
 * unit test, and `after` throws outside a request scope, so there the work runs
 * inline. That is why callers await this even though the request path does not.
 */
export async function afterResponse(work: () => Promise<unknown>) {
  try {
    after(work);
  } catch {
    await work();
  }
}
