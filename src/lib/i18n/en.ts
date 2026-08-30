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
};

export type Dictionary = typeof en;
export default en;
