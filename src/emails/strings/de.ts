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
    title: "Willkommen bei {chapter}",
    preview: "Ihr Platz vorne ist bereit",
    heading: "Wind im Haar, wann immer Sie mögen",
    intro:
      "Ihr Konto ist fertig. {chapter} hat Ihre Angaben, und ein Pilot wartet schon aufs Treten.",
    noteHeading: "Ein paar Zeilen von {chapter}",
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
    title: "Willkommen bei {chapter}",
    preview: "Deine Pilotanfrage liegt beim Chapter",
    heading: "Willkommen an Bord",
    intro:
      "Deine Anfrage, für {chapter} zu pilotieren, ist da. Eine Chapter-Admin schaut sie sich an — meist innerhalb weniger Tage.",
    noteHeading: "Ein paar Zeilen von {chapter}",
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
  applicationApproved: {
    subject: "Du bist Pilot bei {chapter}",
    preview: "Deine Ortsgruppe sagt ja",
    heading: "Willkommen an Bord",
    intro:
      "{chapter} hat dich als Pilot freigegeben. Als Nächstes: die Trainingsvideos, ein Workshop mit einer der Captains — und dann deine erste Ausfahrt.",
    noteHeading: "Von deiner Ortsgruppe",
    cta: "Cycling Without Age öffnen",
    footer:
      "Du erhältst diese E-Mail, weil du dich als Pilot für eine Cycling-Without-Age-Ortsgruppe beworben hast.",
  },
  applicationRejected: {
    subject: "Zu deiner Pilotanfrage bei {chapter}",
    preview: "Eine Antwort von deiner Ortsgruppe",
    heading: "Diesmal nicht",
    intro:
      "{chapter} kann dich gerade nicht als Pilot aufnehmen. Rikschas, Captains und Trainingstermine müssen alle zusammenpassen — eine andere Ortsgruppe in der Nähe hat vielleicht Platz.",
    noteHeading: "Von deiner Ortsgruppe",
    cta: "Andere Ortsgruppe finden",
    footer:
      "Du erhältst diese E-Mail, weil du dich als Pilot für eine Cycling-Without-Age-Ortsgruppe beworben hast.",
  },
  invite: {
    subject: "Du bist zu {chapter} eingeladen",
    preview: "Eine Ortsgruppe wartet auf dich",
    heading: "Du bist eingeladen",
    intro: "{inviter} hat dich als {role} zu {chapter} eingeladen.",
    how: "Melde dich mit dieser E-Mail-Adresse an, wir schicken dir einen Code \u2014 kein Passwort zum Ausdenken.",
    cta: "Einladung annehmen",
    footer:
      "Du erhältst diese E-Mail, weil dich eine Admin einer Cycling-Without-Age-Ortsgruppe eingeladen hat.",
  },
  applicationSubmitted: {
    subject: "{name} möchte bei {chapter} pilotieren",
    preview: "Eine neue Pilotanfrage",
    heading: "Eine neue Pilotanfrage",
    intro:
      "{name} hat angefragt, für {chapter} zu pilotieren. Schau sie dir an und antworte ja — oder diesmal nicht.",
    cta: "Anfrage ansehen",
    footer:
      "Du erhältst diese E-Mail, weil du eine Cycling-Without-Age-Ortsgruppe mit betreust.",
    anonymous: "Jemand",
  },
  rolePromoted: {
    subject: "Du bist Admin bei {chapter}",
    preview: "Neue Verantwortung in deiner Ortsgruppe",
    heading: "Du bist Ortsgruppen-Admin",
    intro:
      "{actor} hat dich zur Admin von {chapter} gemacht. Du kannst Leute einladen, Pilotanfragen beantworten und die Angaben der Ortsgruppe pflegen.",
    cta: "Ortsgruppe öffnen",
    footer:
      "Du erhältst diese E-Mail, weil sich deine Rolle in einer Cycling-Without-Age-Ortsgruppe geändert hat.",
  },
  roleDemoted: {
    subject: "Deine Adminrolle bei {chapter} ist beendet",
    preview: "Eine Änderung an deiner Rolle",
    heading: "Nicht mehr Admin",
    intro:
      "{actor} hat deine Adminrolle bei {chapter} beendet. Sonst bleibt alles, wie es war — du fährst weiter mit der Ortsgruppe.",
    cta: "Cycling Without Age öffnen",
    footer:
      "Du erhältst diese E-Mail, weil sich deine Rolle in einer Cycling-Without-Age-Ortsgruppe geändert hat.",
  },
  memberRemoved: {
    subject: "Du bist nicht mehr bei {chapter}",
    preview: "Eine Änderung an deiner Mitgliedschaft",
    heading: "Du hast {chapter} verlassen",
    intro:
      "{actor} hat dich aus {chapter} entfernt. Dein Konto bleibt deins, und jede Ortsgruppe darf dich wieder aufnehmen.",
    cta: "Ortsgruppe finden",
    footer:
      "Du erhältst diese E-Mail, weil sich deine Mitgliedschaft in einer Cycling-Without-Age-Ortsgruppe geändert hat.",
  },
  memberJoined: {
    subject: "{name} ist jetzt bei {chapter}",
    preview: "Neu dabei",
    heading: "Neu dabei",
    intro: "{name} ist jetzt Passagier bei {chapter}.",
    cta: "Mitglied ansehen",
    footer:
      "Du erhältst diese E-Mail, weil du eine Cycling-Without-Age-Ortsgruppe mit betreust.",
    anonymous: "Jemand",
  },
  countryAdminAppointed: {
    subject: "Du betreust jetzt {country}",
    preview: "Ein Land zum Betreuen",
    heading: "Du betreust {country}",
    intro:
      "{actor} hat dich zur Länder-Admin für {country} gemacht. Jede Ortsgruppe dort kannst du ab sofort unterstützen.",
    cta: "Dashboard öffnen",
    footer:
      "Du erhältst diese E-Mail, weil sich deine Rolle bei Cycling Without Age geändert hat.",
  },
  countryAdminRemoved: {
    subject: "Deine Rolle als Länder-Admin für {country} ist beendet",
    preview: "Eine Änderung an deiner Rolle",
    heading: "Nicht mehr Länder-Admin",
    intro:
      "{actor} hat deine Rolle als Länder-Admin für {country} beendet. In deinen eigenen Ortsgruppen ändert sich nichts.",
    cta: "Cycling Without Age öffnen",
    footer:
      "Du erhältst diese E-Mail, weil sich deine Rolle bei Cycling Without Age geändert hat.",
  },
  roles: {
    admin: "Ortsgruppen-Admin",
    pilot: "Pilot",
    passenger: "Passagier",
  },
};

export default de;
