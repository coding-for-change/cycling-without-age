/* pilot app strings — ported verbatim from the vanilla mockup (mockup/js/pilot.js). */
import { reg } from "@/lib/i18n";

reg({
  en: {
    "pilot.tab.home": "Start",
    "pilot.tab.rides": "Rides",
    "pilot.tab.chats": "Chats",
    "pilot.tab.profile": "Profile",

    "pilot.greetMorning": "Morning, {name}!",
    "pilot.greetAfternoon": "Hi {name}!",
    "pilot.greetEvening": "Evening, {name}!",

    "pilot.heroNext": "Your next ride",
    "pilot.heroWaiting": "{n} rides need a pilot",
    "pilot.heroWaitingSub": "Take the one that fits your week.",
    "pilot.heroNothing": "Nothing open right now",
    "pilot.heroNothingSub":
      "Enjoy your day — we will ping you the moment something comes in.",
    "pilot.withName": "with {name}",

    "pilot.openTitle": "Needs a pilot",
    "pilot.feed.urgent": "Starting soon!",
    "pilot.feed.urgentSub":
      "This ride is in less than four hours — can you jump in?",
    "pilot.feed.grab": "Grab this ride",
    "pilot.feed.empty": "No open rides right now — check back later",
    "pilot.event.needs": "Needs a pilot for {trishaw}",
    "pilot.event.slots": "{n} passenger slots",
    "pilot.event.youRide": "You ride {trishaw}",
    "pilot.grabbed": "Ride grabbed — thank you!",

    "pilot.statRides": "Rides ridden",
    "pilot.statHours": "Hours given",
    "pilot.statDonations": "Collected",
    "pilot.weekTitle": "Your week",
    "pilot.weekHint": "Your chapter sees the days you marked as available",
    "pilot.eventsTitle": "Chapter events",
    "pilot.garageTitle": "Your home garage",
    "pilot.trainingBlock": "Finish your training",
    "pilot.trainingBlockSub":
      "{done} of {total} done — then the ride feed opens up for you.",

    "pilot.seg.open": "Open",
    "pilot.seg.mine": "Mine",
    "pilot.seg.week": "Week",
    "pilot.mine.emptyUp": "No upcoming rides — grab one from the open list!",
    "pilot.mine.emptyPast": "No completed rides yet",
    "pilot.mine.dayEmpty": "Nothing planned on this day",

    "pilot.checkin": "Check in",
    "pilot.finish": "Finish ride",
    "pilot.ride.title": "Ride details",
    "pilot.ride.route": "Route",
    "pilot.ride.bike": "Trishaw & garage",
    "pilot.ride.partner": "Partner contact",
    "pilot.ride.roster": "Passenger roster",
    "pilot.ride.proxy": "Contact person",
    "pilot.check.title": "Check-in",
    "pilot.check.lead": "Three quick taps before you roll",
    "pilot.check.c1": "Trishaw collected, battery OK",
    "pilot.check.c2": "Passenger is here and seated",
    "pilot.check.c3": "Blanket & helmet on board",
    "pilot.check.walkup": "Add a walk-up passenger",
    "pilot.check.walkupName": "Name",
    "pilot.check.walkupAdded": "Walk-up passenger added",
    "pilot.check.start": "Start ride",
    "pilot.check.started": "Have a great ride!",
    "pilot.check.onRoad": "You are on the road!",
    "pilot.check.onRoadSub":
      "Enjoy it — finish the ride here when you are back.",
    "pilot.check.elapsed": "Started {t}",
    "pilot.debrief.title": "30-second report",
    "pilot.debrief.bike": "How is the trishaw?",
    "pilot.debrief.ok": "All good",
    "pilot.debrief.problem": "Problem",
    "pilot.debrief.issuePh": "What is wrong?",
    "pilot.debrief.battery": "Battery on return",
    "pilot.debrief.feedback": "How was the ride?",
    "pilot.debrief.submit": "Submit report",
    "pilot.debrief.done": "Thanks for the ride, {name}!",
    "pilot.chats.empty":
      "No conversations yet — they appear when you grab a ride",
    "pilot.chats.emptyPast": "No past conversations",

    "pilot.gate.grab": "Complete your training to ride",
    "pilot.notif.empty": "No notifications yet",

    "pilot.welcome.title": "Give someone the wind in their hair.",
    "pilot.welcome.sub":
      "One hour of your week, a trishaw and a person who has not been outside in far too long.",
    "pilot.welcome.become": "Become a pilot",

    "pauth.passkeyHint": "No password — your device confirms it is you.",
    "pauth.verifying": "Confirming with your device…",
    "pauth.welcomeBack": "Good to see you!",
    "pauth.usePhone": "Use your phone number instead",
    "pauth.phoneTitle": "What is your number?",
    "pauth.phoneSub": "We send you a six-digit code. Nothing to remember.",
    "pauth.codeSub": "We sent six digits to {phone}.",
    "pauth.terms":
      "By continuing you agree to your chapter’s safety guidelines.",

    "pilot.onb1.t": "One hour. One smile.",
    "pilot.onb1.b":
      "Pick a ride that fits your week, cycle at walking pace, and bring someone back into the neighbourhood they built.",
    "pilot.onb2.t": "Training comes first",
    "pilot.onb2.b":
      "Two short videos and one practical workshop with a captain. The ride feed unlocks the moment you are done.",
    "pilot.onb3.t": "Ride when it suits you",
    "pilot.onb3.b":
      "Nothing is assigned to you. You see what is open, you take what works, and you can hand it back.",
    "pilot.onb4.t": "You are never alone out there",
    "pilot.onb4.b":
      "Passenger notes, garage codes, the chapter team and your passenger — all one tap away in the app.",

    "pilot.signup.q1": "What is your name?",
    "pilot.signup.nameLabel": "Full name",
    "pilot.signup.phoneHint":
      "Your chapter uses it to reach you before a ride.",
    "pilot.signup.q2": "Your chapter",
    "pilot.signup.chapterFound": "Closest chapter to you",
    "pilot.signup.chapterPilots": "{n} pilots ride here",
    "pilot.signup.q3": "How you become a pilot",
    "pilot.signup.s1":
      "Watch the training videos — about 20 minutes, right in this app.",
    "pilot.signup.s2": "Join a practical workshop with one of the captains.",
    "pilot.signup.s3":
      "Grab your first ride — a captain rides along the first time.",
    "pilot.signup.q4": "Create your passkey",
    "pilot.signup.passkeyHint": "Your device stores it. Nothing to remember.",
    "pilot.signup.create": "Create passkey",
    "pilot.signup.creating": "Creating your passkey…",

    "pilot.training.progress": "{done} of {total} done",
    "pilot.training.intro":
      "Finish everything here and the ride feed opens up for you.",
    "pilot.training.open": "Open training",
    "pilot.training.watch": "Watch now",
    "pilot.training.completed": "Completed",
    "pilot.training.required": "Required",
    "pilot.training.video": "Video",
    "pilot.training.workshop": "Workshop",
    "pilot.training.workshopHint":
      "Signed off by your captain after the practical workshop",
    "pilot.training.playing": "Playing…",
    "pilot.training.videoDone": "Video completed",
    "pilot.training.allDone": "Training complete — you can grab rides now!",
    "pilot.training.captainApproves":
      "A captain still confirms you as a pilot.",

    "pilot.profile.trained": "Trained pilot",
    "pilot.profile.inTraining": "Training in progress",
    "pilot.profile.home": "Demo home",
    "pilot.profile.account": "Account",
    "pilot.profile.name": "Name",
    "pilot.profile.chapterCard": "My chapter",
    "pilot.profile.homeBase": "Home base",
    "pilot.profile.availHint": "Your chapter sees when you can ride",
    "pilot.profile.editTitle": "Edit your details",
    "pilot.profile.saved": "Details saved",
    "pilot.profile.notifHint": "New rides, messages and reminders",
  },

  de: {
    "pilot.tab.home": "Start",
    "pilot.tab.rides": "Fahrten",
    "pilot.tab.chats": "Chats",
    "pilot.tab.profile": "Profil",

    "pilot.greetMorning": "Guten Morgen, {name}!",
    "pilot.greetAfternoon": "Servus, {name}!",
    "pilot.greetEvening": "Guten Abend, {name}!",

    "pilot.heroNext": "Deine nächste Fahrt",
    "pilot.heroWaiting": "{n} Fahrten suchen eine·n Pilot·in",
    "pilot.heroWaitingSub": "Nimm die, die in deine Woche passt.",
    "pilot.heroNothing": "Gerade ist nichts offen",
    "pilot.heroNothingSub":
      "Genieß den Tag — wir melden uns, sobald etwas reinkommt.",
    "pilot.withName": "mit {name}",

    "pilot.openTitle": "Pilot·in gesucht",
    "pilot.feed.urgent": "Startet bald!",
    "pilot.feed.urgentSub":
      "Diese Fahrt beginnt in weniger als vier Stunden — kannst du einspringen?",
    "pilot.feed.grab": "Fahrt übernehmen",
    "pilot.feed.empty":
      "Gerade keine offenen Fahrten — schau später wieder vorbei",
    "pilot.event.needs": "Pilot·in gesucht für {trishaw}",
    "pilot.event.slots": "{n} Fahrgast-Plätze",
    "pilot.event.youRide": "Du fährst {trishaw}",
    "pilot.grabbed": "Fahrt übernommen — danke dir!",

    "pilot.statRides": "Gefahrene Fahrten",
    "pilot.statHours": "Geschenkte Stunden",
    "pilot.statDonations": "Gesammelt",
    "pilot.weekTitle": "Deine Woche",
    "pilot.weekHint":
      "Dein Standort sieht die Tage, die du als verfügbar markiert hast",
    "pilot.eventsTitle": "Events am Standort",
    "pilot.garageTitle": "Deine Heimatgarage",
    "pilot.trainingBlock": "Schulung abschließen",
    "pilot.trainingBlockSub":
      "{done} von {total} erledigt — danach öffnet sich der Fahrten-Feed für dich.",

    "pilot.seg.open": "Offen",
    "pilot.seg.mine": "Meine",
    "pilot.seg.week": "Woche",
    "pilot.mine.emptyUp":
      "Keine anstehenden Fahrten — schnapp dir eine aus der offenen Liste!",
    "pilot.mine.emptyPast": "Noch keine abgeschlossenen Fahrten",
    "pilot.mine.dayEmpty": "An diesem Tag ist nichts geplant",

    "pilot.checkin": "Einchecken",
    "pilot.finish": "Fahrt abschließen",
    "pilot.ride.title": "Fahrtdetails",
    "pilot.ride.route": "Route",
    "pilot.ride.bike": "Rikscha & Garage",
    "pilot.ride.partner": "Partner-Kontakt",
    "pilot.ride.roster": "Fahrgast-Plan",
    "pilot.ride.proxy": "Kontaktperson",
    "pilot.check.title": "Check-in",
    "pilot.check.lead": "Drei kurze Häkchen, dann geht’s los",
    "pilot.check.c1": "Rikscha abgeholt, Akku OK",
    "pilot.check.c2": "Fahrgast ist da und sitzt bequem",
    "pilot.check.c3": "Decke & Helm an Bord",
    "pilot.check.walkup": "Spontanen Fahrgast hinzufügen",
    "pilot.check.walkupName": "Name",
    "pilot.check.walkupAdded": "Fahrgast hinzugefügt",
    "pilot.check.start": "Fahrt starten",
    "pilot.check.started": "Gute Fahrt!",
    "pilot.check.onRoad": "Ihr seid unterwegs!",
    "pilot.check.onRoadSub":
      "Genießt es — schließe die Fahrt hier ab, wenn ihr zurück seid.",
    "pilot.check.elapsed": "Gestartet {t}",
    "pilot.debrief.title": "30-Sekunden-Bericht",
    "pilot.debrief.bike": "Wie geht es der Rikscha?",
    "pilot.debrief.ok": "Alles gut",
    "pilot.debrief.problem": "Problem",
    "pilot.debrief.issuePh": "Was ist nicht in Ordnung?",
    "pilot.debrief.battery": "Akku bei Rückgabe",
    "pilot.debrief.feedback": "Wie war die Fahrt?",
    "pilot.debrief.submit": "Bericht abschicken",
    "pilot.debrief.done": "Danke für die Fahrt, {name}!",
    "pilot.chats.empty":
      "Noch keine Unterhaltungen — sie erscheinen, sobald du eine Fahrt übernimmst",
    "pilot.chats.emptyPast": "Keine vergangenen Unterhaltungen",

    "pilot.gate.grab": "Erst Schulung abschließen",
    "pilot.notif.empty": "Noch keine Benachrichtigungen",

    "pilot.welcome.title": "Schenk jemandem den Wind in den Haaren.",
    "pilot.welcome.sub":
      "Eine Stunde deiner Woche, eine Rikscha und ein Mensch, der viel zu lange nicht draußen war.",
    "pilot.welcome.become": "Pilot·in werden",

    "pauth.passkeyHint":
      "Kein Passwort — dein Gerät bestätigt, dass du es bist.",
    "pauth.verifying": "Bestätigung durch dein Gerät…",
    "pauth.welcomeBack": "Schön, dass du da bist!",
    "pauth.usePhone": "Lieber deine Telefonnummer verwenden",
    "pauth.phoneTitle": "Wie ist deine Nummer?",
    "pauth.phoneSub":
      "Wir senden dir einen sechsstelligen Code. Du musst dir nichts merken.",
    "pauth.codeSub": "Wir haben sechs Ziffern an {phone} geschickt.",
    "pauth.terms":
      "Mit dem Fortfahren stimmst du den Sicherheitsrichtlinien deines Standorts zu.",

    "pilot.onb1.t": "Eine Stunde. Ein Lächeln.",
    "pilot.onb1.b":
      "Such dir eine Fahrt, die in deine Woche passt, fahr im Schritttempo und hol jemanden zurück in die Nachbarschaft, die er·sie aufgebaut hat.",
    "pilot.onb2.t": "Zuerst die Schulung",
    "pilot.onb2.b":
      "Zwei kurze Videos und ein Praxis-Workshop mit einem·einer Captain. Danach öffnet sich der Fahrten-Feed sofort.",
    "pilot.onb3.t": "Fahr, wann es dir passt",
    "pilot.onb3.b":
      "Dir wird nichts zugeteilt. Du siehst, was offen ist, nimmst, was passt — und kannst es auch wieder abgeben.",
    "pilot.onb4.t": "Du bist nie allein unterwegs",
    "pilot.onb4.b":
      "Hinweise zum Fahrgast, Garagencodes, das Standort-Team und dein Fahrgast — alles einen Fingertipp entfernt.",

    "pilot.signup.q1": "Wie heißt du?",
    "pilot.signup.nameLabel": "Vor- und Nachname",
    "pilot.signup.phoneHint":
      "Damit erreicht dich dein Standort vor einer Fahrt.",
    "pilot.signup.q2": "Dein Standort",
    "pilot.signup.chapterFound": "Der Standort in deiner Nähe",
    "pilot.signup.chapterPilots": "{n} Pilot·innen fahren hier",
    "pilot.signup.q3": "So wirst du Pilot·in",
    "pilot.signup.s1":
      "Schau dir die Schulungsvideos an — rund 20 Minuten, direkt in der App.",
    "pilot.signup.s2": "Mach den Praxis-Workshop mit einem·einer Captain.",
    "pilot.signup.s3":
      "Übernimm deine erste Fahrt — beim ersten Mal fährt ein·e Captain mit.",
    "pilot.signup.q4": "Erstelle deinen Passkey",
    "pilot.signup.passkeyHint":
      "Dein Gerät speichert ihn. Du musst dir nichts merken.",
    "pilot.signup.create": "Passkey erstellen",
    "pilot.signup.creating": "Passkey wird erstellt…",

    "pilot.training.progress": "{done} von {total} erledigt",
    "pilot.training.intro":
      "Schließ hier alles ab, dann öffnet sich der Fahrten-Feed für dich.",
    "pilot.training.open": "Schulung öffnen",
    "pilot.training.watch": "Jetzt ansehen",
    "pilot.training.completed": "Abgeschlossen",
    "pilot.training.required": "Pflicht",
    "pilot.training.video": "Video",
    "pilot.training.workshop": "Workshop",
    "pilot.training.workshopHint":
      "Wird von deinem·deiner Captain nach dem Praxis-Workshop freigegeben",
    "pilot.training.playing": "Läuft…",
    "pilot.training.videoDone": "Video abgeschlossen",
    "pilot.training.allDone":
      "Schulung komplett — du kannst jetzt Fahrten übernehmen!",
    "pilot.training.captainApproves":
      "Ein·e Captain bestätigt dich noch als Pilot·in.",

    "pilot.profile.trained": "Geschulte·r Pilot·in",
    "pilot.profile.inTraining": "Schulung läuft",
    "pilot.profile.home": "Demo-Startseite",
    "pilot.profile.account": "Konto",
    "pilot.profile.name": "Name",
    "pilot.profile.chapterCard": "Mein Standort",
    "pilot.profile.homeBase": "Heimatgarage",
    "pilot.profile.availHint": "Dein Standort sieht, wann du fahren kannst",
    "pilot.profile.editTitle": "Deine Daten bearbeiten",
    "pilot.profile.saved": "Daten gespeichert",
    "pilot.profile.notifHint": "Neue Fahrten, Nachrichten und Erinnerungen",
  },

  da: {
    "pilot.tab.home": "Start",
    "pilot.tab.rides": "Ture",
    "pilot.tab.chats": "Chats",
    "pilot.tab.profile": "Profil",

    "pilot.greetMorning": "Godmorgen, {name}!",
    "pilot.greetAfternoon": "Hej {name}!",
    "pilot.greetEvening": "Godaften, {name}!",

    "pilot.heroNext": "Din næste tur",
    "pilot.heroWaiting": "{n} ture mangler en pilot",
    "pilot.heroWaitingSub": "Tag den, der passer i din uge.",
    "pilot.heroNothing": "Intet ledigt lige nu",
    "pilot.heroNothingSub":
      "Nyd dagen — vi siger til, så snart der kommer noget ind.",
    "pilot.withName": "med {name}",

    "pilot.openTitle": "Mangler en pilot",
    "pilot.feed.urgent": "Starter snart!",
    "pilot.feed.urgentSub":
      "Denne tur begynder om mindre end fire timer — kan du springe til?",
    "pilot.feed.grab": "Tag denne tur",
    "pilot.feed.empty": "Ingen ledige ture lige nu — kig forbi senere",
    "pilot.event.needs": "Mangler en pilot til {trishaw}",
    "pilot.event.slots": "{n} passagerpladser",
    "pilot.event.youRide": "Du kører {trishaw}",
    "pilot.grabbed": "Turen er din — tak!",

    "pilot.statRides": "Kørte ture",
    "pilot.statHours": "Givne timer",
    "pilot.statDonations": "Indsamlet",
    "pilot.weekTitle": "Din uge",
    "pilot.weekHint": "Din afdeling kan se de dage, du har markeret som ledige",
    "pilot.eventsTitle": "Events i afdelingen",
    "pilot.garageTitle": "Din hjemmegarage",
    "pilot.trainingBlock": "Fuldfør din træning",
    "pilot.trainingBlockSub":
      "{done} af {total} gennemført — så åbner turoversigten sig for dig.",

    "pilot.seg.open": "Ledige",
    "pilot.seg.mine": "Mine",
    "pilot.seg.week": "Uge",
    "pilot.mine.emptyUp": "Ingen kommende ture — tag en fra den ledige liste!",
    "pilot.mine.emptyPast": "Ingen gennemførte ture endnu",
    "pilot.mine.dayEmpty": "Ingen ture denne dag",

    "pilot.checkin": "Tjek ind",
    "pilot.finish": "Afslut tur",
    "pilot.ride.title": "Turdetaljer",
    "pilot.ride.route": "Rute",
    "pilot.ride.bike": "Rickshaw & garage",
    "pilot.ride.partner": "Partnerkontakt",
    "pilot.ride.roster": "Passagerplan",
    "pilot.ride.proxy": "Kontaktperson",
    "pilot.check.title": "Tjek ind",
    "pilot.check.lead": "Tre hurtige flueben, før I ruller",
    "pilot.check.c1": "Rickshaw hentet, batteri OK",
    "pilot.check.c2": "Passageren er her og sidder godt",
    "pilot.check.c3": "Tæppe & hjelm er med",
    "pilot.check.walkup": "Tilføj spontan passager",
    "pilot.check.walkupName": "Navn",
    "pilot.check.walkupAdded": "Passager tilføjet",
    "pilot.check.start": "Start turen",
    "pilot.check.started": "God tur!",
    "pilot.check.onRoad": "I er på tur!",
    "pilot.check.onRoadSub": "Nyd den — afslut turen her, når I er tilbage.",
    "pilot.check.elapsed": "Startet {t}",
    "pilot.debrief.title": "30-sekunders rapport",
    "pilot.debrief.bike": "Hvordan har rickshawen det?",
    "pilot.debrief.ok": "Alt i orden",
    "pilot.debrief.problem": "Problem",
    "pilot.debrief.issuePh": "Hvad er der galt?",
    "pilot.debrief.battery": "Batteri ved aflevering",
    "pilot.debrief.feedback": "Hvordan var turen?",
    "pilot.debrief.submit": "Send rapport",
    "pilot.debrief.done": "Tak for turen, {name}!",
    "pilot.chats.empty":
      "Ingen samtaler endnu — de dukker op, når du tager en tur",
    "pilot.chats.emptyPast": "Ingen tidligere samtaler",

    "pilot.gate.grab": "Fuldfør din træning først",
    "pilot.notif.empty": "Ingen notifikationer endnu",

    "pilot.welcome.title": "Giv nogen vinden i håret.",
    "pilot.welcome.sub":
      "En time af din uge, en rickshaw og et menneske, der ikke har været ude alt for længe.",
    "pilot.welcome.become": "Bliv pilot",

    "pauth.passkeyHint":
      "Ingen adgangskode — din enhed bekræfter, at det er dig.",
    "pauth.verifying": "Bekræfter med din enhed…",
    "pauth.welcomeBack": "Godt at se dig!",
    "pauth.usePhone": "Brug dit telefonnummer i stedet",
    "pauth.phoneTitle": "Hvad er dit nummer?",
    "pauth.phoneSub": "Vi sender dig en sekscifret kode. Ingenting at huske.",
    "pauth.codeSub": "Vi har sendt seks cifre til {phone}.",
    "pauth.terms":
      "Ved at fortsætte accepterer du din afdelings sikkerhedsretningslinjer.",

    "pilot.onb1.t": "En time. Et smil.",
    "pilot.onb1.b":
      "Vælg en tur, der passer i din uge, kør i gåtempo, og hent nogen tilbage til det kvarter, de selv har bygget.",
    "pilot.onb2.t": "Træning kommer først",
    "pilot.onb2.b":
      "To korte videoer og en praktisk workshop med en kaptajn. Turoversigten åbner, så snart du er færdig.",
    "pilot.onb3.t": "Kør når det passer dig",
    "pilot.onb3.b":
      "Der bliver ikke tildelt dig noget. Du ser, hvad der er ledigt, tager det, der passer — og kan give det fra dig igen.",
    "pilot.onb4.t": "Du er aldrig alene derude",
    "pilot.onb4.b":
      "Noter om passageren, garagekoder, afdelingsteamet og din passager — alt sammen ét tryk væk.",

    "pilot.signup.q1": "Hvad hedder du?",
    "pilot.signup.nameLabel": "Fulde navn",
    "pilot.signup.phoneHint":
      "Din afdeling bruger det til at kontakte dig før en tur.",
    "pilot.signup.q2": "Din afdeling",
    "pilot.signup.chapterFound": "Afdelingen tættest på dig",
    "pilot.signup.chapterPilots": "{n} piloter kører her",
    "pilot.signup.q3": "Sådan bliver du pilot",
    "pilot.signup.s1":
      "Se træningsvideoerne — cirka 20 minutter, direkte i appen.",
    "pilot.signup.s2": "Deltag i en praktisk workshop med en af kaptajnerne.",
    "pilot.signup.s3":
      "Tag din første tur — en kaptajn kører med den første gang.",
    "pilot.signup.q4": "Opret din passkey",
    "pilot.signup.passkeyHint":
      "Din enhed gemmer den. Du skal ikke huske noget.",
    "pilot.signup.create": "Opret passkey",
    "pilot.signup.creating": "Opretter din passkey…",

    "pilot.training.progress": "{done} af {total} gennemført",
    "pilot.training.intro":
      "Fuldfør alt her, så åbner turoversigten sig for dig.",
    "pilot.training.open": "Åbn træning",
    "pilot.training.watch": "Se nu",
    "pilot.training.completed": "Gennemført",
    "pilot.training.required": "Påkrævet",
    "pilot.training.video": "Video",
    "pilot.training.workshop": "Workshop",
    "pilot.training.workshopHint":
      "Godkendes af din kaptajn efter den praktiske workshop",
    "pilot.training.playing": "Spiller…",
    "pilot.training.videoDone": "Video gennemført",
    "pilot.training.allDone": "Træningen er fuldført — du kan tage ture nu!",
    "pilot.training.captainApproves":
      "En kaptajn skal stadig bekræfte dig som pilot.",

    "pilot.profile.trained": "Trænet pilot",
    "pilot.profile.inTraining": "Træning i gang",
    "pilot.profile.home": "Demo-forside",
    "pilot.profile.account": "Konto",
    "pilot.profile.name": "Navn",
    "pilot.profile.chapterCard": "Min afdeling",
    "pilot.profile.homeBase": "Hjemmebase",
    "pilot.profile.availHint": "Din afdeling kan se, hvornår du kan køre",
    "pilot.profile.editTitle": "Rediger dine oplysninger",
    "pilot.profile.saved": "Oplysninger gemt",
    "pilot.profile.notifHint": "Nye ture, beskeder og påmindelser",
  },
});
