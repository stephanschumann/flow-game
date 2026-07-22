/**
 * FEATURE-006 – Mehrsprachigkeit (Deutsch/Englisch)
 * Dokumentierte MANUELLE bzw. bewusst noch nicht automatisierbare Testfälle –
 * gleiches Muster wie tests/game-feature-005-manual-checks.test.js: Platzhalter-
 * Assertion statt vorgetäuschter Automatisierung, weil dieses Projekt kein
 * DOM/jsdom einsetzt (siehe package.json) und deshalb echtes UI-Neu-Rendern,
 * Tastaturfokus und Bildschirm-für-Bildschirm-Textwechsel nicht sinnvoll in
 * Jest simuliert werden können.
 *
 * Diese Fälle sind bewusst NICHT als "cannot find module" o. Ä. rot, sondern
 * laufen technisch grün durch – die eigentliche Prüfung erfolgt durch Stephan
 * im echten Browser, analog zum bereits etablierten Vorgehen bei FEATURE-005.
 *
 * NACHTRAG (2026-07-21, echter Live-Test durch Stephan im Browser – genau der
 * Zweck der drei manuellen Fälle oben): Stephan fand dabei ZWEI echte Bugs,
 * die kein bisheriger automatisierter Test abdeckte, weil sie erst bei einem
 * SPÄTEREN Sprachwechsel sichtbar wurden (nicht beim initialen Laden):
 *   1. Der Kicker/Logo-Text ("Spiel-Räume") war in public/spiel.html komplett
 *      hartcodiert, ohne t()-Aufruf und ohne Tabellen-Schlüssel – blieb in
 *      jeder Sprache immer Deutsch.
 *   2. #untertitel und #lobby-rolle-hinweis wurden zwar beim initialen Laden
 *      korrekt übersetzt, aber NICHT erneut, wenn die Sprache später
 *      gewechselt wurde (sie waren kein Teil von
 *      wendeSpracheAufStatischeTexteAn()/wendeSpracheAufSichtbareAnsichtenAn()).
 * Beide Bugs sind jetzt behoben (neuer Schlüssel lobby.kicker; #untertitel
 * über einen gemerkten Modus, #lobby-rolle-hinweis über eine gemerkte "Art"
 * jeweils bei jedem Sprachwechsel neu berechnet). Die Testfälle unten prüfen
 * per Quelltext-Mustersuche (gleiches Vorgehen wie
 * tests/game-form-loading-state.static.test.js), dass die dafür zuständigen
 * Funktionen tatsächlich Verweise auf alle drei Elemente enthalten – damit ein
 * künftig neu hinzugefügtes, aber nicht verdrahtetes Element wieder aktiv
 * auffällt statt nur manuell im Live-Browser entdeckt zu werden.
 */

const fs = require('fs');
const path = require('path');

const { UEBERSETZUNGEN: UEBERSETZUNGEN_NODE } = require('../src/i18n/uebersetzungen');

const SPIEL_HTML_PFAD = path.join(__dirname, '..', 'public', 'spiel.html');
const spielHtmlInhalt = fs.readFileSync(SPIEL_HTML_PFAD, 'utf8');

function schneide(startAnker, endAnker) {
  const start = spielHtmlInhalt.indexOf(startAnker);
  expect(start).toBeGreaterThan(-1); // die bekannte Anker-Stelle muss weiterhin existieren
  const ende = spielHtmlInhalt.indexOf(endAnker, start);
  expect(ende).toBeGreaterThan(start); // End-Anker muss nach Start-Anker gefunden werden
  return spielHtmlInhalt.slice(start, ende);
}

function wendeSpracheAufStatischeTexteAnKoerper() {
  return schneide('function wendeSpracheAufStatischeTexteAn() {', 'function setText(id, text) {');
}

function wendeSpracheAufSichtbareAnsichtenAnKoerper() {
  return schneide('function wendeSpracheAufSichtbareAnsichtenAn() {', 'function zeigeFehler(nachricht) {');
}

describe('Regressionsschutz (2026-07-21): jedes bei Sprachwechsel sichtbare Element bleibt tatsächlich an eine Neu-Übersetzungsfunktion angebunden', () => {
  test('Bugfix 1 – Kicker/Logo: wendeSpracheAufStatischeTexteAn() setzt #spiel-kicker über den neuen Übersetzungsschlüssel lobby.kicker (statt weiterhin hartcodiert zu bleiben)', () => {
    expect(spielHtmlInhalt).toMatch(/<div class="logo" id="spiel-kicker">/);
    const koerper = wendeSpracheAufStatischeTexteAnKoerper();
    expect(koerper).toMatch(/setText\(\s*'spiel-kicker'\s*,\s*t\(\s*'lobby\.kicker'\s*\)\s*\)/);
  });

  test('Der neue Schlüssel lobby.kicker existiert in BEIDEN Kopien der Übersetzungstabelle mit nicht-leerem Deutsch UND Englisch', () => {
    expect(UEBERSETZUNGEN_NODE['lobby.kicker']).toBeDefined();
    expect(UEBERSETZUNGEN_NODE['lobby.kicker'].de.trim().length).toBeGreaterThan(0);
    expect(UEBERSETZUNGEN_NODE['lobby.kicker'].en.trim().length).toBeGreaterThan(0);

    const browserUebersetzungenPfad = path.join(__dirname, '..', 'public', 'js', 'i18n', 'uebersetzungen.js');
    const browserInhalt = fs.readFileSync(browserUebersetzungenPfad, 'utf8');
    expect(browserInhalt).toMatch(/'lobby\.kicker':\s*\{\s*de:\s*'[^']+',\s*en:\s*'[^']+'/);
  });

  test('Bugfix 2a – #untertitel: wendeSpracheAufStatischeTexteAn() ruft aktualisiereUntertitel() auf, statt das Element nur beim initialen Laden einmalig zu setzen', () => {
    const koerper = wendeSpracheAufStatischeTexteAnKoerper();
    expect(koerper).toMatch(/aktualisiereUntertitel\(\)/);

    // aktualisiereUntertitel() selbst muss BEIDE wiederverwendeten Bedeutungen
    // von #untertitel abdecken (Tagline vor Spielbeginn UND Ladefehler-Text),
    // nicht nur immer auf die Tagline zurückfallen.
    const start = spielHtmlInhalt.indexOf('function aktualisiereUntertitel()');
    expect(start).toBeGreaterThan(-1);
    const funktionsKoerper = spielHtmlInhalt.slice(start, start + 400);
    expect(funktionsKoerper).toMatch(/t\(\s*'lobby\.untertitel'\s*\)/);
    expect(funktionsKoerper).toMatch(/t\(\s*'fehler\.ladenFehlgeschlagen'/);
  });

  test('Bugfix 2b – #lobby-rolle-hinweis: wendeSpracheAufSichtbareAnsichtenAn() berechnet den Text bei jedem Sprachwechsel über t() neu, statt den einmalig übergebenen String stehen zu lassen', () => {
    const koerper = wendeSpracheAufSichtbareAnsichtenAnKoerper();
    expect(koerper).toMatch(/lobbyRolleHinweis\.textContent\s*=\s*berechneLobbyRolleHinweisText\(\)/);

    // berechneLobbyRolleHinweisText() muss weiterhin alle drei ursprünglichen
    // Text-Varianten (Host-Rejoin, Host-Neuerstellung, Spielende/Beobachtende)
    // über t() neu berechnen, nicht nur eine davon.
    const start = spielHtmlInhalt.indexOf('function berechneLobbyRolleHinweisText()');
    expect(start).toBeGreaterThan(-1);
    const funktionsKoerper = spielHtmlInhalt.slice(start, start + 700);
    expect(funktionsKoerper).toMatch(/t\(\s*'lobby\.duBistHostSchlicht'\s*\)/);
    expect(funktionsKoerper).toMatch(/t\(\s*'lobby\.duBistHostMitTeilen'\s*\)/);
    expect(funktionsKoerper).toMatch(/t\(\s*'lobby\.duBistRolleInSpiel'/);
  });

  test('zeigeLobby() reicht nur noch die ART des Hinweises durch (nicht mehr einen bereits fertig übersetzten String), damit spätere Sprachwechsel ihn neu berechnen können', () => {
    expect(spielHtmlInhalt).toMatch(/function zeigeLobby\(db, code, rolleHinweisArt, rolle\)/);
    // Regressionsschutz: keiner der vier bekannten Aufrufe darf wieder einen
    // fertig übersetzten t(...)-Aufruf direkt als drittes Argument bekommen.
    expect(spielHtmlInhalt).not.toMatch(/zeigeLobby\([^)]*t\(\s*'lobby\.duBistHostSchlicht'/);
    expect(spielHtmlInhalt).not.toMatch(/zeigeLobby\([^)]*t\(\s*'lobby\.duBistHostMitTeilen'/);
  });
});

describe('FEATURE-006: Manuelle/Live-Prüfungen (kein automatisierter Jest-Test möglich)', () => {
  test('Szenario: Sofortiger Sprachwechsel ohne Seiten-Neuladen und ohne Verlust von Tastaturfokus/UI-Zustand (AK 2, Pre-Mortem-Risiko 5)', () => {
    // Given: Eine Person befindet sich mitten in einer Interaktion (z. B.
    // Fokus auf einem Eingabefeld in Runde 4, oder die "Fokus + Warteschlange"-
    // Ansicht aus FEATURE-004 ist gerade geöffnet).
    // When: Sie wechselt die Sprache (Host) bzw. die vom Host vorgegebene
    // Sprache wechselt für alle gemeinsam (AK 9).
    // Then: Alle sichtbaren Texte wechseln sofort, OHNE dass die Seite neu
    // lädt, der Tastaturfokus springt oder clientseitiger UI-Zustand
    // zurückgesetzt wird.
    //
    // Nicht automatisierbar: kein DOM/jsdom im Projekt (siehe package.json),
    // echtes Re-Rendering/Fokus-Verhalten lässt sich damit nicht sinnvoll
    // simulieren. Durchzuführen von Stephan im Live-Browser, sobald die
    // Übersetzungstabelle + der Sprachumschalter existieren.
    expect(true).toBe(true); // Platzhalter — echte Prüfung erfolgt manuell, siehe Kommentar oben.
  });

  test('Szenario: Nach einem Sprachwechsel ist auf keinem Bildschirm ein Mix aus deutschen und englischen Texten sichtbar (AK 4)', () => {
    // Given: Jede der laut AK 3 betroffenen Ansichten (Startseite, Beitritts-/
    // Erstellungsformular, Lobby, Spielbrett aller vier Runden, Kennzahlen-/
    // Auswertungsansicht, Fehlermeldungen).
    // When: Die Sprache gewechselt wird, während genau dieser Bildschirm
    // sichtbar ist.
    // Then: Kein einzelner Text bleibt in der vorherigen Sprache stehen.
    //
    // Nicht automatisierbar ohne DOM/jsdom – die zentrale Übersetzungstabelle
    // (tests/game-i18n.logic.test.js, "Vollständigkeits-Test") stellt sicher,
    // dass für jeden VERWENDETEN Schlüssel beide Sprachen existieren, prüft
    // aber nicht, ob tatsächlich jede sichtbare Bildschirm-Stelle auch einen
    // Schlüssel statt eines hart codierten Strings verwendet. Durchzuführen
    // von Stephan Bildschirm für Bildschirm im Live-Browser.
    expect(true).toBe(true); // Platzhalter — echte Prüfung erfolgt manuell, siehe Kommentar oben.
  });

  test('Szenario: aria-labels bleiben nach einem Sprachwechsel inhaltlich konsistent mit dem sichtbaren Text (Pre-Mortem-Risiko 6, Bezug FEATURE-005)', () => {
    // Given: Die in FEATURE-005 eingeführten aria-labels (z. B. Kartenposition,
    // Stapel-/Tor-Status).
    // When: Die Sprache gewechselt wird.
    // Then: aria-label und sichtbarer Text stimmen weiterhin inhaltlich
    // überein, in BEIDEN Sprachen – kein aria-label bleibt in der jeweils
    // anderen Sprache stehen, während der sichtbare Text schon gewechselt hat.
    //
    // Nicht automatisierbar ohne DOM/jsdom bzw. Screenreader-Testwerkzeug.
    // Durchzuführen von Stephan im Live-Browser, idealerweise mit demselben
    // Vorgehen wie beim FEATURE-005-Screenreader-Check.
    expect(true).toBe(true); // Platzhalter — echte Prüfung erfolgt manuell, siehe Kommentar oben.
  });
});
