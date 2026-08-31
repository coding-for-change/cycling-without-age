/**
 * Email copy, kept apart from the page dictionary on purpose. `getDictionary()`
 * reads the request cookie, so it only works while the recipient happens to be
 * the person browsing — a CRON job, an admin action or a queued send has no
 * cookie to read. Everything here takes the locale as an argument instead.
 *
 * This is also the seam a super admin will eventually edit through: an override
 * row keyed by (template, locale) can shadow these files without touching a
 * template.
 *
 * Source of truth for the shape. `da` and `de` are typed against it, so a missing
 * or extra key is a build error.
 */
const en = {
  otp: {
    subject: "{otp} is your Cycling Without Age code",
    preview: "Your Cycling Without Age sign-in code",
    heading: "Your sign-in code",
    intro: "Enter this code to finish signing in.",
    expiry: "The code expires in 10 minutes.",
    ignore: "Didn't request it? You can safely ignore this email.",
    footer:
      "You received this email because a sign-in code was requested for your address.",
  },
  welcomePassenger: {
    subject: "Welcome to Cycling Without Age",
    preview: "Your seat at the front is ready",
    heading: "Wind in your hair, whenever you like",
    intro:
      "Your account is ready. {chapter} has your details, and a pilot is waiting to pedal.",
    howHeading: "How a ride works",
    how: [
      "Ask for a ride in the app — pick a day and a time that suits you.",
      "A volunteer pilot picks it up and meets you at the door.",
      "You sit at the front. Nothing between you and the street but the breeze.",
    ],
    cta: "Request your first ride",
    footer:
      "You received this email because an account was created for your address.",
  },
  welcomePilot: {
    subject: "Welcome aboard — three steps to your first ride",
    preview: "Your pilot request is with the chapter",
    heading: "Welcome aboard",
    intro:
      "Your request to pilot for {chapter} is in. A chapter admin looks at it — usually within a few days.",
    howHeading: "How you become a pilot",
    how: [
      "Watch the training videos — about 20 minutes, right in the app.",
      "Join a practical workshop with one of the captains.",
      "Grab your first ride — a captain rides along the first time.",
    ],
    cta: "Open Cycling Without Age",
    footer:
      "You received this email because you asked to pilot for a Cycling Without Age chapter.",
  },
};

export type EmailStrings = typeof en;
export default en;
