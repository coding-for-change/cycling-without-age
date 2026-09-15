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
    title: "Welcome to {chapter}",
    preview: "Your seat at the front is ready",
    heading: "Wind in your hair, whenever you like",
    intro:
      "Your account is ready. {chapter} has your details, and a pilot is waiting to pedal.",
    noteHeading: "A note from {chapter}",
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
    title: "Welcome to {chapter}",
    preview: "Your pilot request is with the chapter",
    heading: "Welcome aboard",
    intro:
      "Your request to pilot for {chapter} is in. A chapter admin looks at it — usually within a few days.",
    noteHeading: "A note from {chapter}",
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
  applicationApproved: {
    subject: "You're a pilot at {chapter}",
    preview: "Your chapter said yes",
    heading: "Welcome aboard",
    intro:
      "{chapter} has approved you as a pilot. Next: the training videos, a workshop with one of the captains — and then your first ride.",
    noteHeading: "From your chapter",
    cta: "Open Cycling Without Age",
    footer:
      "You received this email because you asked to pilot for a Cycling Without Age chapter.",
  },
  applicationRejected: {
    subject: "About your pilot request at {chapter}",
    preview: "An answer from your chapter",
    heading: "Not this time",
    intro:
      "{chapter} can't take you on as a pilot right now. Trishaws, captains and training dates all have to line up — another chapter nearby may well have room.",
    noteHeading: "From your chapter",
    cta: "Find another chapter",
    footer:
      "You received this email because you asked to pilot for a Cycling Without Age chapter.",
  },
  invite: {
    subject: "You've been invited to {chapter}",
    preview: "A chapter is waiting for you",
    heading: "You've been invited",
    intro: "{inviter} has invited you to {chapter} as {role}.",
    how: "Sign in with this email address and we send you a code \u2014 no password to invent.",
    cta: "Accept the invitation",
    footer:
      "You received this email because a Cycling Without Age chapter admin invited your address.",
  },
  applicationSubmitted: {
    subject: "{name} wants to pilot at {chapter}",
    preview: "A new pilot request",
    heading: "A new pilot request",
    intro:
      "{name} has asked to pilot for {chapter}. Take a look and answer yes, or not this time.",
    cta: "Review the request",
    footer:
      "You received this email because you help run a Cycling Without Age chapter.",
    anonymous: "Someone",
  },
  rolePromoted: {
    subject: "You're a chapter admin at {chapter}",
    preview: "New responsibilities at your chapter",
    heading: "You're a chapter admin",
    intro:
      "{actor} made you an admin of {chapter}. You can invite people, answer pilot requests and keep the chapter's details straight.",
    cta: "Open the chapter",
    footer:
      "You received this email because your role in a Cycling Without Age chapter changed.",
  },
  roleDemoted: {
    subject: "Your admin role at {chapter} has ended",
    preview: "A change to your role",
    heading: "No longer an admin",
    intro:
      "{actor} has ended your admin role at {chapter}. Everything else stays as it was — you keep riding with the chapter.",
    cta: "Open Cycling Without Age",
    footer:
      "You received this email because your role in a Cycling Without Age chapter changed.",
  },
  memberRemoved: {
    subject: "You've left {chapter}",
    preview: "A change to your membership",
    heading: "You've left {chapter}",
    intro:
      "{actor} has removed you from {chapter}. Your account stays yours, and any chapter is free to take you on again.",
    cta: "Find a chapter",
    footer:
      "You received this email because your membership of a Cycling Without Age chapter changed.",
  },
  memberJoined: {
    subject: "{name} joined {chapter}",
    preview: "A new passenger",
    heading: "A new passenger",
    intro: "{name} is now a passenger at {chapter}.",
    cta: "Open the member",
    footer:
      "You received this email because you help run a Cycling Without Age chapter.",
    anonymous: "Someone",
  },
  countryAdminAppointed: {
    subject: "You look after {country} now",
    preview: "A country to look after",
    heading: "You look after {country}",
    intro:
      "{actor} made you a country admin for {country}. Every chapter there is yours to support from now on.",
    cta: "Open the dashboard",
    footer:
      "You received this email because your role at Cycling Without Age changed.",
  },
  countryAdminRemoved: {
    subject: "Your country admin role for {country} has ended",
    preview: "A change to your role",
    heading: "No longer a country admin",
    intro:
      "{actor} has ended your country admin role for {country}. What you do in your own chapters is untouched.",
    cta: "Open Cycling Without Age",
    footer:
      "You received this email because your role at Cycling Without Age changed.",
  },
  roles: {
    admin: "a chapter admin",
    pilot: "a pilot",
    passenger: "a passenger",
  },
};

export type EmailStrings = typeof en;
export default en;
