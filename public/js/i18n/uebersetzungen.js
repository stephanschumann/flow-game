/**
 * FEATURE-006 – Browser-Version von src/i18n/uebersetzungen.js. Siehe Hinweis
 * in public/js/game/createGame.js zur manuellen Synchronhaltung mit dem
 * Node-Modul (kein Bundler im Projekt). Muss als eines der ERSTEN Skripte
 * eingebunden sein (vor js/game/sprache.js und allen anderen Skripten, die
 * window.FlowGame.uebersetze()/UEBERSETZUNGEN nutzen).
 */
(function (global) {
  'use strict';

  const STANDARD_SPRACHE_TEXT = 'en';

  const UEBERSETZUNGEN = {
    'startseite.titel': { de: 'FLOW GAME', en: 'FLOW GAME' },
    'startseite.kicker': {
      de: 'Ein Lernspiel zu Flow, Batchsizing und Kontextwechsel',
      en: 'A learning game about flow, batch sizing, and context switching',
    },
    'startseite.cta': { de: 'Spiel erstellen oder beitreten', en: 'Create or join a game' },
    'startseite.zurStartseite': { de: 'Zur Startseite', en: 'Back to homepage' },

    // FEATURE-007 (2026-07-28): ersetzt die beiden bisherigen internen
    // Entwicklerhinweis-Schlüssel startseite.tag/startseite.hinweisPanel
    // (Baustellen-/Bauphasen-Text, siehe Backlog.md AK6 - deckt auch TASK-006
    // vollständig ab) durch drei inhaltlich erklärende Panels (Layout-Variante 1, siehe
    // Backlog.md "Entscheidung (Stephan, 2026-07-28)"). Wortlaut ist final
    // und verbindlich freigegeben (Backlog.md "Finaler Wortlaut der drei
    // Panels") - keine eigenmächtigen Formulierungsänderungen. Muss synchron
    // mit src/i18n/uebersetzungen.js gehalten werden (siehe Kopfkommentar).
    'startseite.zweckUeberschrift': { de: 'Warum dieses Spiel?', en: 'Why this game?' },
    'startseite.zweckText': {
      de: 'In diesem Spiel erlebt ihr live, wie eure Arbeitsweise Tempo und Qualität beeinflusst – oft auf überraschende Weise. Ihr bearbeitet gemeinsam Aufgaben in mehreren kurzen Runden und probiert dabei unterschiedliche Herangehensweisen aus, die auf Lean- und Flow-Prinzipien beruhen (dem Denken hinter modernen, schlanken Arbeitsprozessen). Am Ende vergleicht ihr eure Ergebnisse und diskutiert gemeinsam, was das für eure eigene Arbeit bedeutet.',
      en: "In this game, you'll experience live how your way of working affects speed and quality – often in surprising ways. Together you'll tackle tasks across several short rounds, trying out different approaches rooted in lean and flow thinking (the ideas behind modern, streamlined ways of working). At the end, you'll compare your results and discuss together what it means for how you work.",
    },
    'startseite.spieleranzahlUeberschrift': { de: 'Wie viele Personen braucht ihr?', en: 'How many people do you need?' },
    'startseite.spieleranzahlText': {
      de: 'Ihr braucht mindestens fünf Mitspielende an den Stationen sowie einen Host, der/die das Spiel moderiert und steuert – insgesamt also mindestens sechs Personen. Wer zusätzlich zuschauen möchte, kann als Beobachter(in) live dabei sein, ohne selbst einzugreifen.',
      en: "You need at least five players at the stations, plus a host who moderates and runs the game – so at least six people in total. Anyone who'd like to watch can join as an observer, following along live without taking part.",
    },
    'startseite.ablaufUeberschrift': { de: 'Wie läuft es ab?', en: 'How does it work?' },
    'startseite.ablaufText': {
      de: 'Ihr durchlauft gemeinsam vier kurze Runden an denselben fünf Arbeitsstationen. In den ersten Runden verändert sich, wie groß die Arbeitspakete sind, die ihr gemeinsam bearbeitet; in der letzten Runde probiert ihr eine ganz andere Arbeitsweise aus. Dabei seht ihr live und in Zahlen, wie sich das jeweils auf euer Tempo und die Qualität eurer Ergebnisse auswirkt. Die genauen Regeln jeder Runde erklärt euch der Host direkt im Spiel.',
      en: "Together you'll play four short rounds at the same five work stations. In the first rounds, what changes is how big the work packages are that you handle together; in the final round, you'll try a completely different way of working. Along the way you'll see live, in real numbers, how each approach affects your speed and the quality of your results. Your host will walk you through the exact rules of each round as you play.",
    },

    // BUGFIX (2026-07-21, live von Stephan im Browser gefunden, siehe
    // Backlog.md FEATURE-006): der Kicker/Logo-Text über der Überschrift war
    // in public/spiel.html komplett hartcodiert ("Spiel-Räume"), ohne t()-
    // Aufruf und ohne Schlüssel hier - blieb dadurch in jeder Sprache immer
    // Deutsch. Neuer Schlüssel schliesst diese Lücke.
    'lobby.kicker': { de: 'Spiel-Räume', en: 'Game rooms' },
    'lobby.untertitel': {
      de: 'Erstelle ein Spiel oder tritt mit einem Beitritts-Code bei.',
      en: 'Create a game or join with an invite code.',
    },
    'lobby.tabErstellen': { de: 'Spiel erstellen', en: 'Create game' },
    'lobby.tabBeitreten': { de: 'Spiel beitreten', en: 'Join game' },
    'lobby.erstellen': { de: 'Spiel erstellen', en: 'Create game' },
    'lobby.beitreten': { de: 'Beitreten', en: 'Join' },
    'lobby.wirdBearbeitet': { de: 'Wird bearbeitet …', en: 'Processing …' },
    'lobby.hostNameLabel': { de: 'Dein Anzeigename (als Host)', en: 'Your display name (as host)' },
    'lobby.hostNamePlatzhalter': { de: 'z. B. Chris', en: 'e.g. Chris' },
    'lobby.beitrittCodeLabel': { de: 'Beitritts-Code', en: 'Join code' },
    'lobby.beitrittCodePlatzhalter': { de: '8 Zeichen, z. B. AB3DE7GK', en: '8 characters, e.g. AB3DE7GK' },
    'lobby.beitrittNameLabel': { de: 'Dein Anzeigename', en: 'Your display name' },
    'lobby.beitrittNamePlatzhalter': { de: 'z. B. Robin', en: 'e.g. Robin' },
    'lobby.rolleWahlLabel': {
      de: 'Alle Stationen sind belegt – bitte Rolle wählen',
      en: 'All stations are taken – please choose a role',
    },
    'lobby.rolleBeobachtendeOption': { de: 'Als Beobachtende beitreten', en: 'Join as observer' },
    'lobby.rundeStarten': { de: 'Aufgabe vorstellen (Runde 1 starten)', en: 'Present task (start round 1)' },
    'lobby.duBistHostSchlicht': { de: 'Du bist Host dieses Spiels.', en: 'You are the host of this game.' },
    'lobby.duBistHostMitTeilen': {
      de: 'Du bist Host dieses Spiels. Teile den Code mit deiner Gruppe.',
      en: 'You are the host of this game. Share the code with your group.',
    },
    'lobby.duBistRolleInSpiel': { de: 'Du bist {rolle} in diesem Spiel.', en: 'You are {rolle} in this game.' },
    'lobby.deineStation': { de: 'Deine Station:', en: 'Your station:' },
    'lobby.duBistBeobachtende': { de: 'Du bist als Beobachtende dabei.', en: 'You are taking part as an observer.' },

    // BUGFIX-003: Lobby-Erläuterung + Live-Zähler, Rundenkontext - siehe
    // Kommentare in src/i18n/uebersetzungen.js (diese Datei muss inhaltlich
    // synchron gehalten werden, siehe Kopfkommentar oben).
    'lobby.startHinweis': {
      de: 'Das Spiel beginnt erst, wenn der Host es startet. Dafür werden mindestens 5 Spielende und 1 Host benötigt – wer beitritt, wartet hier in der Lobby, bis es losgeht.',
      en: 'The game only begins once the host starts it. That requires at least 5 players and 1 host – everyone who joins waits here in the lobby until it begins.',
    },
    'lobby.liveZaehler': {
      de: '{aktuell} von {minimum} Spielenden beigetreten',
      en: '{aktuell} of {minimum} players joined',
    },
    'lobby.untertitelInLobby': {
      de: 'Du bist in der Lobby – das Spiel beginnt, sobald der Host startet.',
      en: 'You are in the lobby – the game will begin once the host starts it.',
    },

    'rollen.host': { de: 'Host', en: 'Host' },
    'rollen.spielende': { de: 'Spielende', en: 'Players' },
    'rollen.beobachtende': { de: 'Beobachtende', en: 'Observers' },

    'spielbrett.runde': { de: 'Runde', en: 'Round' },
    'spielbrett.durchlaufzeit': { de: 'Durchlaufzeit', en: 'Lead time' },
    'spielbrett.bearbeitungszeit': { de: 'Bearbeitungszeit', en: 'Processing time' },
    'spielbrett.dorHinweis': {
      de: 'Bevor Karten bewegt werden können, muss die Gruppe die Aufgabe verstanden haben.',
      en: 'Before cards can be moved, the group needs to understand the task.',
    },
    'spielbrett.dorButton': { de: 'Definition of Ready abschließen', en: 'Complete Definition of Ready' },
    'spielbrett.auftragseingang': { de: 'Auftragseingang', en: 'Order intake' },
    'spielbrett.ziel': { de: 'Ziel', en: 'Target' },
    'station.wareneingang': { de: 'Wareneingang', en: 'Goods receipt' },
    'station.kommissionierung': { de: 'Kommissionierung', en: 'Picking' },
    'station.packstation': { de: 'Packstation', en: 'Packing' },
    'station.versand': { de: 'Versand', en: 'Shipping' },
    'station.qualitaetskontrolle': { de: 'Qualitätskontrolle', en: 'Quality control' },
    'spielbrett.torOffen': { de: 'offen', en: 'open' },
    'spielbrett.torGeschlossen': { de: 'geschlossen', en: 'closed' },
    'spielbrett.torPraefix': { de: 'Tor', en: 'Gate' },
    'spielbrett.hostHinweis': {
      de: 'Du bist Host und beobachtest das Spielfeld - eigene Kartenzüge macht das Team.',
      en: 'You are the host and observe the board - the team makes the actual card moves.',
    },
    'spielbrett.beobachtendeHinweis': {
      de: 'Du bist Beobachtende/r - du siehst dem Team beim Spielen zu.',
      en: 'You are an observer - you watch the team play.',
    },
    'spielbrett.karteWeiterbewegen': { de: 'Weiterbewegen', en: 'Move forward' },
    // BUGFIX-003 (c/d/b): siehe Kommentare in src/i18n/uebersetzungen.js.
    'spielbrett.stationUnbesetzt': { de: 'noch nicht besetzt', en: 'not yet assigned' },
    'spielbrett.rundeKontextMitPhase': { de: 'Runde {rundenNummer} läuft – {phase}', en: 'Round {rundenNummer} in progress – {phase}' },
    'spielbrett.rundeKontextOhnePhase': { de: 'Runde {rundenNummer} wird geladen …', en: 'Round {rundenNummer} is loading …' },

    'phase.aufgabeVorgestellt': { de: 'Aufgabe vorgestellt', en: 'Task presented' },
    'phase.dorAbgeschlossen': { de: 'Bereit – Karten können bewegt werden', en: 'Ready – cards can be moved' },
    'phase.beendet': { de: 'Runde beendet', en: 'Round finished' },

    'rundeVier.wuerfelAufgabe': { de: 'Würfel-Aufgabe', en: 'Dice task' },
    'rundeVier.wuerfel': { de: 'Würfel', en: 'Dice' },
    'rundeVier.laenderkarte': { de: 'Länderkarte', en: 'Country card' },
    'rundeVier.wuerfeln': { de: 'Würfeln', en: 'Roll dice' },
    'rundeVier.stadtEintragen': { de: 'Stadt eintragen', en: 'Enter city' },
    'rundeVier.absenden': { de: 'Absenden', en: 'Submit' },
    'rundeVier.leerHinweis': {
      de: 'Du wartest gerade auf das nächste Element - es ist noch bei einer anderen Person unterwegs.',
      en: 'You are currently waiting for the next element - it is still on its way with someone else.',
    },
    'rundeVier.wartetAufAufgabe': {
      de: 'wartet, bis du mit der aktuellen Aufgabe fertig bist',
      en: 'waiting until you finish the current task',
    },
    'rundeVier.wartetBisAnkunft': { de: 'wartet, bis es bei dir ankommt', en: 'waiting until it reaches you' },
    'rundeVier.hostHinweis': {
      de: 'Du bist Host und beobachtest das Spielfeld - eigene Züge macht das Team.',
      en: 'You are the host and observe the board - the team makes the actual moves.',
    },
    'rundeVier.beobachtendeHinweis': {
      de: 'Du bist Beobachtende/r - du siehst dem Team beim Spielen zu.',
      en: 'You are an observer - you watch the team play.',
    },

    'kennzahlen.titel': { de: 'Runde beendet – Kennzahlen', en: 'Round finished – metrics' },
    'kennzahlen.gesperrt': {
      de: 'Die Ergebnisse dieser Runde sind noch nicht freigegeben. Der Host gibt alle Kennzahlen gemeinsam frei, sobald alle Runden gespielt sind.',
      en: 'The results of this round have not been released yet. The host releases all metrics together once every round has been played.',
    },
    'kennzahlen.bisErsteLieferung': { de: 'Bis 1. Lieferung', en: 'Until 1st delivery' },
    'kennzahlen.bisLetzteLieferung': { de: 'Bis letzte Lieferung', en: 'Until last delivery' },
    'kennzahlen.abstandLieferung': { de: 'Abstand 1.↔letzte Lieferung', en: 'Spread 1st↔last delivery' },
    'kennzahlen.qualitaetKorrekt': { de: 'Qualität (korrekt)', en: 'Quality (correct)' },
    'kennzahlen.beteiligungTitel': { de: 'Beteiligung je Station:', en: 'Participation per station:' },
    'kennzahlen.bewegungen': { de: 'Bewegungen', en: 'moves' },
    'kennzahlen.beteiligungsspanne': { de: 'Beteiligungsspanne', en: 'participation span' },
    // BUGFIX-003 (d): siehe Kommentar in src/i18n/uebersetzungen.js.
    'kennzahlen.zustaendigePerson': { de: 'Zuständige Person', en: 'Person in charge' },
    'kennzahlen.hostVorschauTitel': {
      de: 'Vorschau – nur für dich als Host sichtbar',
      en: 'Preview – visible only to you as host',
    },
    'kennzahlen.hostVorschauHinweis': {
      de: 'Vergleich aller bisher gespielten Runden, bevor du für alle freigibst.',
      en: 'Comparison of all rounds played so far, before you release it to everyone.',
    },
    'kennzahlen.naechsteRunde': { de: 'Nächste Runde starten', en: 'Start next round' },
    'kennzahlen.ergebnisseFreigeben': { de: 'Ergebnisse für alle freigeben', en: 'Release results to everyone' },
    'kennzahlen.freigabeBestaetigung': {
      de: 'Ergebnisse jetzt für alle freigeben? Danach sehen alle Spielenden und Beobachtenden sofort alle Kennzahlen aller Runden - das lässt sich nicht zurücknehmen.',
      en: 'Release results to everyone now? All players and observers will immediately see every metric of every round - this cannot be undone.',
    },
    'kennzahlen.spielFertigHinweis': {
      de: 'Alle Runden sind gespielt – sobald du die Ergebnisse freigibst, sehen alle den vollständigen Vergleich.',
      en: 'All rounds have been played – once you release the results, everyone will see the full comparison.',
    },
    'auswertung.titel': { de: 'Auswertung – Vergleich aller Runden', en: 'Evaluation – comparison of all rounds' },
    'auswertung.hinweis': {
      de: 'Freigegeben durch den Host – alle Kennzahlen aller gespielten Runden, alle fünf Stationen.',
      en: 'Released by the host – every metric of every round played, all five stations.',
    },
    'vergleich.keineDaten': { de: 'Es liegen noch keine ausgewerteten Runden vor.', en: 'No evaluated rounds are available yet.' },
    'vergleich.zeitBisErsteLieferung': { de: 'Zeit bis 1. Lieferung', en: 'Time until 1st delivery' },
    'vergleich.zeitBisLetzteLieferung': { de: 'Zeit bis letzte Lieferung', en: 'Time until last delivery' },
    'vergleich.abstandKundenerlebnis': {
      de: 'Abstand erste↔letzte Lieferung (Kundenerlebnis)',
      en: 'Spread first↔last delivery (customer experience)',
    },
    'vergleich.fehlerzahl': { de: 'Fehlerzahl', en: 'Error count' },
    'vergleich.qualitaet': { de: 'Qualität (korrekt/gesamt)', en: 'Quality (correct/total)' },
    'vergleich.qualitaetFalschesLand': { de: 'Qualität – falsches Land', en: 'Quality – wrong country' },
    'vergleich.qualitaetDubletten': { de: 'Qualität – Dubletten', en: 'Quality – duplicates' },

    // FEATURE-019: Qualitätsauswertung zeigt Details (Land/Stadt/Grund je
    // Eintrag, als Tabelle, ALLE 30 Einträge, ohne Personenzuordnung).
    'vergleich.qualitaetDetailTitel': { de: 'Detailauswertung je Stadt', en: 'Detailed results per city' },
    'vergleich.qualitaetDetailLand': { de: 'Land', en: 'Country' },
    'vergleich.qualitaetDetailStadt': { de: 'Stadt', en: 'City' },
    'vergleich.qualitaetDetailErgebnis': { de: 'Ergebnis', en: 'Result' },
    'vergleich.qualitaetDetailKorrekt': { de: 'korrekt', en: 'correct' },
    'vergleich.qualitaetDetailFalschesLand': { de: 'falsches Land', en: 'wrong country' },
    'vergleich.qualitaetDetailDublette': { de: 'Dublette', en: 'duplicate' },
    'vergleich.qualitaetDetailFalschesLandUndDublette': {
      de: 'falsches Land + Dublette',
      en: 'wrong country + duplicate',
    },

    'fehler.ungueltigerCode': { de: 'Ungültiger oder unbekannter Code.', en: 'Invalid or unknown code.' },
    'fehler.spielVoll': {
      de: 'Alle Stationen sind bereits belegt. Bitte bewusst eine andere Rolle wählen (z. B. Beobachtende).',
      en: 'All stations are already taken. Please consciously choose a different role (e.g. observer).',
    },
    'fehler.anzeigenameErforderlich': { de: 'Anzeigename ist erforderlich.', en: 'Display name is required.' },
    'fehler.fehlendeAuthSitzung': {
      de: 'Fehlende Auth-Sitzung – anonyme Anmeldung ist Voraussetzung.',
      en: 'Missing auth session – anonymous sign-in is required.',
    },
    'fehler.ungueltigeRolle': {
      de: 'Ungültige Rolle – bitte "spielende" oder "beobachtende" wählen.',
      en: 'Invalid role – please choose "player" or "observer".',
    },
    'fehler.spielInaktiv': {
      de: 'Dieses Spiel ist seit über 24 Stunden inaktiv und der Code nicht mehr gültig.',
      en: 'This game has been inactive for over 24 hours and the code is no longer valid.',
    },
    'fehler.stationenVollNachtraeglich': {
      de: 'Alle Stationen wurden gerade in diesem Moment vergeben. Bitte Rolle wählen und erneut beitreten.',
      en: 'All stations were just taken this very moment. Please choose a role and join again.',
    },
    'fehler.hostKennungUngueltig': { de: 'Host-Session-Kennung ist ungültig.', en: 'Host session token is invalid.' },
    'fehler.nurEinSchritt': {
      de: 'Nur ein Schritt vorwärts erlaubt – Stationen können nicht übersprungen werden.',
      en: 'Only one step forward is allowed – stations cannot be skipped.',
    },
    'fehler.positionMax': { de: 'Diese Position ist die letzte gültige Position.', en: 'This position is the last valid position.' },
    'fehler.positionFehlt': { de: 'Herkunfts- und Zielposition sind erforderlich.', en: 'Origin and target position are required.' },
    'fehler.wechselzwang': {
      de: 'Wechselzwang: du musst jetzt zwischen den Typen wechseln.',
      en: 'Switch required: you now need to switch between element types.',
    },
    'fehler.unbekannteRunde': { de: 'Unbekannte Rundennummer.', en: 'Unknown round number.' },
    'fehler.vonRundeErforderlich': { de: 'Die aktuelle Runde ist erforderlich.', en: 'The current round is required.' },
    'fehler.tabIdErforderlich': { de: 'Tab-Kennung ist erforderlich.', en: 'Tab identifier is required.' },
    'fehler.sprachwertUngueltig': { de: 'Ungültiger Sprachwert.', en: 'Invalid language value.' },
    'fehler.ungueltigeKartenliste': { de: 'Ungültige Kartenliste.', en: 'Invalid list of cards.' },
    'fehler.stadtErforderlich': { de: 'Stadt ist erforderlich.', en: 'A city is required.' },
    'fehler.unbekannterElementtyp': { de: 'Unbekannter Elementtyp.', en: 'Unknown element type.' },
    'fehler.ladenFehlgeschlagen': { de: 'Fehler beim Laden: {nachricht}', en: 'Error while loading: {nachricht}' },
    'fehler.datenNichtGeladen': { de: 'Daten konnten nicht geladen werden', en: 'Data could not be loaded' },
    'hinweis.tabInaktiv': {
      de: 'Dieses Fenster ist nicht mehr aktiv – du hast das Spiel in einem neueren Fenster/Tab geöffnet. Bitte dort weiterspielen.',
      en: 'This window is no longer active – you have opened the game in a newer window/tab. Please continue playing there.',
    },
    'hinweis.verbindungWirdAufgebaut': {
      de: 'Verbindung wird aufgebaut – bitte einen Moment warten …',
      en: 'Connecting – please wait a moment …',
    },

    'sprachumschalter.label': { de: 'Sprache', en: 'Language' },
    'sprachumschalter.deutsch': { de: 'Deutsch', en: 'German' },
    'sprachumschalter.englisch': { de: 'Englisch', en: 'English' },
    'sprachumschalter.nurHost': {
      de: 'Nur der Host kann die Sprache für dieses Spiel ändern.',
      en: 'Only the host can change the language for this game.',
    },

    'aria.kartePosition': {
      de: 'Karte {karte} weiterbewegen von {von} zu {nach}',
      en: 'Move card {karte} forward from {von} to {nach}',
    },
    'aria.stadtEintragen': { de: 'Stadt eintragen', en: 'Enter city' },
  };

  const FEHLERCODE_ZU_SCHLUESSEL = {
    UNGUELTIGER_CODE: 'fehler.ungueltigerCode',
    SPIEL_VOLL: 'fehler.spielVoll',
    ANZEIGENAME_ERFORDERLICH: 'fehler.anzeigenameErforderlich',
    FEHLENDE_AUTH_SITZUNG: 'fehler.fehlendeAuthSitzung',
    UNGUELTIGE_ROLLE: 'fehler.ungueltigeRolle',
    SPIEL_INAKTIV: 'fehler.spielInaktiv',
    STATIONEN_VOLL_NACHTRAEGLICH: 'fehler.stationenVollNachtraeglich',
    HOST_KENNUNG_UNGUELTIG: 'fehler.hostKennungUngueltig',
    NUR_EIN_SCHRITT: 'fehler.nurEinSchritt',
    POSITION_MAX: 'fehler.positionMax',
    POSITION_FEHLT: 'fehler.positionFehlt',
    WECHSELZWANG: 'fehler.wechselzwang',
    UNBEKANNTE_RUNDE: 'fehler.unbekannteRunde',
    VON_RUNDE_ERFORDERLICH: 'fehler.vonRundeErforderlich',
    TAB_ID_ERFORDERLICH: 'fehler.tabIdErforderlich',
    UNGUELTIGE_SPRACHE: 'fehler.sprachwertUngueltig',
    UNGUELTIGE_KARTENLISTE: 'fehler.ungueltigeKartenliste',
    STADT_ERFORDERLICH: 'fehler.stadtErforderlich',
    UNBEKANNTER_ELEMENTTYP: 'fehler.unbekannterElementtyp',
  };

  function ersetzePlatzhalter(text, ersetzungen) {
    if (!ersetzungen) return text;
    return Object.keys(ersetzungen).reduce(function (zwischenergebnis, platzhalter) {
      return zwischenergebnis.split('{' + platzhalter + '}').join(ersetzungen[platzhalter]);
    }, text);
  }

  function uebersetze(schluessel, sprache, ersetzungen) {
    const effektiveSprache = sprache || STANDARD_SPRACHE_TEXT;
    const eintrag = UEBERSETZUNGEN[schluessel];
    if (!eintrag) return schluessel;
    const text = eintrag[effektiveSprache] != null ? eintrag[effektiveSprache] : eintrag[STANDARD_SPRACHE_TEXT];
    return ersetzePlatzhalter(text, ersetzungen);
  }

  function uebersetzeFehlercode(code, sprache, fallbackText) {
    const schluessel = FEHLERCODE_ZU_SCHLUESSEL[code];
    if (!schluessel) return fallbackText || code || '';
    return uebersetze(schluessel, sprache);
  }

  global.FlowGame = global.FlowGame || {};
  Object.assign(global.FlowGame, {
    UEBERSETZUNGEN: UEBERSETZUNGEN,
    FEHLERCODE_ZU_SCHLUESSEL: FEHLERCODE_ZU_SCHLUESSEL,
    uebersetze: uebersetze,
    uebersetzeFehlercode: uebersetzeFehlercode,
  });
})(window);
