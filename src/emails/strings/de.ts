import type { EmailStrings } from "./en";

// Deutsch: Sie-Form in Passagier-Texten, du-Form in Pilot-Texten.
// Siehe docs/BRAND.md § Voice & tone.
const de: EmailStrings = {
  otp: {
    subject: "{otp} ist Ihr Cycling-Without-Age-Code",
    preview: "Ihr Anmeldecode für Cycling Without Age",
    heading: "Ihr Anmeldecode",
    intro: "Geben Sie diesen Code ein, um die Anmeldung abzuschließen.",
    expiry: "Der Code läuft in 10 Minuten ab.",
    ignore:
      "Nicht angefordert? Dann können Sie diese E-Mail einfach ignorieren.",
    footer:
      "Sie erhalten diese E-Mail, weil für Ihre Adresse ein Anmeldecode angefordert wurde.",
  },
  welcomePassenger: {
    subject: "Willkommen bei Cycling Without Age",
    preview: "Ihr Platz vorne ist bereit",
    heading: "Wind im Haar, wann immer Sie mögen",
    intro:
      "Ihr Konto ist fertig. {chapter} hat Ihre Angaben, und ein Pilot wartet schon aufs Treten.",
    howHeading: "So läuft eine Ausfahrt",
    how: [
      "Fragen Sie in der App nach einer Ausfahrt — Tag und Uhrzeit wählen Sie.",
      "Ein freiwilliger Pilot übernimmt sie und holt Sie an der Tür ab.",
      "Sie sitzen vorne. Zwischen Ihnen und der Straße nur der Fahrtwind.",
    ],
    cta: "Erste Ausfahrt anfragen",
    footer:
      "Sie erhalten diese E-Mail, weil für Ihre Adresse ein Konto angelegt wurde.",
  },
  welcomePilot: {
    subject: "Willkommen an Bord — drei Schritte bis zur ersten Ausfahrt",
    preview: "Deine Pilotanfrage liegt beim Chapter",
    heading: "Willkommen an Bord",
    intro:
      "Deine Anfrage, für {chapter} zu pilotieren, ist da. Eine Chapter-Admin schaut sie sich an — meist innerhalb weniger Tage.",
    howHeading: "So wirst du Pilot",
    how: [
      "Schau die Trainingsvideos — rund 20 Minuten, direkt in der App.",
      "Komm zu einem praktischen Workshop mit einer der Captains.",
      "Übernimm deine erste Ausfahrt — beim ersten Mal fährt eine Captain mit.",
    ],
    cta: "Cycling Without Age öffnen",
    footer:
      "Du erhältst diese E-Mail, weil du dich als Pilot für ein Cycling-Without-Age-Chapter beworben hast.",
  },
};

export default de;
