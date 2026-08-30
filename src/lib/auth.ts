import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import {
  admin,
  customSession,
  emailOTP,
  organization,
  phoneNumber,
} from "better-auth/plugins";
import { adminAc, userAc } from "better-auth/plugins/admin/access";
import { passkey } from "@better-auth/passkey";
import { prisma } from "@/lib/prisma";
import { createElement } from "react";
import { sendMail } from "@/lib/mailer";
import { getDictionary } from "@/lib/i18n";
import { OtpEmail } from "@/emails/otp";
import { sendSms } from "@/lib/sms";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

export const auth = betterAuth({
  appName: "Cycling Without Age",
  database: prismaAdapter(prisma, { provider: "mysql" }),
  session: {
    expiresIn: 60 * 60 * 24 * 90,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: true,
    customRules: {
      "/email-otp/send-verification-otp": { window: 60, max: 3 },
      "/phone-number/send-otp": { window: 60, max: 3 },
    },
  },
  ...(googleClientId && googleClientSecret
    ? {
        socialProviders: {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        },
      }
    : {}),
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 60 * 10,
      sendVerificationOTP: async ({ email, otp }) => {
        const strings = (await getDictionary()).email.otp;
        await sendMail({
          to: email,
          subject: strings.subject.replace("{otp}", otp),
          text: `${strings.heading}: ${otp}. ${strings.expiry}`,
          react: createElement(OtpEmail, { otp, strings }),
        });
      },
    }),
    phoneNumber({
      otpLength: 6,
      expiresIn: 60 * 10,
      sendOTP: async ({ phoneNumber: to, code }) => {
        await sendSms(to, `Your Cycling Without Age code is ${code}. It expires in 10 minutes.`);
      },
      signUpOnVerification: {
        getTempEmail: (phone) => `${phone.replace(/\D/g, "")}@phone.cwa.local`,
      },
    }),
    passkey({ rpName: "Cycling Without Age" }),
    admin({
      adminRoles: ["superadmin"],
      roles: { superadmin: adminAc, user: userAc },
    }),
    organization(),
    // COD-158: replace this pass-through with the enriched session payload.
    customSession(async ({ user, session }) => ({ user, session })),
    nextCookies(),
  ],
});
