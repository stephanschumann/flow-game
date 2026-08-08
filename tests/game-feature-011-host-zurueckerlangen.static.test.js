/**
 * FEATURE-011 – Gastgeber-Rolle zurückerlangen können.
 * Statische Text-/Quelltext-Tests (kein DOM/jsdom im Projekt, siehe
 * package.json) für die freigegebene Spec in Backlog.md ("### FEATURE-011"),
 * Akzeptanzkriterien 5, 6, 7, 11 sowie die UI/UX-Entscheidung (Stephan,
 * 2026-08-08): Variante 2 – ausklappbarer Bereich innerhalb der bestehenden
 * Host-Lobby-Ansicht.
 *
 * NAMENSGEBUNG (eigene, begründete Festlegung für die BDD-Phase, analog zum
 * Vorgehen bei FEATURE-007/FEATURE-018 – Ticket/Spec legen den Wortlaut/die
 * Akzeptanzkriterien fest, nicht die konkreten Element-IDs/Schlüsselnamen):
 *   - Neuer, ausklappbarer Bereich in der Host-Lobby:
 *     id="host-zurueckerlangen-bereich" (enthält sowohl das Formular zur
 *     manuellen Zurückeroberung als auch die Kennzeichen-Anzeige).
 *   - Neues Formular zur manuellen Zurückeroberung:
 *     id="form-host-zurueckerlangen" mit Feldern
 *     id="host-zurueckerlangen-code" (Spiel-Code) und
 *     id="host-zurueckerlangen-kennzeichen" (Host-Kennzeichen).
 *   - Anzeige des eigenen Host-Kennzeichens: id="anzeige-host-kennzeichen".
 *   - Kopier-Knopf: id="knopf-host-kennzeichen-kopieren"; Bestätigungstext
 *     nach Klick über i18n-Schlüssel 'lobby.hostKennzeichenKopiertHinweis'.
 *   - Karteileiche-Rückmeldung (AK8, hier NICHT geprüft – siehe
 *     game-feature-011-host-zurueckerlangen.logic.test.js für die Datenlage,
 *     die Text-Anzeige selbst ist reine Implementierungssache): i18n-Schlüssel
 *     'lobby.hostKarteileicheHinweis'.
 *   - Formular-Fehlermeldung: verwendet den bereits bestehenden Schlüssel
 *     'fehler.hostKennungUngueltig' (FEHLERCODE_ZU_SCHLUESSEL.HOST_KENNUNG_UNGUELTIG,
 *     siehe Analyse-Spec, Fundstellen-Sweep) – kein neuer Fehlercode nötig.
 * OFFENER PUNKT FÜR STEPHAN: diese Namensgebung ist eine BDD-Annahme, KEINE
 * von Stephan getroffene Entscheidung. Bei der Implementierung bitte
 * bestätigen oder anders benennen (Tests müssten dann entsprechend angepasst
 * werden) – Regel 3b des flow-game-bdd-Skills wurde dabei bereits beachtet:
 * die Textmuster-Prüfungen unten suchen nach möglichst allgemeinen Marken
 * (Schlüsselnamen, Teil-IDs), nicht nach starrer, exakter Element-Struktur,
 * damit sowohl Inline-Markup als auch eine extrahierte Render-Hilfsfunktion
 * sie erfüllen können.
 *
 * WICHTIG – bewusst RED beim ersten Lauf: keiner der unten geprüften Bausteine
 * (Formular, Anzeige-/Kopierbereich, neue i18n-Schlüssel) existiert heute im
 * Code (siehe Analyse-Spec, Fundstellen-Sweep: "Es gibt keine Stelle im Code,
 * die dieselbe Funktion aus einer manuellen Formular-Eingabe heraus aufruft"
 * bzw. "es gibt aktuell auch keine Kopier-/Clipboard-Funktion im gesamten
 * Projekt").
 *
 * Framework: Jest + Node "fs", Textmuster-Prüfung gegen den echten Quelltext,
 * analog zu tests/game-feature-018-text-und-zaehler.static.test.js.
 */

const fs = require('fs');
const path = require('path');

const { UEBERSETZUNGEN: UEBERSETZUNGEN_NODE } = require('../src/i18n/uebersetzungen');

const SPIEL_HTML_PFAD = path.join(__dirname, '..', 'public', 'spiel.html');
const BROWSER_UEBERSETZUNGEN_PFAD = path.join(__dirname, '..', 'public', 'js', 'i18n', 'uebersetzungen.js');

function lese(p) {
  return fs.readFileSync(p, 'utf8');
}

const NEUE_I18N_SCHLUESSEL = [
  'lobby.hostZurueckerlangenUeberschrift',
  'lobby.hostKennzeichenAnzeigenUeberschrift',
  'lobby.hostKennzeichenKopierenKnopf',
  'lobby.hostKennzeichenKopiertHinweis',
  'lobby.hostKarteileicheHinweis',
];

describe('NEU (AK11, Node/Browser-Sync 4b): alle neuen i18n-Schlüssel existieren identisch in beiden Übersetzungstabellen, jeweils mit Deutsch UND Englisch', () => {
  NEUE_I18N_SCHLUESSEL.forEach((schluessel) => {
    test(`Gegeben der i18n-Schlüssel "${schluessel}" (Node-Kopie), wenn er nachgeschlagen wird, dann existiert er mit nicht-leerem deutschem UND englischem Text`, () => {
      const eintrag = UEBERSETZUNGEN_NODE[schluessel];
      expect(eintrag).toBeDefined();
      expect(typeof eintrag.de).toBe('string');
      expect(eintrag.de.trim().length).toBeGreaterThan(0);
      expect(typeof eintrag.en).toBe('string');
      expect(eintrag.en.trim().length).toBeGreaterThan(0);
    });

    test(`Gegeben der i18n-Schlüssel "${schluessel}" (Browser-Kopie public/js/i18n/uebersetzungen.js), wenn der Quelltext danach durchsucht wird, dann taucht derselbe Schlüssel auch dort auf (Doppelpflege-Risiko)`, () => {
      const inhalt = lese(BROWSER_UEBERSETZUNGEN_PFAD);
      expect(inhalt).toContain(`'${schluessel}'`);
    });
  });
});

describe('NEU (AK1/AK2, Scope "manuelles Formular"): ein Formular zur manuellen Zurückeroberung (Code + Host-Kennzeichen) existiert im Quelltext', () => {
  test('Gegeben public/spiel.html, wenn nach einem Formular-Element im Umfeld des Begriffs "zurückerlangen"/"zurueckerlangen" gesucht wird, dann findet sich dort sowohl ein Eingabefeld für den Spiel-Code als auch ein Eingabefeld für das Host-Kennzeichen', () => {
    const inhalt = lese(SPIEL_HTML_PFAD);
    const start = inhalt.search(/zurueckerlangen/i);
    expect(start).toBeGreaterThan(-1);
    const ausschnitt = inhalt.slice(Math.max(0, start - 200), start + 1500);
    expect(ausschnitt).toMatch(/<form[^>]*>/i);
    // Zwei separate Eingabefelder erwartet (Code, Kennzeichen) – allgemein
    // genug formuliert (Anzahl der <input>-Elemente statt exakter IDs), damit
    // sowohl Inline-Markup als auch eine extrahierte Render-Funktion, deren
    // Ergebnis ins selbe Markup eingefügt wird, den Test erfüllen.
    const eingabefelder = ausschnitt.match(/<input[^>]*>/gi) || [];
    expect(eingabefelder.length).toBeGreaterThanOrEqual(2);
  });
});

describe('NEU (AK5/AK6/AK7, Scope "Anzeige/Kopiermöglichkeit"): ein Anzeige- und Kopierbereich für das eigene Host-Kennzeichen existiert im Quelltext', () => {
  test('Gegeben public/spiel.html, wenn nach einem Element gesucht wird, das das Host-Kennzeichen anzeigt, dann existiert dort in unmittelbarer Nähe auch ein Kopier-Knopf (AK6) UND der angezeigte Wert bleibt als Text im Markup enthalten, nicht ausschliesslich als unsichtbares Attribut (AK7: Rückfalloption "von Hand markierbar")', () => {
    const inhalt = lese(SPIEL_HTML_PFAD);
    const start = inhalt.search(/host-?kennzeichen|hostkennzeichen|host-?session-?kennung/i);
    expect(start).toBeGreaterThan(-1);
    const ausschnitt = inhalt.slice(Math.max(0, start - 200), start + 1500);
    // "Kopieren"-Bezug (Knopf-Label/ID/aria) im selben Umfeld – allgemein
    // genug, um sowohl ein <button> als auch eine spätere Refactoring-Form
    // (z. B. wiederverwendete .code-display-Kopierlogik) zu erfüllen.
    expect(ausschnitt).toMatch(/kopier/i);
    expect(ausschnitt).toMatch(/<button[^>]*>/i);
  });

  test('Gegeben public/spiel.html, wenn nach dem neuen Kopier-Mechanismus gesucht wird, dann wird dafür navigator.clipboard verwendet (Fundstellen-Sweep der Spec: "es gibt aktuell keine Kopier-/Clipboard-Funktion im gesamten Projekt" – muss also neu hinzukommen)', () => {
    const inhalt = lese(SPIEL_HTML_PFAD);
    expect(inhalt).toMatch(/navigator\.clipboard/);
  });
});

describe('REGRESSION (AK10, Scope-Ausschluss): der bestehende automatische Wiederherstellungspfad über restoreHostSession() bleibt im Quelltext an genau der bisherigen, einzigen Aufrufstelle unverändert bestehen', () => {
  test('Gegeben public/spiel.html, wenn nach Aufrufstellen von restoreHostSession() gesucht wird, dann gibt es davon mindestens weiterhin die bereits bestehende, automatische (also mindestens eine Aufrufstelle bleibt bestehen) – das neue manuelle Formular darf diese nicht ersetzen, nur ergänzen', () => {
    const inhalt = lese(SPIEL_HTML_PFAD);
    const anzahlAufrufe = (inhalt.match(/restoreHostSession\s*\(/g) || []).length;
    expect(anzahlAufrufe).toBeGreaterThanOrEqual(1);
  });
});
