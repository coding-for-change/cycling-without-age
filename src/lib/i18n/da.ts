import type { Dictionary } from "./en";

const da: Dictionary = {
  home: {
    title: "Hej verden",
  },
  notFound: {
    title: "Siden blev ikke fundet",
    description: "Siden, du leder efter, findes ikke.",
    returnHome: "Tilbage til forsiden",
  },
  forbidden: {
    title: "Ingen nøgle til denne dør",
    description: "Du er logget ind, men denne side er ikke åben for dig.",
    returnHome: "Tilbage til forsiden",
  },
  common: {
    back: "Tilbage",
    continue: "Fortsæt",
    next: "Videre",
    skip: "Spring over for nu",
    stepProgress: "Trin {current} af {total}",
    characterLabel: "Animeret Cycling Without Age-følgesvend",
    language: "Skift sprog",
    signOut: "Log ud",
  },
  welcome: {
    slides: [
      {
        headline: "Alle har ret til vind i håret.",
        body: "Det begyndte i København i 2012 med én rickshaw og én god idé.",
      },
      {
        headline: "Piloterne træder i pedalerne.",
        body: "En frivillig kører rickshawen i gåtempo. Du sidder forrest — intet mellem dig og gaden.",
      },
      {
        headline: "Båret af naboer.",
        body: "Hver lokalafdeling er frivillige fra kvarteret, der giver en time til dem, som byggede det.",
      },
      {
        headline: "Find din lokalafdeling.",
        body: "Afdelinger i Europa, Nordamerika, Australien og Japan — der er efter alt at dømme en i nærheden.",
      },
    ],
    title: "Tag med på en tur.",
    subtitle:
      "Log ind for at booke en tur eller træde i pedalerne. Eller se dig omkring først.",
    signIn: "Log ind",
    explore: "Se dig omkring uden at logge ind",
    carouselLabel: "Hvad Cycling Without Age er",
    progressLabel: "Trin {current} af {total}",
  },
  signIn: {
    identifier: {
      title: "Hvad er din e-mail eller dit telefonnummer?",
      label: "E-mail eller telefonnummer",
      placeholder: "dig@eksempel.dk",
      changeCountry: "Skift landekode",
      google: "Fortsæt med Google",
      passkey: "Brug en adgangsnøgle",
      separator: "eller",
      errors: {
        empty: "Indtast en e-mailadresse eller et telefonnummer.",
        invalidEmail:
          "Den e-mailadresse ser ikke rigtig ud. Tjek for en tastefejl.",
        invalidPhone:
          "Nummeret ser ikke komplet ud for {country}. Tjek cifrene.",
        rateLimited: "For mange forsøg. Prøv igen om et minut.",
        generic: "Noget gik galt. Prøv igen.",
      },
    },
    country: {
      title: "Hvor er dit telefonnummer fra?",
      searchLabel: "Søg efter et land",
      searchPlaceholder: "Landets navn",
      noResults: "Intet land passer på det.",
      selected: "{country}, {dialCode}",
    },
    code: {
      title: "Indtast din kode",
      sentToEmail: "Vi har sendt en 6-cifret kode til {identifier}.",
      sentToPhone: "Vi har sendt en sms med en 6-cifret kode til {identifier}.",
      label: "6-cifret kode",
      resend: "Send en ny kode",
      resendWait: "Du kan bede om en ny kode om et øjeblik.",
      resent: "Ny kode sendt.",
      change: "Brug en anden e-mail eller et andet nummer",
      errors: {
        invalid: "Den kode er ikke rigtig. Tjek den og prøv igen.",
        expired: "Den kode er udløbet. Bed om en ny.",
        rateLimited: "For mange forsøg. Prøv igen om et minut.",
        generic: "Noget gik galt. Prøv igen.",
      },
    },
    role: {
      title: "Hvordan vil du gerne være med?",
      pilot: {
        title: "Jeg vil være pilot",
        body: "Du træder i pedalerne og tager passagerer med ud at køre.",
      },
      passenger: {
        title: "Jeg vil være passager",
        body: "Du sidder forrest og nyder vinden i håret.",
      },
    },
  },
  location: {
    title: "Hvor vil du gerne køre?",
    subtitleNearby: "Afdelingerne tættest på dig.",
    subtitleAll: "Alle afdelinger i alfabetisk rækkefølge.",
    locating: "Finder afdelinger i nærheden af dig …",
    permissionDenied:
      "Uden din placering kan vi ikke sortere efter afstand — her er alle afdelinger i stedet.",
    searchLabel: "Søg efter en afdeling",
    searchPlaceholder: "Afdeling eller by",
    noResults: "Ingen afdeling passer på det.",
    distanceAway: "{distance} væk",
    mapUnavailable:
      "Kortet er ikke tilgængeligt lige nu. Listen virker stadig.",
    mapLabel: "Kort over Cycling Without Age-afdelinger",
    retry: "Brug min placering",
    pending: "Et øjeblik …",
    next: "Næste",
    request: "Anmod om at deltage",
    requestCount: "Anmod om at deltage i {count} afdelinger",
    selectPrompt: "Vælg en afdeling for at fortsætte.",
    titlePassenger: "Hvor skal vi hente dig?",
    tabs: {
      careHome: "På et plejehjem",
      home: "På min egen adresse",
    },
    home: {
      label: "Din adresse",
      placeholder: "Vej og nummer",
      hint: "Begynd at skrive, og vælg så din adresse på listen.",
      searching: "Søger …",
      noResults: "Ingen adresse passer på det.",
      nearest: "Din nærmeste afdeling",
      duration: "Cirka {duration} væk med rickshaw",
      confirm: "Det er min adresse",
      outOfRangeTitle: "Vi kan ikke nå dig endnu",
      outOfRangeBody:
        "{chapter} ligger {distance} væk — længere end de {radius}, den kører. Du kan stadig komme med: tag selv hen til afdelingen, eller få nogen til at køre dig derhen, så tager en pilot over ved døren.",
      joinAnyway: "Deltag i {chapter} alligevel",
    },
    errors: {
      unknownChapter: "Den afdeling findes ikke længere. Vælg en anden.",
      alreadyPilot: "Du er allerede pilot i en af de afdelinger.",
      maxChapters: "Du kan højst anmode om {count} afdelinger ad gangen.",
      generic: "Vi kunne ikke gemme det. Prøv igen.",
    },
  },
  consent: {
    title: "Tre hurtige aftaler",
    titlePilot: "To hurtige aftaler",
    safety:
      "Jeg forstår, at turene køres af oplærte frivillige, og jeg følger afdelingens sikkerhedsretningslinjer.",
    notifications:
      "Jeg vil gerne modtage e-mails og push-beskeder om vigtige ting.",
    data: "Jeg accepterer, at mine data opbevares og behandles.",
    imprint: "Kolofon",
    privacy: "Databehandlingsaftale",
    dataSuffix: "Se {imprint} og {privacy}.",
    required: "Sæt kryds i dem alle for at fortsætte.",
    joining: "Du bliver en del af {chapter}.",
    error: "Vi kunne ikke gemme det. Prøv igen.",
  },
  profile: {
    title: "Lidt om dig",
    titlePilot: "Lidt om dig",
    body: "Din afdeling har brug for det for at planlægge en tur. Ikke andet, for nu.",
    firstName: "Fornavn",
    lastName: "Efternavn",
    birthDate: "Fødselsdag",
    gender: "Køn",
    genders: {
      female: "Kvinde",
      male: "Mand",
      other: "Andet",
    },
    forSomeoneElse: "Jeg opretter kontoen, så en anden kan køre med",
    errors: {
      incomplete: "Udfyld alle felter for at fortsætte.",
      birthDate: "Den fødselsdag ser ikke rigtig ud. Tjek årstallet.",
      generic: "Vi kunne ikke gemme det. Prøv igen.",
    },
  },
  passkey: {
    title: "Lav din adgangsnøgle",
    body: "Din enhed husker dig — ingen adgangskode at holde styr på.",
    create: "Lav adgangsnøgle",
    skip: "Ikke nu",
    failed:
      "Det virkede ikke. Du kan tilføje en adgangsnøgle senere fra din profil.",
  },
  pilotNextSteps: {
    title: "Sådan bliver du pilot",
    steps: [
      "Se træningsvideoerne — cirka 20 minutter, direkte i appen.",
      "Deltag i en praktisk workshop med en af kaptajnerne.",
      "Tag din første tur — en kaptajn kører med første gang.",
    ],
    finish: "Videre",
  },
  admin: {
    nav: {
      overview: "Overblik",
      rides: "Ture",
      members: "Medlemmer",
      passengers: "Passagerer",
      bikes: "Rickshawer",
      chat: "Beskeder",
      reports: "Rapporter",
      chapters: "Afdelinger",
      countries: "Lande",
      settings: "Indstillinger",
      help: "Få hjælp",
    },
    navGroups: {
      main: "Afdelingens arbejde",
      organisation: "Organisation",
      footer: "Konto",
    },
    navLabel: "Adminafsnit",
    newRide: "Ny tur",
    scope: {
      switchLabel: "Skift perspektiv eller afdeling",
      label: "Område",
      perspective: "Perspektiv",
      all: "Alle afdelinger",
      allInCountry: "Alle afdelinger i {country}",
    },
    perspectives: {
      admin: "Admin",
      pilot: "Pilot",
      passenger: "Passager",
    },
    roles: {
      superadmin: "Superadmin",
      countryAdmin: "Landeadmin",
      chapterAdmin: "Afdelingsadmin",
      pilot: "Pilot",
      passenger: "Passager",
    },
    user: {
      menuLabel: "Din konto",
      account: "Konto",
    },
    commands: {
      open: "Åbn kommandopaletten",
      hint: "til alt",
      placeholder: "Søg efter en side eller en handling",
      empty: "Der er ikke noget med det navn.",
      dialogTitle: "Kommandopalette",
      dialogDescription:
        "Hop til en side, skift perspektiv eller kør en handling fra tastaturet.",
      newRide: "Start en ny tur",
      viewAsAdmin: "Se som admin",
      viewAsPilot: "Se som pilot",
      viewAsPassenger: "Se som passager",
      toggleSidebar: "Vis eller skjul sidepanelet",
      language: "Sprog: {name}",
      signOut: "Log ud",
      groups: {
        create: "Opret",
        navigate: "Gå til",
        perspective: "Perspektiv",
        scope: "Omfang",
        account: "Konto",
      },
    },
    pages: {
      overview: {
        title: "Overblik",
        body: "Så snart der bookes ture, lander ugen der kommer her — dagens ture, piloterne der kører dem, og alt det, der stadig venter på dig.",
      },
      rides: {
        title: "Ture",
        body: "Alle ture, din afdeling har booket, fra anmodningen til farvellet ved døren. Der er ikke booket noget endnu.",
      },
      members: {
        title: "Medlemmer",
        body: "Piloter, afdelingsadmins og dem, der venter på at blive godkendt. Godkendelserne sker lige her.",
      },
      passengers: {
        title: "Passagerer",
        body: "De mennesker, din afdeling kører med — også dem, som en pårørende eller en plejer booker for.",
      },
      bikes: {
        title: "Rickshawer",
        body: "Hver rickshaw, din afdeling passer på, hvem der sidst havde den ude, og hvornår den skal til service igen.",
      },
      chat: {
        title: "Beskeder",
        body: "Samtaler mellem piloter, passagerer og afdelingen. Der er ikke sagt noget endnu.",
      },
      reports: {
        title: "Rapporter",
        body: "Kørte ture, frivillige timer, tilbagelagte kilometer — de tal, en afdeling har brug for, når nogen spørger, hvad den egentlig laver.",
      },
      chapters: {
        title: "Afdelinger",
        body: "De afdelinger, du passer på, og dem du kan starte. En afdeling er et sted, et plejehjem og de frivillige omkring det.",
      },
      countries: {
        title: "Lande",
        body: "Alle lande i bevægelsen og de admins, der driver dem. Det er kun en superadmin, der ser dette.",
      },
      settings: {
        title: "Indstillinger",
        body: "Hvor langt din afdeling kører, hvem man kan få fat på, og oplysningerne på afdelingens egen side.",
      },
      help: {
        title: "Få hjælp",
        body: "Guides til afdelingsadmins — og en vej til et menneske, når en guide ikke er nok.",
      },
    },
  },
  legal: {
    imprint: {
      title: "Kolofon",
      body: "Afdelingens juridiske oplysninger kommer her.",
    },
    privacy: {
      title: "Databehandlingsaftale",
      body: "Hvad vi gemmer, hvorfor vi gemmer det, og hvordan du får det slettet, kommer her.",
    },
    pending:
      "Siden er stadig under udarbejdelse. Spørg din afdeling om detaljerne i mellemtiden.",
  },
};

export default da;
