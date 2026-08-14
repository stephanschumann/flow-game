/**
 * TASK-005 – Lean-Fachbegriffe (Lead Time, Cycle Time, Individual Cycle
 * Time) durchgängig auch in deutschen UND englischen UI-Texten verwenden.
 * BDD-Tests (flow-game-bdd, 2026-08-14) für die am 2026-08-14 freigegebene
 * Analyse-Spec in Backlog.md ("### TASK-005"), Akzeptanzkriterien 1-3, 5-9
 * (AK4 ist durch Stephans Entscheidung vom 2026-08-14 überholt: statt
 * unverändert zu bleiben, wird "Beteiligungsspanne" zu "Individual Cycle
 * Time" umbenannt - siehe "Update nach Stephans Entscheidung" im Ticket).
 *
 * Betroffene Schlüssel (Fundstellen-Sweep der Spec):
 *   - spielbrett.durchlaufzeit      (de: "Lead Time",  en: "Lead Time")
 *   - spielbrett.bearbeitungszeit   (de: "Cycle Time", en: "Cycle Time")
 *   - kennzahlen.beteiligungsspanne (de: "Individual Cycle Time",
 *                                    en: "Individual Cycle Time")
 * je einmal in src/i18n/uebersetzungen.js (Node-Referenz) und einmal in
 * public/js/i18n/uebersetzungen.js (Browser-Kopie, Projekt-Konvention: kein
 * Bundler, beide Dateien müssen synchron gehalten werden - Pre-Mortem-
 * Risiko 1 der Spec).
 *
 * Framework: Jest + Node "fs"/require() (kein DOM/jsdom im Projekt, siehe
 * package.json). Die Node-Kopie wird strukturiert per require() geprüft,
 * die Browser-Kopie NUR als Text durchsucht (kann nicht per require()
 * geladen werden - schließt mit `})(window);`, kein module.exports),
 * gleiches etabliertes Muster wie tests/game-startseite-erklaerung.static.test.js
 * und tests/game-bugfix-006-sprachreine-anzeige.static.test.js.
 *
 * WICHTIG - bewusst ROT beim ersten Lauf: Die drei Schlüssel tragen zum
 * Zeitpunkt des Schreibens dieser Tests noch die alten Werte
 * ("Durchlaufzeit"/"Lead time", "Bearbeitungszeit"/"Processing time",
 * "Beteiligungsspanne"/"participation span"). Das ist der gewünschte
 * "Red"-Zustand vor flow-game-impl.
 */

const fs = require('fs');
const path = require('path');

const { UEBERSETZUNGEN: UEBERSETZUNGEN_NODE, uebersetze } = require('../src/i18n/uebersetzungen');

const SPIEL_HTML_PFAD = path.join(__dirname, '..', 'public', 'spiel.html');
const INDEX_HTML_PFAD = path.join(__dirname, '..', 'public', 'index.html');
const BROWSER_UEBERSETZUNGEN_PFAD = path.join(__dirname, '..', 'public', 'js', 'i18n', 'uebersetzungen.js');
const SRC_UEBERSETZUNGEN_PFAD = path.join(__dirname, '..', 'src', 'i18n', 'uebersetzungen.js');

const spielHtmlInhalt = fs.readFileSync(SPIEL_HTML_PFAD, 'utf8');
const indexHtmlInhalt = fs.readFileSync(INDEX_HTML_PFAD, 'utf8');
const browserUebersetzungenInhalt = fs.readFileSync(BROWSER_UEBERSETZUNGEN_PFAD, 'utf8');
const srcUebersetzungenInhalt = fs.readFileSync(SRC_UEBERSETZUNGEN_PFAD, 'utf8');

// ---------------------------------------------------------------------------
// Hilfsfunktion: extrahiert den { de: '...', en: '...' }-Wert für einen
// Schlüssel direkt aus dem TEXT einer Übersetzungsdatei (für die Browser-
// Kopie, die nicht per require() geladen werden kann).
// ---------------------------------------------------------------------------
function extrahiereEintragAusText(dateiInhalt, schluessel) {
  const muster = new RegExp(
    `'${schluessel.replace(/\./g, '\\.')}':\\s*\\{\\s*de:\\s*'([^']*)',\\s*en:\\s*'([^']*)'`
  );
  const treffer = dateiInhalt.match(muster);
  expect(treffer).not.toBeNull(); // der Schlüssel muss in der Datei vorkommen
  return { de: treffer[1], en: treffer[2] };
}

// ---------------------------------------------------------------------------
// AK 1 - Laufende Rundenanzeige (Deutsch): "Lead Time" / "Cycle Time".
// ---------------------------------------------------------------------------
describe('AK 1: Laufende Rundenanzeige zeigt bei aktiver deutscher Sprache "Lead Time"/"Cycle Time"', () => {
  test('Szenario: Gegeben aktive deutsche Sprache und eine laufende Runde, wenn das Spielbrett gerendert wird, dann zeigt das Durchlaufzeit-Label "Lead Time" und das Bearbeitungszeit-Label "Cycle Time" (Node-Referenz)', () => {
    expect(UEBERSETZUNGEN_NODE['spielbrett.durchlaufzeit'].de).toBe('Lead Time');
    expect(UEBERSETZUNGEN_NODE['spielbrett.bearbeitungszeit'].de).toBe('Cycle Time');
  });

  test('Szenario: Gegeben dieselbe Bedingung, wenn public/spiel.html an der laufenden Rundenanzeige (Zeile ~715-716) durchsucht wird, dann liest sie den Text weiterhin über denselben Übersetzungsschlüssel (spielbrett.durchlaufzeit/spielbrett.bearbeitungszeit), nicht über einen hartcodierten Text - Voraussetzung dafür, dass der geänderte Wörterbuchwert hier automatisch ankommt', () => {
    expect(spielHtmlInhalt).toMatch(/setText\('label-durchlaufzeit',\s*t\('spielbrett\.durchlaufzeit'\)\)/);
    expect(spielHtmlInhalt).toMatch(/setText\('label-bearbeitungszeit',\s*t\('spielbrett\.bearbeitungszeit'\)\)/);
  });
});

// ---------------------------------------------------------------------------
// AK 2 - Kennzahlen-Übersicht am Rundenende (Deutsch).
// ---------------------------------------------------------------------------
describe('AK 2: Kennzahlen-Übersicht am Rundenende zeigt bei aktiver deutscher Sprache dieselben neuen Bezeichnungen', () => {
  test('Szenario: Gegeben eine beendete Runde, wenn die Kennzahlen-Liste gerendert wird, dann erscheinen "Lead Time"/"Cycle Time" statt der bisherigen deutschen Begriffe (Node-Referenz, derselbe Schlüssel wie AK 1 - Wert bereits durch AK 1 geprüft, hier nur die Wiederverwendung an dieser zweiten Anzeigestelle)', () => {
    // Zeile ~2765-2766: [t('spielbrett.durchlaufzeit'), runde.durchlaufzeit], [t('spielbrett.bearbeitungszeit'), runde.bearbeitungszeit],
    expect(spielHtmlInhalt).toMatch(/\[t\('spielbrett\.durchlaufzeit'\),\s*runde\.durchlaufzeit\]/);
    expect(spielHtmlInhalt).toMatch(/\[t\('spielbrett\.bearbeitungszeit'\),\s*runde\.bearbeitungszeit\]/);
    expect(UEBERSETZUNGEN_NODE['spielbrett.durchlaufzeit'].de).toBe('Lead Time');
    expect(UEBERSETZUNGEN_NODE['spielbrett.bearbeitungszeit'].de).toBe('Cycle Time');
  });
});

// ---------------------------------------------------------------------------
// AK 3 - Rundenübergreifende Vergleichstabelle (Deutsch).
// ---------------------------------------------------------------------------
describe('AK 3: Rundenübergreifende Vergleichstabelle zeigt bei aktiver deutscher Sprache dieselben neuen Bezeichnungen', () => {
  test('Szenario: Gegeben mindestens eine ausgewertete Runde, wenn die Vergleichstabelle gerendert wird, dann erscheinen "Lead Time"/"Cycle Time" (Node-Referenz, Wiederverwendung desselben Schlüssels an der dritten Anzeigestelle)', () => {
    // Zeile ~2628-2629: zeile(t('spielbrett.durchlaufzeit'), ...), zeile(t('spielbrett.bearbeitungszeit'), ...)
    expect(spielHtmlInhalt).toMatch(/zeile\(t\('spielbrett\.durchlaufzeit'\),/);
    expect(spielHtmlInhalt).toMatch(/zeile\(t\('spielbrett\.bearbeitungszeit'\),/);
    expect(UEBERSETZUNGEN_NODE['spielbrett.durchlaufzeit'].de).toBe('Lead Time');
    expect(UEBERSETZUNGEN_NODE['spielbrett.bearbeitungszeit'].de).toBe('Cycle Time');
  });
});

// ---------------------------------------------------------------------------
// AK 8 (ersetzt AK 4) - Beteiligungsspanne -> "Individual Cycle Time",
// Deutsch UND Englisch, an beiden tatsächlichen Anzeigeorten (Vergleichs-
// tabelle pro Station Zeile ~2640, Kennzahlen-Liste pro Station Zeile
// ~2866 - es gibt in der aktuellen Codebasis keine dritte Anzeigestelle für
// diese Kennzahl während der laufenden Runde).
// ---------------------------------------------------------------------------
describe('AK 8: "Beteiligungsspanne"/"participation span" wird zu "Individual Cycle Time" umbenannt (Deutsch UND Englisch, dieselbe Bezeichnung)', () => {
  test('Szenario: Gegeben die zentrale Übersetzungstabelle, wenn kennzahlen.beteiligungsspanne auf Deutsch UND Englisch gelesen wird, dann liefert sie in beiden Sprachen "Individual Cycle Time" (Node-Referenz)', () => {
    expect(UEBERSETZUNGEN_NODE['kennzahlen.beteiligungsspanne'].de).toBe('Individual Cycle Time');
    expect(UEBERSETZUNGEN_NODE['kennzahlen.beteiligungsspanne'].en).toBe('Individual Cycle Time');
  });

  test('Szenario: Gegeben die Vergleichstabelle (pro-Station-Zeile ~2640) und die Kennzahlen-Liste (pro-Station-Zeile ~2866), wenn public/spiel.html durchsucht wird, dann verwenden beide Stellen weiterhin denselben Schlüssel kennzahlen.beteiligungsspanne - Voraussetzung dafür, dass die neue Bezeichnung an beiden Orten automatisch ankommt', () => {
    expect(spielHtmlInhalt).toMatch(/t\('kennzahlen\.beteiligungsspanne'\)/);
    const vorkommen = spielHtmlInhalt.match(/t\('kennzahlen\.beteiligungsspanne'\)/g) || [];
    expect(vorkommen.length).toBeGreaterThanOrEqual(2);
  });

  test('Negativ-Szenario: Gegeben dieselbe Tabelle, wenn der alte deutsche Wert "Beteiligungsspanne" bzw. der alte englische Wert "participation span" als Wörterbuchwert für kennzahlen.beteiligungsspanne gesucht wird, dann taucht er dort NICHT mehr auf (Node-Referenz)', () => {
    expect(UEBERSETZUNGEN_NODE['kennzahlen.beteiligungsspanne'].de).not.toBe('Beteiligungsspanne');
    expect(UEBERSETZUNGEN_NODE['kennzahlen.beteiligungsspanne'].en).not.toBe('participation span');
  });
});

// ---------------------------------------------------------------------------
// AK 5 - Kein neuer "Throughput"/"Durchsatz"-Text irgendwo im Spiel.
// ---------------------------------------------------------------------------
describe('AK 5: Kein neuer "Throughput"/"Durchsatz"-Text erscheint irgendwo im Spiel', () => {
  test('Szenario: Gegeben die gesamte Übersetzungstabelle (beide Dateien) und die HTML-Dateien, wenn nach "Throughput"/"Durchsatz" gesucht wird, dann existiert weiterhin kein solcher Text (case-insensitiv)', () => {
    const durchsuchteInhalte = [
      { name: 'src/i18n/uebersetzungen.js', inhalt: srcUebersetzungenInhalt },
      { name: 'public/js/i18n/uebersetzungen.js', inhalt: browserUebersetzungenInhalt },
      { name: 'public/spiel.html', inhalt: spielHtmlInhalt },
      { name: 'public/index.html', inhalt: indexHtmlInhalt },
    ];
    durchsuchteInhalte.forEach(({ name, inhalt }) => {
      expect(inhalt).not.toMatch(/throughput/i);
      expect(inhalt).not.toMatch(/durchsatz/i);
    });
  });
});

// ---------------------------------------------------------------------------
// AK 6 - Sprachwechsel hin und zurück: keine Regression des Sprachwechsel-
// Mechanismus aus FEATURE-006 (die Werte kommen bei jedem Aufruf frisch aus
// dem Wörterbuch, kein Caching/Stale-Zustand).
// ---------------------------------------------------------------------------
describe('AK 6: Wechselt man während einer laufenden Runde die Sprache hin und zurück, zeigt die deutsche Ansicht danach weiterhin "Lead Time"/"Cycle Time"', () => {
  test('Szenario: Gegeben eine laufende Runde auf Deutsch, wenn die Sprache zu Englisch und zurück zu Deutsch gewechselt wird, dann liefert uebersetze() für die deutsche Ansicht danach weiterhin "Lead Time"/"Cycle Time" (kein Caching des vorherigen Werts)', () => {
    const deVorher = uebersetze('spielbrett.durchlaufzeit', 'de');
    const en = uebersetze('spielbrett.durchlaufzeit', 'en');
    const deNachher = uebersetze('spielbrett.durchlaufzeit', 'de');
    expect(deVorher).toBe('Lead Time');
    expect(en).toBe('Lead Time');
    expect(deNachher).toBe('Lead Time');
    expect(deNachher).toBe(deVorher);

    const bzDeVorher = uebersetze('spielbrett.bearbeitungszeit', 'de');
    uebersetze('spielbrett.bearbeitungszeit', 'en');
    const bzDeNachher = uebersetze('spielbrett.bearbeitungszeit', 'de');
    expect(bzDeVorher).toBe('Cycle Time');
    expect(bzDeNachher).toBe('Cycle Time');
  });
});

// ---------------------------------------------------------------------------
// AK 7 + AK 9 - Englische Sprachversion zeigt "Lead Time"/"Cycle Time"
// (Titelschreibung) statt "Lead time"/"Processing time". Gilt laut AK 9
// unbedingt (Stephans Entscheidung 2026-08-14), nicht mehr nur konditional.
// ---------------------------------------------------------------------------
describe('AK 7/AK 9: Bei aktiver englischer Sprache zeigt dieselbe Anzeige "Lead Time"/"Cycle Time" statt "Lead time"/"Processing time"', () => {
  test('Szenario: Gegeben aktive englische Sprache, wenn dieselben drei Ansichten gerendert werden, dann zeigen sie "Lead Time" (großes T) statt "Lead time" und "Cycle Time" statt "Processing time" (Node-Referenz)', () => {
    expect(UEBERSETZUNGEN_NODE['spielbrett.durchlaufzeit'].en).toBe('Lead Time');
    expect(UEBERSETZUNGEN_NODE['spielbrett.bearbeitungszeit'].en).toBe('Cycle Time');
  });

  test('Negativ-Szenario: Gegeben dieselbe Übersetzungstabelle, wenn nach den alten englischen Werten "Lead time" (kleines t) und "Processing time" gesucht wird, dann sind sie als Wert der beiden Schlüssel nicht mehr vorhanden', () => {
    expect(UEBERSETZUNGEN_NODE['spielbrett.durchlaufzeit'].en).not.toBe('Lead time');
    expect(UEBERSETZUNGEN_NODE['spielbrett.bearbeitungszeit'].en).not.toBe('Processing time');
  });
});

// ---------------------------------------------------------------------------
// Regressionsschutz: die unmittelbar benachbarte, NICHT betroffene
// Kennzahl spielbrett.durchlaufzeitNeutralerHinweis ("läuft …"/"running …")
// bleibt unverändert (Pre-Mortem-Risiko 4/5: Implementierung soll sich an
// die verifizierte Fundstellenliste halten, nicht versehentlich
// Nachbarzeilen mitändern).
// ---------------------------------------------------------------------------
describe('Regressionsschutz: benachbarter, nicht betroffener Schlüssel spielbrett.durchlaufzeitNeutralerHinweis bleibt unverändert', () => {
  test('Szenario: Gegeben die Übersetzungstabelle, wenn spielbrett.durchlaufzeitNeutralerHinweis gelesen wird, dann liefert sie weiterhin "läuft …" (de) und "running …" (en) - unverändert von diesem Ticket', () => {
    expect(UEBERSETZUNGEN_NODE['spielbrett.durchlaufzeitNeutralerHinweis'].de).toBe('läuft …');
    expect(UEBERSETZUNGEN_NODE['spielbrett.durchlaufzeitNeutralerHinweis'].en).toBe('running …');
  });
});

// ---------------------------------------------------------------------------
// Neuer Regressionstest (Node/Browser-Parität, Pre-Mortem-Risiko 1):
// beide Kopien der Übersetzungstabelle müssen für alle drei betroffenen
// Schlüssel identische de-/en-Werte tragen - sonst zeigt der Browser-
// Produktivstand einen anderen Text als die Node-Testreferenz (bereits
// einmal bei BUGFIX-011 unbemerkt aufgetreten).
// ---------------------------------------------------------------------------
describe('Node/Browser-Paritätstest: beide Übersetzungsdateien tragen für die drei betroffenen Schlüssel identische Werte', () => {
  const BETROFFENE_SCHLUESSEL = [
    'spielbrett.durchlaufzeit',
    'spielbrett.bearbeitungszeit',
    'kennzahlen.beteiligungsspanne',
  ];

  BETROFFENE_SCHLUESSEL.forEach((schluessel) => {
    test(`Szenario: Gegeben beide Kopien der Übersetzungstabelle, wenn die Werte für ${schluessel} verglichen werden, dann sind de- und en-Werte in src/i18n/uebersetzungen.js und public/js/i18n/uebersetzungen.js identisch`, () => {
      const nodeEintrag = UEBERSETZUNGEN_NODE[schluessel];
      const browserEintrag = extrahiereEintragAusText(browserUebersetzungenInhalt, schluessel);
      expect(browserEintrag.de).toBe(nodeEintrag.de);
      expect(browserEintrag.en).toBe(nodeEintrag.en);
    });
  });
});
