// Source of truth for the dictionary shape. Every other locale must
// implement `Dictionary`, so a missing or extra key is a type error.
const en = {
  home: {
    title: "Hello World",
  },
  email: {
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
  },
  notFound: {
    title: "Page not found",
    description: "The page you are looking for does not exist.",
    returnHome: "Return home",
  },
};

export type Dictionary = typeof en;
export default en;
