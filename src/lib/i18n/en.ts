// Source of truth for the dictionary shape. Every other locale must
// implement `Dictionary`, so a missing or extra key is a type error.
const en = {
  home: {
    title: "Hello World",
  },
  notFound: {
    title: "Page not found",
    description: "The page you are looking for does not exist.",
    returnHome: "Return home",
  },
  forbidden: {
    title: "No key for this door",
    description: "You are signed in, but this page is not yours to open.",
    returnHome: "Return home",
  },
  common: {
    back: "Back",
    continue: "Continue",
    next: "Next",
    skip: "Skip for now",
    stepProgress: "Step {current} of {total}",
    characterLabel: "Animated Cycling Without Age companion",
    language: "Change language",
    signOut: "Sign out",
  },
  welcome: {
    slides: [
      {
        headline: "Everyone has the right to wind in their hair.",
        body: "It started in Copenhagen in 2012, with one trishaw and one good idea.",
      },
      {
        headline: "Pilots do the pedalling.",
        body: "A volunteer cycles the trishaw at walking pace. You sit at the front, with nothing between you and the street.",
      },
      {
        headline: "It runs on neighbours.",
        body: "Every chapter is local volunteers giving an hour to the people who built the neighbourhood.",
      },
      {
        headline: "Find your chapter.",
        body: "Chapters across Europe, North America, Australia and Japan — very likely one near you.",
      },
    ],
    title: "Come along for the ride.",
    subtitle:
      "Sign in to book a ride or start pedalling. Or look around first.",
    signIn: "Sign in",
    explore: "Explore without signing in",
    carouselLabel: "What Cycling Without Age is",
    progressLabel: "Step {current} of {total}",
  },
  signIn: {
    identifier: {
      title: "What's your email or phone number?",
      label: "Email or phone number",
      placeholder: "you@example.com",
      changeCountry: "Change country code",
      google: "Continue with Google",
      passkey: "Use a passkey",
      separator: "or",
      errors: {
        empty: "Enter an email address or a phone number.",
        invalidEmail:
          "That email address doesn't look right. Check for a typo.",
        invalidPhone:
          "That number doesn't look complete for {country}. Check the digits.",
        rateLimited: "Too many attempts. Try again in a minute.",
        generic: "Something went wrong. Try again.",
      },
    },
    country: {
      title: "Where's your phone number from?",
      searchLabel: "Search for a country",
      searchPlaceholder: "Country name",
      noResults: "No country matches that.",
      selected: "{country}, {dialCode}",
    },
    code: {
      title: "Enter your code",
      sentToEmail: "We emailed a 6-digit code to {identifier}.",
      sentToPhone: "We texted a 6-digit code to {identifier}.",
      label: "6-digit code",
      resend: "Send a new code",
      resendWait: "You can ask for a new code in a moment.",
      resent: "New code sent.",
      change: "Use a different email or number",
      errors: {
        invalid: "That code isn't right. Check it and try again.",
        expired: "That code has expired. Ask for a new one.",
        rateLimited: "Too many attempts. Try again in a minute.",
        generic: "Something went wrong. Try again.",
      },
    },
    role: {
      title: "How would you like to take part?",
      pilot: {
        title: "I want to be a Pilot",
        body: "You do the pedalling and take passengers out for a ride.",
      },
      passenger: {
        title: "I want to be a Passenger",
        body: "You sit at the front and enjoy the wind in your hair.",
      },
    },
  },
  location: {
    title: "Where would you like to ride?",
    subtitleNearby: "Chapters closest to you.",
    subtitleAll: "Every chapter, in alphabetical order.",
    locating: "Finding chapters near you…",
    permissionDenied:
      "Without your location we can't sort by distance — here is every chapter instead.",
    searchLabel: "Search for a chapter",
    searchPlaceholder: "Chapter or city",
    noResults: "No chapter matches that.",
    distanceAway: "{distance} away",
    mapUnavailable: "The map isn't available right now. The list still works.",
    mapLabel: "Map of Cycling Without Age chapters",
    retry: "Use my location",
    pending: "Just a moment…",
    next: "Next",
    request: "Request to join",
    requestCount: "Request to join {count} chapters",
    selectPrompt: "Select a chapter to continue.",
    titlePassenger: "Where should we pick you up?",
    tabs: {
      careHome: "In a care home",
      home: "At my own address",
    },
    home: {
      label: "Your address",
      placeholder: "Street and number",
      hint: "Start typing, then pick your address from the list.",
      searching: "Looking…",
      noResults: "No address matches that.",
      nearest: "Your nearest chapter",
      duration: "About {duration} away by trishaw",
      confirm: "This is my address",
      outOfRangeTitle: "We can't reach you yet",
      outOfRangeBody:
        "{chapter} is {distance} away — further than the {radius} it rides. You can still come along: travel to the chapter yourself, or have someone drive you there, and a pilot will take it from the door.",
      joinAnyway: "Join {chapter} anyway",
    },
    errors: {
      unknownChapter: "That chapter is no longer available. Pick another one.",
      alreadyPilot: "You already pilot for one of those chapters.",
      generic: "We couldn't save that. Try again.",
    },
  },
  consent: {
    title: "Three quick agreements",
    titlePilot: "Two quick agreements",
    safety:
      "I understand that rides are provided by trained volunteers, and I agree to the safety guidelines of the chapter.",
    notifications:
      "I agree to receive email and push notifications for important messages.",
    data: "I agree to the storage and processing of my data.",
    imprint: "Imprint",
    privacy: "Data processing agreement",
    dataSuffix: "See the {imprint} and the {privacy}.",
    required: "Tick all of them to continue.",
    joining: "You're joining {chapter}.",
    error: "We couldn't save that. Try again.",
  },
  profile: {
    title: "A little about you",
    titlePilot: "A little about you",
    body: "Your chapter needs this to plan a ride. Nothing else, for now.",
    firstName: "First name",
    lastName: "Last name",
    birthDate: "Birthday",
    gender: "Gender",
    genders: {
      female: "Female",
      male: "Male",
      other: "Other",
    },
    forSomeoneElse: "I'm creating this account for someone else to ride",
    errors: {
      incomplete: "Fill in every field to continue.",
      birthDate: "That birthday doesn't look right. Check the year.",
      generic: "We couldn't save that. Try again.",
    },
  },
  passkey: {
    title: "Create your passkey",
    body: "Your device remembers you — no password to keep.",
    create: "Create passkey",
    skip: "Not now",
    failed: "That didn't work. You can add a passkey later from your profile.",
  },
  pilotNextSteps: {
    title: "How you become a pilot",
    steps: [
      "Watch the training videos — about 20 minutes, right in this app.",
      "Join a practical workshop with one of the captains.",
      "Grab your first ride — a captain rides along the first time.",
    ],
    finish: "Next",
  },
  legal: {
    imprint: {
      title: "Imprint",
      body: "The chapter's legal details go here.",
    },
    privacy: {
      title: "Data processing agreement",
      body: "What we store, why we store it, and how to have it removed goes here.",
    },
    pending:
      "This page is still being written. Ask your chapter for the details in the meantime.",
  },
};

export type Dictionary = typeof en;
export default en;
