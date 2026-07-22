/**
 * FEATURE-006 – Mehrsprachigkeit (Deutsch/Englisch)
 * Zentrale Text-/Schlüssel-Tabelle (Option A, siehe Backlog.md FEATURE-006 –
 * rein clientseitiges Übersetzungssystem, kein Cloud Functions). Deckt laut
 * AK 3 wirklich alle sichtbaren Bereiche ab: Startseite/Landingpage,
 * Beitritts-/Erstellungsformular, Lobby, Spielbrett aller vier Runden,
 * Anleitungs-/Instruktionstexte, Kennzahlen-/Auswertungsansicht,
 * Fehlermeldungen sowie die aria-labels aus FEATURE-005 (Pre-Mortem-Risiko 6:
 * dieselbe Tabelle statt separater Pflege).
 *
 * NAMENSGEBUNG/Struktur: UEBERSETZUNGEN = { [schluessel]: { de, en } }.
 * uebersetze(schluessel, sprache = STANDARD_SPRACHE, ersetzungen) liefert den
 * Text für die angegebene Sprache; ohne Sprachangabe gilt die Grundeinstellung
 * Englisch (AK 1). `ersetzungen` ist ein optionales Objekt für einfache
 * {platzhalter}-Ersetzungen (z. B. aria.kartePosition), wird von den
 * bestehenden BDD-Tests nicht verlangt, aber von der UI-Anbindung gebraucht.
 *
 * WICHTIG: Diese Datei muss inhaltlich synchron gehalten werden mit der
 * Browser-Kopie public/js/i18n/uebersetzungen.js (Projekt-Konvention, kein
 * Bundler – siehe joinGame.js/hostSession.js-Kopfkommentare).
 *
 * Fehlercodes (AK 7, Pre-Mortem-Risiko 2): FEHLERCODE_ZU_SCHLUESSEL bildet die
 * sprachneutralen `err.code`-Werte aus den Logikmodulen (joinGame.js,
 * kartenBewegung.js, stapelTor.js, hostSession.js, teilnehmerSession.js,
 * rundenwechsel.js, rundeVier/elementBewegung.js) auf einen Schlüssel dieser
 * Tabelle ab – die Übersetzung selbst passiert ausschliesslich an der
 * Anzeigestelle, nie in der Logik.
 */

const STANDARD_SPRACHE_TEXT = 'en';

const UEBERSETZUNGEN = {
  // ---- Startseite / Landingpage ------------------------------------------
  'startseite.titel': { de: 'FLOW GAME', en: 'FLOW GAME' },
  'startseite.kicker': {
    de: 'Ein Lernspiel zu Flow, Batchsizing und Kontextwechsel',
    en: 'A learning game about flow, batch sizing, and context switching',
  },
  'startseite.tag': {
    de: 'Grundgerüst live — die eigentliche Spiellogik folgt in den nächsten Phasen.',
    en: 'Basic setup live — the actual game logic follows in the next phases.',
  },
  'startseite.cta': { de: 'Spiel erstellen oder beitreten', en: 'Create or join a game' },
  'startseite.hinweisPanel': {
    de: 'Diese Seite bestätigt: Hosting, Deploy-Pipeline und Design-Übernahme aus „Agent Contract" funktionieren (Phase 0, Teil 1).',
    en: 'This page confirms: hosting, deploy pipeline and design carried over from "Agent Contract" all work (Phase 0, Part 1).',
  },
  'startseite.zurStartseite': { de: 'Zur Startseite', en: 'Back to homepage' },

  // ---- Beitritts-/Erstellungsformular -------------------------------------
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

  // ---- Rollen (auch für Badges/Anzeigetexte) ------------------------------
  'rollen.host': { de: 'Host', en: 'Host' },
  'rollen.spielende': { de: 'Spielende', en: 'Players' },
  'rollen.beobachtende': { de: 'Beobachtende', en: 'Observers' },

  // ---- Spielbrett Runde 1-3 ------------------------------------------------
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

  // ---- Phasen-Anzeige ------------------------------------------------------
  'phase.aufgabeVorgestellt': { de: 'Aufgabe vorgestellt', en: 'Task presented' },
  'phase.dorAbgeschlossen': { de: 'Bereit – Karten können bewegt werden', en: 'Ready – cards can be moved' },
  'phase.beendet': { de: 'Runde beendet', en: 'Round finished' },

  // ---- Spielbrett Runde 4 (Kontextwechsel) --------------------------------
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

  // ---- Kennzahlen-/Auswertungsansicht --------------------------------------
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

  // ---- Fehlermeldungen (AK 7, sprachneutrale Fehlercodes) ------------------
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

  // ---- Sprachumschalter -----------------------------------------------------
  'sprachumschalter.label': { de: 'Sprache', en: 'Language' },
  'sprachumschalter.deutsch': { de: 'Deutsch', en: 'German' },
  'sprachumschalter.englisch': { de: 'Englisch', en: 'English' },
  'sprachumschalter.nurHost': {
    de: 'Nur der Host kann die Sprache für dieses Spiel ändern.',
    en: 'Only the host can change the language for this game.',
  },

  // ---- aria-labels (FEATURE-005, Pre-Mortem-Risiko 6) ----------------------
  'aria.kartePosition': {
    de: 'Karte {karte} weiterbewegen von {von} zu {nach}',
    en: 'Move card {karte} forward from {von} to {nach}',
  },
  'aria.stadtEintragen': { de: 'Stadt eintragen', en: 'Enter city' },
};

// Ordnet die sprachneutralen `err.code`-Werte aus den Logikmodulen einem
// Schlüssel dieser Tabelle zu (AK 7, Pre-Mortem-Risiko 2). Die Übersetzung
// selbst passiert ausschliesslich an der Anzeigestelle mit uebersetze().
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
  return Object.keys(ersetzungen).reduce(
    (zwischenergebnis, platzhalter) => zwischenergebnis.split(`{${platzhalter}}`).join(ersetzungen[platzhalter]),
    text
  );
}

function uebersetze(schluessel, sprache = STANDARD_SPRACHE_TEXT, ersetzungen) {
  const eintrag = UEBERSETZUNGEN[schluessel];
  if (!eintrag) {
    return schluessel;
  }
  const text = eintrag[sprache] != null ? eintrag[sprache] : eintrag[STANDARD_SPRACHE_TEXT];
  return ersetzePlatzhalter(text, ersetzungen);
}

// Komfort-Funktion: übersetzt direkt einen bekannten `err.code`-Wert. Fällt
// auf die rohe Fehlermeldung zurück, falls der Code (noch) nicht in der
// Zuordnungstabelle steht, statt eine leere/undefinierte Anzeige zu erzeugen.
function uebersetzeFehlercode(code, sprache = STANDARD_SPRACHE_TEXT, fallbackText) {
  const schluessel = FEHLERCODE_ZU_SCHLUESSEL[code];
  if (!schluessel) {
    return fallbackText || code || '';
  }
  return uebersetze(schluessel, sprache);
}

module.exports = {
  UEBERSETZUNGEN,
  FEHLERCODE_ZU_SCHLUESSEL,
  uebersetze,
  uebersetzeFehlercode,
};
