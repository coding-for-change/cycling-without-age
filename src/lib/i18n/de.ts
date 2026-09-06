import type { Dictionary } from "./en";

// Deutsch: Sie-Form im gemeinsamen Ablauf und in Passagier-Texten, du-Form in
// Pilot-Texten. Siehe docs/BRAND.md § Tone.
const de: Dictionary = {
  home: {
    title: "Hallo Welt",
  },
  notFound: {
    title: "Seite nicht gefunden",
    description: "Die gesuchte Seite gibt es nicht.",
    returnHome: "Zurück zur Startseite",
  },
  forbidden: {
    title: "Kein Schlüssel für diese Tür",
    description: "Angemeldet — aber diese Seite ist nicht freigegeben.",
    returnHome: "Zurück zur Startseite",
  },
  common: {
    back: "Zurück",
    continue: "Fortfahren",
    next: "Weiter",
    skip: "Erst mal überspringen",
    stepProgress: "Schritt {current} von {total}",
    characterLabel: "Animierter Cycling-Without-Age-Begleiter",
    language: "Sprache ändern",
    signOut: "Abmelden",
  },
  welcome: {
    slides: [
      {
        headline: "Jeder hat ein Recht auf Wind in den Haaren.",
        body: "Angefangen hat es 2012 in Kopenhagen, mit einer Rikscha und einer guten Idee.",
      },
      {
        headline: "Die Piloten treten in die Pedale.",
        body: "Ehrenamtliche fahren die Rikscha im Schritttempo. Sie sitzen vorne — nichts zwischen Ihnen und der Straße.",
      },
      {
        headline: "Getragen von Nachbarn.",
        body: "Jede Ortsgruppe lebt von Ehrenamtlichen, die eine Stunde schenken — für die Menschen, die dieses Viertel aufgebaut haben.",
      },
      {
        headline: "Finden Sie Ihre Ortsgruppe.",
        body: "Ortsgruppen in Europa, Nordamerika, Australien und Japan — mit großer Wahrscheinlichkeit auch bei Ihnen.",
      },
    ],
    title: "Kommen Sie mit.",
    subtitle:
      "Melden Sie sich an, um eine Fahrt zu buchen oder selbst in die Pedale zu treten. Oder sehen Sie sich erst einmal um.",
    signIn: "Anmelden",
    explore: "Ohne Anmeldung umsehen",
    carouselLabel: "Was Cycling Without Age ist",
    progressLabel: "Schritt {current} von {total}",
  },
  signIn: {
    identifier: {
      title: "Wie lautet Ihre E-Mail-Adresse oder Telefonnummer?",
      label: "E-Mail-Adresse oder Telefonnummer",
      placeholder: "sie@beispiel.de",
      changeCountry: "Ländervorwahl ändern",
      google: "Weiter mit Google",
      passkey: "Passkey verwenden",
      separator: "oder",
      errors: {
        empty: "Geben Sie eine E-Mail-Adresse oder eine Telefonnummer ein.",
        invalidEmail:
          "Diese E-Mail-Adresse sieht nicht richtig aus. Prüfen Sie sie auf Tippfehler.",
        invalidPhone:
          "Diese Nummer wirkt für {country} unvollständig. Prüfen Sie die Ziffern.",
        rateLimited:
          "Zu viele Versuche. Versuchen Sie es in einer Minute erneut.",
        generic: "Da ist etwas schiefgelaufen. Versuchen Sie es erneut.",
      },
    },
    country: {
      title: "Woher stammt Ihre Telefonnummer?",
      searchLabel: "Nach einem Land suchen",
      searchPlaceholder: "Ländername",
      noResults: "Kein Land passt dazu.",
      selected: "{country}, {dialCode}",
    },
    code: {
      title: "Geben Sie Ihren Code ein",
      sentToEmail:
        "Wir haben einen 6-stelligen Code an {identifier} geschickt.",
      sentToPhone:
        "Wir haben eine SMS mit einem 6-stelligen Code an {identifier} geschickt.",
      label: "6-stelliger Code",
      resend: "Neuen Code senden",
      resendWait: "Gleich können Sie einen neuen Code anfordern.",
      resent: "Neuer Code gesendet.",
      change: "Andere E-Mail-Adresse oder Nummer verwenden",
      errors: {
        invalid:
          "Dieser Code stimmt nicht. Prüfen Sie ihn und versuchen Sie es erneut.",
        expired: "Dieser Code ist abgelaufen. Fordern Sie einen neuen an.",
        rateLimited:
          "Zu viele Versuche. Versuchen Sie es in einer Minute erneut.",
        generic: "Da ist etwas schiefgelaufen. Versuchen Sie es erneut.",
      },
    },
    role: {
      title: "Wie möchten Sie mitmachen?",
      pilot: {
        title: "Ich möchte Pilot werden",
        body: "Du trittst in die Pedale und nimmst Passagiere mit auf eine Fahrt.",
      },
      passenger: {
        title: "Ich möchte Passagier werden",
        body: "Sie sitzen vorne und genießen den Wind in den Haaren.",
      },
    },
  },
  location: {
    title: "Wo möchten Sie fahren?",
    subtitleNearby: "Die Ortsgruppen in Ihrer Nähe.",
    subtitleAll: "Alle Ortsgruppen in alphabetischer Reihenfolge.",
    locating: "Ortsgruppen in Ihrer Nähe werden gesucht …",
    permissionDenied:
      "Ohne Ihren Standort können wir nicht nach Entfernung sortieren — hier sind stattdessen alle Ortsgruppen.",
    searchLabel: "Nach einer Ortsgruppe suchen",
    searchPlaceholder: "Ortsgruppe oder Stadt",
    noResults: "Keine Ortsgruppe passt dazu.",
    distanceAway: "{distance} entfernt",
    mapUnavailable:
      "Die Karte ist gerade nicht verfügbar. Die Liste funktioniert weiterhin.",
    mapLabel: "Karte der Cycling-Without-Age-Ortsgruppen",
    retry: "Meinen Standort verwenden",
    pending: "Einen Moment …",
    next: "Weiter",
    request: "Beitritt anfragen",
    requestCount: "Beitritt zu {count} Ortsgruppen anfragen",
    selectPrompt: "Wählen Sie eine Ortsgruppe, um fortzufahren.",
    titlePassenger: "Wo sollen wir Sie abholen?",
    tabs: {
      careHome: "In einem Pflegeheim",
      home: "Unter meiner eigenen Adresse",
    },
    home: {
      label: "Ihre Adresse",
      placeholder: "Straße und Hausnummer",
      hint: "Tippen Sie los und wählen Sie dann Ihre Adresse aus der Liste.",
      searching: "Wird gesucht …",
      noResults: "Keine Adresse passt dazu.",
      nearest: "Ihre nächste Ortsgruppe",
      duration: "Etwa {duration} mit der Rikscha entfernt",
      confirm: "Das ist meine Adresse",
      outOfRangeTitle: "Wir erreichen Sie noch nicht",
      outOfRangeBody:
        "{chapter} liegt {distance} entfernt — weiter, als die Ortsgruppe fährt ({radius}). Mitfahren können Sie trotzdem: Kommen Sie selbst zur Ortsgruppe oder lassen Sie sich hinbringen, ab der Tür übernimmt ein Pilot.",
      joinAnyway: "Trotzdem {chapter} beitreten",
    },
    errors: {
      unknownChapter:
        "Diese Ortsgruppe gibt es nicht mehr. Wählen Sie eine andere.",
      alreadyPilot: "Du bist bereits Pilot in einer dieser Ortsgruppen.",
      maxChapters:
        "Du kannst höchstens {count} Ortsgruppen auf einmal anfragen.",
      generic: "Wir konnten das nicht speichern. Versuchen Sie es erneut.",
    },
  },
  consent: {
    // Sie-Form: Dieser Schritt ist für Passagiere und Piloten gleich, und die
    // Passagiere sind hier die Mehrheit.
    title: "Drei kurze Zusagen",
    titlePilot: "Zwei kurze Zusagen",
    safety:
      "Mir ist klar, dass die Ausfahrten von geschulten Freiwilligen gefahren werden, und ich halte mich an die Sicherheitsregeln der Ortsgruppe.",
    notifications:
      "Ich möchte E-Mails und Push-Nachrichten zu wichtigen Dingen erhalten.",
    data: "Ich stimme der Speicherung und Verarbeitung meiner Daten zu.",
    imprint: "Impressum",
    privacy: "Datenverarbeitungsvereinbarung",
    dataSuffix: "Siehe {imprint} und {privacy}.",
    required: "Setzen Sie überall ein Häkchen, um fortzufahren.",
    joining: "Sie treten {chapter} bei.",
    error: "Das konnten wir nicht speichern. Versuchen Sie es erneut.",
  },
  profile: {
    title: "Ein wenig über Sie",
    titlePilot: "Ein wenig über dich",
    body: "Ihre Ortsgruppe braucht das, um eine Ausfahrt zu planen. Mehr vorerst nicht.",
    firstName: "Vorname",
    lastName: "Nachname",
    birthDate: "Geburtstag",
    gender: "Geschlecht",
    genders: {
      female: "Weiblich",
      male: "Männlich",
      other: "Divers",
    },
    forSomeoneElse:
      "Ich lege das Konto an, damit jemand anderes mitfahren kann",
    errors: {
      incomplete: "Füllen Sie alle Felder aus, um fortzufahren.",
      birthDate: "Der Geburtstag sieht nicht richtig aus. Prüfen Sie das Jahr.",
      generic: "Das konnten wir nicht speichern. Versuchen Sie es erneut.",
    },
  },
  passkey: {
    title: "Passkey einrichten",
    body: "Ihr Gerät erkennt Sie wieder — kein Passwort zum Merken.",
    create: "Passkey einrichten",
    skip: "Jetzt nicht",
    failed:
      "Das hat nicht geklappt. Sie können einen Passkey später im Profil anlegen.",
  },
  pilotNextSteps: {
    // du-Form: Pilot-Texte, siehe docs/BRAND.md § Voice & tone.
    title: "So wirst du Pilot",
    steps: [
      "Schau die Trainingsvideos — rund 20 Minuten, direkt in dieser App.",
      "Komm zu einem praktischen Workshop mit einer der Captains.",
      "Übernimm deine erste Ausfahrt — beim ersten Mal fährt eine Captain mit.",
    ],
    finish: "Weiter",
  },
  admin: {
    // du-Form: Das Admin-Dashboard richtet sich an Organisatoren und
    // Ehrenamtliche der Ortsgruppen, siehe docs/BRAND.md § Voice & tone.
    nav: {
      overview: "Überblick",
      rides: "Ausfahrten",
      members: "Mitglieder",
      passengers: "Passagiere",
      bikes: "Rikschas",
      chat: "Nachrichten",
      reports: "Berichte",
      chapters: "Ortsgruppen",
      countries: "Länder",
      settings: "Einstellungen",
      help: "Hilfe holen",
    },
    navGroups: {
      main: "Arbeit in der Ortsgruppe",
      organisation: "Organisation",
      footer: "Konto",
    },
    navLabel: "Admin-Bereiche",
    newRide: "Neue Ausfahrt",
    scope: {
      switchLabel: "Perspektive oder Ortsgruppe wechseln",
      label: "Bereich",
      perspective: "Perspektive",
      all: "Alle Ortsgruppen",
      allInCountry: "Alle Ortsgruppen in {country}",
    },
    perspectives: {
      admin: "Admin",
      pilot: "Pilot",
      passenger: "Passagier",
    },
    roles: {
      superadmin: "Superadmin",
      countryAdmin: "Länder-Admin",
      chapterAdmin: "Ortsgruppen-Admin",
      pilot: "Pilot",
      passenger: "Passagier",
    },
    user: {
      menuLabel: "Dein Konto",
      account: "Konto",
    },
    commands: {
      open: "Befehlsleiste öffnen",
      hint: "für alles",
      placeholder: "Nach einer Seite oder einer Aktion suchen",
      empty: "Unter dem Namen gibt es nichts.",
      dialogTitle: "Befehlsleiste",
      dialogDescription:
        "Spring zu einer Seite, wechsle die Perspektive oder starte eine Aktion über die Tastatur.",
      newRide: "Neue Ausfahrt starten",
      viewAsAdmin: "Als Admin ansehen",
      viewAsPilot: "Als Pilot ansehen",
      viewAsPassenger: "Als Passagier ansehen",
      toggleSidebar: "Seitenleiste ein- oder ausblenden",
      language: "Sprache: {name}",
      signOut: "Abmelden",
      groups: {
        create: "Erstellen",
        navigate: "Gehe zu",
        perspective: "Perspektive",
        scope: "Bereich",
        account: "Konto",
      },
    },
    pages: {
      overview: {
        title: "Überblick",
        body: "Sobald Ausfahrten gebucht werden, landet hier die kommende Woche — die Fahrten von heute, die Piloten, die sie übernehmen, und alles, was noch auf dich wartet.",
      },
      rides: {
        title: "Ausfahrten",
        body: "Jede Fahrt, die deine Ortsgruppe gebucht hat, von der Anfrage bis zum Winken an der Tür. Noch ist nichts gebucht.",
      },
      members: {
        title: "Mitglieder",
        body: "Piloten, Ortsgruppen-Admins und die Leute, die auf ihre Freigabe warten. Freigeben kannst du sie genau hier.",
      },
      passengers: {
        title: "Passagiere",
        body: "Die Menschen, mit denen deine Ortsgruppe fährt — auch die, für die Angehörige oder Pflegekräfte buchen.",
      },
      bikes: {
        title: "Rikschas",
        body: "Jede Rikscha, um die sich deine Ortsgruppe kümmert, wer sie zuletzt draußen hatte und wann sie wieder zur Wartung muss.",
      },
      chat: {
        title: "Nachrichten",
        body: "Gespräche zwischen Piloten, Passagieren und der Ortsgruppe. Gesagt wurde noch nichts.",
      },
      reports: {
        title: "Berichte",
        body: "Gefahrene Ausfahrten, ehrenamtliche Stunden, zurückgelegte Kilometer — die Zahlen, die eine Ortsgruppe braucht, wenn jemand fragt, was sie eigentlich tut.",
      },
      chapters: {
        title: "Ortsgruppen",
        body: "Die Ortsgruppen, um die du dich kümmerst, und die, die du gründen kannst. Eine Ortsgruppe ist ein Ort, ein Pflegeheim und die Ehrenamtlichen drumherum.",
      },
      countries: {
        title: "Länder",
        body: "Jedes Land der Bewegung und die Admins, die es führen. Das sieht nur ein Superadmin.",
      },
      settings: {
        title: "Einstellungen",
        body: "Wie weit deine Ortsgruppe fährt, wer zu erreichen ist und was auf der eigenen Seite der Ortsgruppe steht.",
      },
      help: {
        title: "Hilfe holen",
        body: "Anleitungen für Ortsgruppen-Admins — und ein Weg zu einem Menschen, wenn eine Anleitung nicht reicht.",
      },
    },
  },
  legal: {
    imprint: {
      title: "Impressum",
      body: "Hier stehen die rechtlichen Angaben der Ortsgruppe.",
    },
    privacy: {
      title: "Datenverarbeitungsvereinbarung",
      body: "Hier steht, was wir speichern, warum wir es speichern und wie Sie es löschen lassen.",
    },
    pending:
      "Diese Seite wird noch geschrieben. Fragen Sie bis dahin Ihre Ortsgruppe nach den Einzelheiten.",
  },
};

export default de;
