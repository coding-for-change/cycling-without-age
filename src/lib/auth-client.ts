import { createAuthClient } from "better-auth/react";
import {
  adminClient,
  customSessionClient,
  emailOTPClient,
  organizationClient,
  phoneNumberClient,
} from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";
import type { auth } from "@/lib/auth";

export const authClient = createAuthClient({
  plugins: [
    emailOTPClient(),
    phoneNumberClient(),
    passkeyClient(),
    adminClient(),
    organizationClient(),
    customSessionClient<typeof auth>(),
  ],
});
