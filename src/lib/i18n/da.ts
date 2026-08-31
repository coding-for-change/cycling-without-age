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
