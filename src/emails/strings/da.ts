import type { EmailStrings } from "./en";

const da: EmailStrings = {
  otp: {
    subject: "{otp} er din Cycling Without Age-kode",
    preview: "Din login-kode til Cycling Without Age",
    heading: "Din login-kode",
    intro: "Indtast denne kode for at fuldføre dit login.",
    expiry: "Koden udløber om 10 minutter.",
    ignore: "Har du ikke bedt om den? Så kan du roligt ignorere denne e-mail.",
    footer:
      "Du modtager denne e-mail, fordi der blev anmodet om en login-kode til din adresse.",
  },
  welcomePassenger: {
    subject: "Velkommen til Cycling Without Age",
    preview: "Din plads forrest er klar",
    heading: "Vind i håret, når du har lyst",
    intro:
      "Din konto er klar. {chapter} har dine oplysninger, og en pilot står klar til at træde i pedalerne.",
    howHeading: "Sådan foregår en tur",
    how: [
      "Bed om en tur i appen — vælg en dag og et tidspunkt, der passer dig.",
      "En frivillig pilot tager turen og møder dig ved døren.",
      "Du sidder forrest. Kun brisen mellem dig og gaden.",
    ],
    cta: "Bestil din første tur",
    footer:
      "Du modtager denne e-mail, fordi der blev oprettet en konto til din adresse.",
  },
  welcomePilot: {
    subject: "Velkommen om bord — tre skridt til din første tur",
    preview: "Din pilotansøgning er hos afdelingen",
    heading: "Velkommen om bord",
    intro:
      "Din ansøgning om at være pilot for {chapter} er sendt. En afdelingsadministrator kigger på den — som regel inden for et par dage.",
    howHeading: "Sådan bliver du pilot",
    how: [
      "Se træningsvideoerne — cirka 20 minutter, direkte i appen.",
      "Deltag i en praktisk workshop med en af kaptajnerne.",
      "Tag din første tur — en kaptajn kører med første gang.",
    ],
    cta: "Åbn Cycling Without Age",
    footer:
      "Du modtager denne e-mail, fordi du har søgt om at være pilot i en Cycling Without Age-afdeling.",
  },
};

export default da;
