import type { Dictionary } from "./en";

const da: Dictionary = {
  home: {
    title: "Hej verden",
  },
  email: {
    otp: {
      subject: "{otp} er din Cycling Without Age-kode",
      preview: "Din login-kode til Cycling Without Age",
      heading: "Din login-kode",
      intro: "Indtast denne kode for at fuldføre dit login.",
      expiry: "Koden udløber om 10 minutter.",
      ignore:
        "Har du ikke bedt om den? Så kan du roligt ignorere denne e-mail.",
      footer:
        "Du modtager denne e-mail, fordi der blev anmodet om en login-kode til din adresse.",
    },
  },
  notFound: {
    title: "Siden blev ikke fundet",
    description: "Siden, du leder efter, findes ikke.",
    returnHome: "Tilbage til forsiden",
  },
};

export default da;
