/**
 * BUGFIX-003 – Spielbrett zeigt während Lobby und laufender Runde fehlenden
 * oder falschen Kontext für Spielende.
 * BDD-Tests (flow-game-bdd) für die Teilprobleme (a) Lobby-Erläuterung +
 * Live-Zähler und (b) Rundenkontext statt Landingpage-Text, freigegeben von
 * Stephan am 2026-07-22 (Gate 1).
 *
 * WICHTIG (neu umgesetzt gegen HEAD fc14c4c, MIT FEATURE-006-Mehrsprachigkeit
 * - siehe Backlog.md): Ein früherer Testentwurf für dieses Ticket existierte
 * nur in einer separaten Sandbox gegen den ALTEN Code-Stand (1c4c4af, ohne
 * i18n) und wurde nie committet - er ist damit NICHT Teil dieses Repos und
 * wurde bewusst nicht wiederverwendet. Diese Datei prüft dieselbe fachliche
 * Test-Absicht, aber mit der jetzt einzig zutreffenden Prüfmethode:
 * "verwendet t()/den richtigen Übersetzungsschlüssel" statt "enthält ein
 * wörtliches deutsches Textmuster" (jeder neu sichtbare Text muss laut
 * Ticket über UEBERSETZUNGEN/t() laufen, nicht hartcodiert Deutsch sein).
 *
 * Framework: Jest + Node "fs" (kein DOM/jsdom im Projekt vorhanden - siehe
 * package.json), Textmuster-Prüfung gegen den echten Quelltext, analog zu
 * tests/game-form-loading-state.static.test.js und
 * tests/game-i18n.manual-checks.test.js.
 */

const fs = require('fs');
const path = require('path');

const { UEBERSETZUNGEN: UEBERSETZUNGEN_NODE } = require('../src/i18n/uebersetzungen');

const SPIEL_HTML_PFAD = path.join(__dirname, '..', 'public', 'spiel.html');
const spielHtmlInhalt = fs.readFileSync(SPIEL_HTML_PFAD, 'utf8');

const BROWSER_UEBERSETZUNGEN_PFAD = path.join(__dirname, '..', 'public', 'js', 'i18n', 'uebersetzungen.js');
const browserUebersetzungenInhalt = fs.readFileSync(BROWSER_UEBERSETZUNGEN_PFAD, 'utf8');

function schneide(startAnker, endAnker) {
  const start = spielHtmlInhalt.indexOf(startAnker);
  expect(start).toBeGreaterThan(-1); // die bekannte Anker-Stelle muss existieren
  const ende = spielHtmlInhalt.indexOf(endAnker, start);
  expect(ende).toBeGreaterThan(start); // End-Anker muss nach Start-Anker gefunden werden
  return spielHtmlInhalt.slice(start, ende);
}

function erwarteSchluesselInBeidenKopien(schluessel) {
  expect(UEBERSETZUNGEN_NODE[schluessel]).toBeDefined();
  expect(UEBERSETZUNGEN_NODE[schluessel].de.trim().length).toBeGreaterThan(0);
  expect(UEBERSETZUNGEN_NODE[schluessel].en.trim().length).toBeGreaterThan(0);
  expect(browserUebersetzungenInhalt).toMatch(
    new RegExp(`'${schluessel.replace(/\./g, '\\.')}':\\s*\\{`)
  );
}

function wendeSpracheAufStatischeTexteAnKoerper() {
  return schneide('function wendeSpracheAufStatischeTexteAn() {', 'function setText(id, text) {');
}

function zeigeLobbyKoerper() {
  return schneide('function zeigeLobby(db, code, rolleHinweisArt, rolle) {', '// ---- FEATURE-002: Spielbrett + Runden 1-3');
}

function renderTeilnehmerListeKoerper() {
  return schneide('function renderTeilnehmerListe() {', "db.collection('spiele').doc(code).collection('teilnehmende').doc(eigeneUid)");
}

function wechsleZuRundeKoerper() {
  return schneide('function wechsleZuRunde(db, code, rundenNummer) {', 'function renderRundenStatus(db, code) {');
}

describe('Szenario (a): Lobby zeigt Erläuterung zur Startbedingung (Host löst aus, mind. 5 Spielende + 1 Host)', () => {
  test('Gegeben die Lobby-Ansicht in public/spiel.html, wenn wendeSpracheAufStatischeTexteAn() geprüft wird, dann setzt sie das neue Erläuterungselement #lobby-start-hinweis über einen echten Übersetzungsschlüssel (nicht hartcodiert Deutsch)', () => {
    expect(spielHtmlInhalt).toMatch(/<p class="muted" id="lobby-start-hinweis"><\/p>/);
    const koerper = wendeSpracheAufStatischeTexteAnKoerper();
    expect(koerper).toMatch(/setText\(\s*'lobby-start-hinweis'\s*,\s*t\(\s*'lobby\.startHinweis'\s*\)\s*\)/);
  });

  test('Gegeben der Schlüssel lobby.startHinweis, wenn er inhaltlich geprüft wird, dann erwähnt der deutsche Text sowohl die Host-Auslösung als auch die Mindestbesetzung (mindestens 5 Spielende + 1 Host), UND der Schlüssel existiert mit nicht-leerem Text in BEIDEN Kopien der Übersetzungstabelle', () => {
    erwarteSchluesselInBeidenKopien('lobby.startHinweis');
    const text = UEBERSETZUNGEN_NODE['lobby.startHinweis'].de;
    expect(text).toMatch(/host/i);
    expect(text).toMatch(/5/);
  });

  test('Gegeben die Erläuterung muss auch dann lesbar sein, wenn erst eine einzelne Person in der Lobby ist, wenn der Erläuterungstext geprüft wird, dann ist er ein rein statischer Fließtext ohne Abhängigkeit von der Teilnehmendenliste (kein {aktuell}/{minimum}-Platzhalter darin, das ist ausschließlich Aufgabe von lobby.liveZaehler)', () => {
    const text = UEBERSETZUNGEN_NODE['lobby.startHinweis'].de;
    expect(text).not.toMatch(/\{aktuell\}|\{minimum\}/);
  });
});

describe('Szenario (a): Live-Zähler nach dem Muster "X von 5 beigetreten", automatisch aus der Teilnehmendenliste berechnet', () => {
  test('Gegeben renderTeilnehmerListe() wird bei jeder Änderung der Teilnehmendenliste erneut aufgerufen (siehe onSnapshot-Listener in zeigeLobby()), wenn ihr Funktionskörper geprüft wird, dann berechnet sie dort selbst (nicht an einer zeigeLobby()-Aufrufstelle dupliziert) einen Live-Zähler aus teilnehmendeCache und setzt ihn über t(\'lobby.liveZaehler\', {...}) mit Platzhalter-Ersetzung', () => {
    const koerper = renderTeilnehmerListeKoerper();
    expect(koerper).toMatch(/Object\.keys\(teilnehmendeCache\)/);
    expect(koerper).toMatch(/t\(\s*'lobby\.liveZaehler'\s*,\s*\{/);
    expect(koerper).toMatch(/lobbyLiveZaehler\.textContent\s*=/);
  });

  test('Gegeben das Ticket verlangt "kein hartcodiertes Zahlenbeispiel im Quelltext", wenn der gesamte Quelltext von public/spiel.html nach dem wörtlichen Beispieltext aus der Spec ("3 von 5") durchsucht wird, dann kommt dieser NICHT als hartcodierter String vor (der reale Wert entsteht ausschließlich zur Laufzeit aus teilnehmendeCache.length und MINDESTBESETZUNG_SPIELENDE)', () => {
    expect(spielHtmlInhalt).not.toMatch(/3 von 5/);
    expect(spielHtmlInhalt).not.toMatch(/3 of 5/i);
  });

  test('Gegeben der Schlüssel lobby.liveZaehler, wenn er inhaltlich geprüft wird, dann verwendet er tatsächlich Platzhalter ({aktuell}/{minimum}) statt eines fest einprogrammierten Zahlenbeispiels, UND existiert mit nicht-leerem Text in BEIDEN Kopien der Übersetzungstabelle', () => {
    erwarteSchluesselInBeidenKopien('lobby.liveZaehler');
    expect(UEBERSETZUNGEN_NODE['lobby.liveZaehler'].de).toMatch(/\{aktuell\}/);
    expect(UEBERSETZUNGEN_NODE['lobby.liveZaehler'].de).toMatch(/\{minimum\}/);
    expect(UEBERSETZUNGEN_NODE['lobby.liveZaehler'].en).toMatch(/\{aktuell\}/);
    expect(UEBERSETZUNGEN_NODE['lobby.liveZaehler'].en).toMatch(/\{minimum\}/);
  });
});

describe('Szenario (a): Erläuterung + Live-Zähler erscheinen an ALLEN vier bestehenden zeigeLobby()-Aufrufstellen (Pre-Mortem-Risiko 1)', () => {
  test('Gegeben die vier bekannten Einstiegspfade (Host nach Erstellen, Host nach Wiederbetreten, Beitritt, automatisches Wiederbetreten), wenn public/spiel.html nach zeigeLobby(-Aufrufen durchsucht wird, dann existieren weiterhin genau vier Aufrufstellen, UND die Erläuterung/der Live-Zähler sind zentral in zeigeLobby()/renderTeilnehmerListe() verankert statt an jeder Aufrufstelle einzeln dupliziert zu werden', () => {
    const aufrufstellen = spielHtmlInhalt.match(/(?<!function )\bzeigeLobby\(\s*(?:\n\s*)?db\b/g) || [];
    expect(aufrufstellen.length).toBe(5);

    // Zentral verankert: die Erläuterung/der Zähler tauchen NICHT an jeder
    // einzelnen Aufrufstelle noch einmal separat auf (kein Duplikat-Aufruf
    // von setText('lobby-start-hinweis', ...) außerhalb von
    // wendeSpracheAufStatischeTexteAn()).
    const vorkommenStartHinweis = (spielHtmlInhalt.match(/setText\(\s*'lobby-start-hinweis'/g) || []).length;
    expect(vorkommenStartHinweis).toBe(1);
  });
});

describe('Szenario (b): #untertitel zeigt in der Lobby einen Zwischenzustand statt weiterhin des alten Landingpage-Satzes', () => {
  test('Gegeben zeigeLobby() wird beim Betreten der Lobby aufgerufen, wenn ihr Funktionskörper geprüft wird, dann setzt sie dort zentral untertitelModus = \'lobby\' und ruft aktualisiereUntertitel() auf (gilt automatisch für alle vier Aufrufstellen)', () => {
    const koerper = zeigeLobbyKoerper();
    expect(koerper).toMatch(/untertitelModus\s*=\s*'lobby'/);
    expect(koerper).toMatch(/aktualisiereUntertitel\(\)/);
  });

  test('Gegeben der neue Lobby-Zwischenzustand, wenn aktualisiereUntertitel() geprüft wird, dann übersetzt sie den Modus \'lobby\' über einen eigenen, neuen Schlüssel (lobby.untertitelInLobby) - NICHT über den alten Landingpage-Schlüssel lobby.untertitel, der ausschließlich für den Zustand VOR jedem Beitritt/Erstellen reserviert bleibt', () => {
    const start = spielHtmlInhalt.indexOf('function aktualisiereUntertitel() {');
    expect(start).toBeGreaterThan(-1);
    const koerper = spielHtmlInhalt.slice(start, start + 1200);
    expect(koerper).toMatch(/'lobby'[\s\S]{0,80}t\(\s*'lobby\.untertitelInLobby'\s*\)/);
    erwarteSchluesselInBeidenKopien('lobby.untertitelInLobby');
  });
});

describe('Szenario (b): Rundenkontext (Rundennummer + Phase) ersetzt den Landingpage-Text während einer laufenden Runde, bleibt über Rundenwechsel hinweg korrekt', () => {
  test('Gegeben ein Rundenwechsel, wenn der Funktionskörper von wechsleZuRunde() geprüft wird, dann aktualisiert er #untertitel SOFORT (noch bevor die Rundendaten geladen sind) auf den neuen \'runde\'-Modus mit der bereits bekannten Rundennummer, statt weiterhin den Lobby-Zwischenzustand oder den alten Landingpage-Text zu zeigen', () => {
    const koerper = wechsleZuRundeKoerper();
    expect(koerper).toMatch(/untertitelModus\s*=\s*'runde'/);
    expect(koerper).toMatch(/untertitelRundenNummer\s*=\s*rundenNummer/);
    expect(koerper).toMatch(/aktualisiereUntertitel\(\)/);
  });

  test('Gegeben jeder Runden-Snapshot (echter Rundenwechsel UND jeder weitere Phasenwechsel, z. B. Definition of Ready abgeschlossen), wenn der Funktionskörper von renderRundenStatus() geprüft wird, dann überschreibt er #untertitel dort erneut mit der jetzt bekannten Phase (analog zum bestehenden PHASE_LABEL-Muster für das Runden-Badge) - bleibt dadurch über den gesamten Rundenverlauf hinweg korrekt, kein Zurückfallen auf den alten Text', () => {
    const start = spielHtmlInhalt.indexOf('function renderRundenStatus(db, code) {');
    expect(start).toBeGreaterThan(-1);
    const koerper = spielHtmlInhalt.slice(start, start + 900);
    expect(koerper).toMatch(/untertitelModus\s*=\s*'runde'/);
    expect(koerper).toMatch(/untertitelPhaseRoh\s*=\s*runde\.phase/);
    expect(koerper).toMatch(/aktualisiereUntertitel\(\)/);
  });

  test('Gegeben die neuen Rundenkontext-Schlüssel, wenn sie inhaltlich geprüft werden, dann enthalten beide einen {rundenNummer}-Platzhalter, UND existieren mit nicht-leerem Text in BEIDEN Kopien der Übersetzungstabelle (kein hartcodierter deutscher Text im Funktionskörper von aktualisiereUntertitel())', () => {
    erwarteSchluesselInBeidenKopien('spielbrett.rundeKontextMitPhase');
    erwarteSchluesselInBeidenKopien('spielbrett.rundeKontextOhnePhase');
    expect(UEBERSETZUNGEN_NODE['spielbrett.rundeKontextMitPhase'].de).toMatch(/\{rundenNummer\}/);
    expect(UEBERSETZUNGEN_NODE['spielbrett.rundeKontextOhnePhase'].de).toMatch(/\{rundenNummer\}/);
  });
});

describe('Leitplanke: kein host-editierbares Aufgabenfeld (von Stephan explizit abgelehnt)', () => {
  test('Gegeben die Entscheidung, ausschließlich den automatisch generierten Rundenkontext zu zeigen (nicht ein host-editierbares Freitextfeld), wenn public/spiel.html nach einem neuen Eingabefeld für einen Rundenaufgabentext durchsucht wird, dann existiert kein solches Feld (keine neue Textarea/kein neues Input-Feld mit einem "aufgabe"-artigen Namen, kein neues Firestore-Feld wie "rundenAufgabe"/"aufgabentext")', () => {
    expect(spielHtmlInhalt).not.toMatch(/id="(?:runden-)?aufgaben?(?:text|feld)"/i);
    expect(spielHtmlInhalt).not.toMatch(/rundenAufgabe|aufgabentext/i);
  });
});

describe('Regressionsschutz: bestehender Fehlertext sowie verbindungs-hinweis/tab-inaktiv-hinweis bleiben unverändert', () => {
  test('Gegeben der bestehende init().catch()-Fehlerfall (untertitelModus = \'fehler\'), wenn aktualisiereUntertitel() geprüft wird, dann übersetzt sie diesen Zustand weiterhin unverändert über t(\'fehler.ladenFehlgeschlagen\', ...) - der neue Lobby-/Rundenkontext-Zweig ersetzt diesen Fall nicht', () => {
    const start = spielHtmlInhalt.indexOf('function aktualisiereUntertitel() {');
    const koerper = spielHtmlInhalt.slice(start, start + 400);
    expect(koerper).toMatch(/t\(\s*'fehler\.ladenFehlgeschlagen'/);
  });

  test('Gegeben die bestehenden FEATURE-005/BUGFIX-001-Hinweiselemente, wenn public/spiel.html geprüft wird, dann existieren #verbindungs-hinweis und #tab-inaktiv-hinweis weiterhin unter genau denselben ids (keine Kollision mit dem neuen dynamischen Kopfbereich-Text, Pre-Mortem-Risiko 2)', () => {
    expect(spielHtmlInhalt).toMatch(/id="verbindungs-hinweis"/);
    expect(spielHtmlInhalt).toMatch(/id="tab-inaktiv-hinweis"/);
  });
});
