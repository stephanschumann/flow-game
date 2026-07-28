/**
 * FEATURE-007 – Landingpage erklärt Spielzweck, Lernziel und Ablauf nicht.
 * BDD-Tests (flow-game-bdd, 2026-07-28) für die Akzeptanzkriterien AK1-AK10
 * aus der freigegebenen Spec in Backlog.md ("### FEATURE-007"), Layout-
 * Variante 1 (drei gleich gestaltete Panels untereinander), inkl. TASK-006
 * ("Interne Entwicklerhinweise entfernen" - läuft laut Backlog vollständig
 * über AK6 mit, kein eigener Testlauf).
 *
 * HINWEIS ZUR HERKUNFT DIESER DATEI: Die ursprüngliche BDD-Phase für dieses
 * Ticket lief in einer inzwischen beendeten, separaten Sandbox-Session
 * (/tmp/flow-game-bdd-007) und wurde dort NIE ins Repo committet (Projekt-
 * Konvention: Sandbox-Sitzungen pushen nichts). Diese Datei wurde deshalb in
 * flow-game-impl anhand der im Backlog-Ticket dokumentierten Testfall-
 * Spezifikation ("Testfälle (18 insgesamt...)") und Namenskonvention
 * (Abschnitt "BDD-Testergebnis") neu erstellt, bevor Implementierungscode
 * geschrieben wurde - dieselbe Rot/Grün-Disziplin wie ein regulärer
 * flow-game-bdd-Durchlauf, nur zeitlich direkt vor flow-game-impl statt in
 * einer eigenen vorgelagerten Sitzung.
 *
 * NAMENSGEBUNG (aus dem Backlog-Ticket übernommen, nicht selbst festgelegt):
 *   - i18n-Schlüsselpaare: startseite.zweckUeberschrift/zweckText,
 *     startseite.spieleranzahlUeberschrift/spieleranzahlText,
 *     startseite.ablaufUeberschrift/ablaufText
 *   - Element-IDs: #label-panel-zweck-titel/-text,
 *     #label-panel-spieleranzahl-titel/-text, #label-panel-ablauf-titel/-text
 *     (ersetzen das bisherige einzelne #label-hinweis-panel)
 *
 * Fundstellen-Sweep der Analyse-Spec (Backlog.md) belegt: die alten
 * Platzhalterformulierungen ("Agent Contract", "Phase 0", "next phases"/
 * "nächsten Phasen", "Basic setup live"/"Grundgerüst live") kommen im
 * gesamten Repo ausschließlich an genau 6 Stellen vor - den beiden
 * Text-Slots startseite.tag und startseite.hinweisPanel (je 2 i18n-Kopien +
 * 2 statische Fallback-Stellen im Markup). Beide Text-Slots gelten laut
 * Architekturabschnitt der Spec ("Ersatz der beiden bestehenden
 * Platzhalter-Elemente") als von diesem Ticket ersetzt.
 *
 * Framework: Jest + Node "fs" (kein DOM/jsdom im Projekt - siehe
 * package.json devDependencies), Textmuster-Prüfung gegen den echten
 * Quelltext, analog zu tests/game-lobby-und-rundenkontext.static.test.js /
 * tests/game-a11y-static.test.js. Die Browser-Kopie
 * public/js/i18n/uebersetzungen.js kann NICHT per require() geladen werden
 * (schließt mit `})(window);`, kein module.exports, kein jsdom vorhanden) -
 * deshalb wird sie wie im etablierten Muster nur als Text durchsucht,
 * während die Node-Kopie src/i18n/uebersetzungen.js per require() strukturiert
 * geprüft wird.
 *
 * WICHTIG - bewusst RED beim ersten Lauf: Die drei neuen Panels/Schlüssel
 * existieren im unveränderten Code noch nicht, die alten Platzhaltertexte
 * existieren noch. Erwartet laut Backlog-Dokumentation: 15 rot / 3 grün von
 * 18 Testfällen.
 */

const fs = require('fs');
const path = require('path');

const { UEBERSETZUNGEN: UEBERSETZUNGEN_NODE } = require('../src/i18n/uebersetzungen');

const INDEX_HTML_PFAD = path.join(__dirname, '..', 'public', 'index.html');
const BROWSER_UEBERSETZUNGEN_PFAD = path.join(__dirname, '..', 'public', 'js', 'i18n', 'uebersetzungen.js');
const SRC_UEBERSETZUNGEN_PFAD = path.join(__dirname, '..', 'src', 'i18n', 'uebersetzungen.js');

function leseIndexHtml() {
  return fs.readFileSync(INDEX_HTML_PFAD, 'utf8');
}

function leseBrowserUebersetzungen() {
  return fs.readFileSync(BROWSER_UEBERSETZUNGEN_PFAD, 'utf8');
}

function leseSrcUebersetzungenAlsText() {
  return fs.readFileSync(SRC_UEBERSETZUNGEN_PFAD, 'utf8');
}

// Die alten, laut Fundstellen-Sweep ausschliesslich in den zwei Text-Slots
// startseite.tag/startseite.hinweisPanel vorkommenden Entwicklerhinweis-
// Formulierungen - müssen nach der Umsetzung vollständig verschwunden sein.
const ALTE_PLATZHALTER_FORMULIERUNGEN = [
  'Agent Contract',
  'Phase 0',
  'next phases',
  'nächsten Phasen',
  'Basic setup live',
  'Grundgerüst live',
];

function wendeSpracheAnKoerper(indexHtmlInhalt) {
  const start = indexHtmlInhalt.indexOf('function wendeSpracheAn() {');
  expect(start).toBeGreaterThan(-1); // die bekannte Funktion muss weiterhin existieren
  const ende = indexHtmlInhalt.indexOf('sprachAuswahl.addEventListener', start);
  expect(ende).toBeGreaterThan(start);
  return indexHtmlInhalt.slice(start, ende);
}

function erwarteSchluesselInBeidenKopien(schluessel) {
  expect(UEBERSETZUNGEN_NODE[schluessel]).toBeDefined();
  expect(UEBERSETZUNGEN_NODE[schluessel].de.trim().length).toBeGreaterThan(0);
  expect(UEBERSETZUNGEN_NODE[schluessel].en.trim().length).toBeGreaterThan(0);
  const browserInhalt = leseBrowserUebersetzungen();
  expect(browserInhalt).toMatch(new RegExp(`'${schluessel.replace(/\./g, '\\.')}':\\s*\\{`));
}

// ---------------------------------------------------------------------------
// Szenario 1: Alte interne Entwicklerhinweise sind vollständig verschwunden
// (AK6, schließt TASK-006 ein) - 3 Testfälle
// ---------------------------------------------------------------------------
describe('Szenario: Alte interne Entwicklerhinweise sind vollständig verschwunden (AK6, TASK-006)', () => {
  test('Gegeben der bisher sichtbare Entwicklerhinweis, wenn public/index.html auf die alten Platzhalter-Formulierungen durchsucht wird, dann taucht keine davon mehr auf', () => {
    const inhalt = leseIndexHtml();
    for (const formulierung of ALTE_PLATZHALTER_FORMULIERUNGEN) {
      expect(inhalt).not.toContain(formulierung);
    }
  });

  test('Gegeben dieselben alten Platzhalter-Formulierungen, wenn beide i18n-Dateien durchsucht werden, dann taucht keine davon mehr in einer der beiden Kopien auf', () => {
    const srcInhalt = leseSrcUebersetzungenAlsText();
    const browserInhalt = leseBrowserUebersetzungen();
    for (const formulierung of ALTE_PLATZHALTER_FORMULIERUNGEN) {
      expect(srcInhalt).not.toContain(formulierung);
      expect(browserInhalt).not.toContain(formulierung);
    }
  });

  test('Gegeben das bisherige einzelne Hinweis-Panel, wenn public/index.html auf #label-hinweis-panel in seiner alten Form geprüft wird, dann existiert dieses Element nicht mehr', () => {
    const inhalt = leseIndexHtml();
    expect(inhalt).not.toMatch(/id="label-hinweis-panel"/);
    expect(UEBERSETZUNGEN_NODE['startseite.hinweisPanel']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Szenario 2: Panel Zweck/Lernziel/Theorie (AK1, AK2, AK3, AK8, AK9)
// - 3 Testfälle
// ---------------------------------------------------------------------------
describe('Szenario: Panel Zweck/Lernziel/Theorie (AK1, AK2, AK3, AK8, AK9)', () => {
  test('Gegeben die Landingpage, wenn public/index.html auf die neuen Zweck-Panel-Elemente geprüft wird, dann existieren #label-panel-zweck-titel und #label-panel-zweck-text', () => {
    const inhalt = leseIndexHtml();
    expect(inhalt).toMatch(/id="label-panel-zweck-titel"/);
    expect(inhalt).toMatch(/id="label-panel-zweck-text"/);
  });

  test('Gegeben wendeSpracheAn(), wenn ihr Funktionskörper geprüft wird, dann setzt sie beide Zweck-Panel-Elemente über echte Übersetzungsschlüssel (nicht hartcodiert)', () => {
    const koerper = wendeSpracheAnKoerper(leseIndexHtml());
    expect(koerper).toMatch(/setText\(\s*'label-panel-zweck-titel'\s*,\s*t\(\s*'startseite\.zweckUeberschrift'\s*\)\s*\)/);
    expect(koerper).toMatch(/setText\(\s*'label-panel-zweck-text'\s*,\s*t\(\s*'startseite\.zweckText'\s*\)\s*\)/);
  });

  test('Gegeben die Schlüssel startseite.zweckUeberschrift und startseite.zweckText, wenn sie geprüft werden, dann sind beide in beiden Sprachen und in beiden i18n-Dateien nicht-leer vorhanden', () => {
    erwarteSchluesselInBeidenKopien('startseite.zweckUeberschrift');
    erwarteSchluesselInBeidenKopien('startseite.zweckText');
  });
});

// ---------------------------------------------------------------------------
// Szenario 3: Panel Spieleranzahl (AK4, AK8, AK9) - 4 Testfälle
// ---------------------------------------------------------------------------
describe('Szenario: Panel Spieleranzahl (AK4, AK8, AK9)', () => {
  test('Gegeben die Landingpage, wenn public/index.html auf die neuen Spieleranzahl-Panel-Elemente geprüft wird, dann existieren #label-panel-spieleranzahl-titel und #label-panel-spieleranzahl-text', () => {
    const inhalt = leseIndexHtml();
    expect(inhalt).toMatch(/id="label-panel-spieleranzahl-titel"/);
    expect(inhalt).toMatch(/id="label-panel-spieleranzahl-text"/);
  });

  test('Gegeben wendeSpracheAn(), wenn ihr Funktionskörper geprüft wird, dann setzt sie beide Spieleranzahl-Panel-Elemente über echte Übersetzungsschlüssel (nicht hartcodiert)', () => {
    const koerper = wendeSpracheAnKoerper(leseIndexHtml());
    expect(koerper).toMatch(/setText\(\s*'label-panel-spieleranzahl-titel'\s*,\s*t\(\s*'startseite\.spieleranzahlUeberschrift'\s*\)\s*\)/);
    expect(koerper).toMatch(/setText\(\s*'label-panel-spieleranzahl-text'\s*,\s*t\(\s*'startseite\.spieleranzahlText'\s*\)\s*\)/);
  });

  test('Gegeben die Schlüssel startseite.spieleranzahlUeberschrift und startseite.spieleranzahlText, wenn sie geprüft werden, dann sind beide in beiden Sprachen und in beiden i18n-Dateien nicht-leer vorhanden', () => {
    erwarteSchluesselInBeidenKopien('startseite.spieleranzahlUeberschrift');
    erwarteSchluesselInBeidenKopien('startseite.spieleranzahlText');
  });

  test('Gegeben der deutsche Spieleranzahl-Text, wenn er inhaltlich geprüft wird, dann erwähnt er sowohl die Zahl 5/fünf als auch einen Host-/Gastgeber-Hinweis (feststehender Fakt aus Product.md, kein Ton-/Stil-Ermessen)', () => {
    const text = UEBERSETZUNGEN_NODE['startseite.spieleranzahlText'].de;
    expect(text).toMatch(/5|fünf/i);
    expect(text).toMatch(/host|gastgeber/i);
  });
});

// ---------------------------------------------------------------------------
// Szenario 4: Panel Ablaufüberblick (AK5, AK8, AK9) - 3 Testfälle
// ---------------------------------------------------------------------------
describe('Szenario: Panel Ablaufüberblick (AK5, AK8, AK9)', () => {
  test('Gegeben die Landingpage, wenn public/index.html auf die neuen Ablauf-Panel-Elemente geprüft wird, dann existieren #label-panel-ablauf-titel und #label-panel-ablauf-text', () => {
    const inhalt = leseIndexHtml();
    expect(inhalt).toMatch(/id="label-panel-ablauf-titel"/);
    expect(inhalt).toMatch(/id="label-panel-ablauf-text"/);
  });

  test('Gegeben wendeSpracheAn(), wenn ihr Funktionskörper geprüft wird, dann setzt sie beide Ablauf-Panel-Elemente über echte Übersetzungsschlüssel (nicht hartcodiert)', () => {
    const koerper = wendeSpracheAnKoerper(leseIndexHtml());
    expect(koerper).toMatch(/setText\(\s*'label-panel-ablauf-titel'\s*,\s*t\(\s*'startseite\.ablaufUeberschrift'\s*\)\s*\)/);
    expect(koerper).toMatch(/setText\(\s*'label-panel-ablauf-text'\s*,\s*t\(\s*'startseite\.ablaufText'\s*\)\s*\)/);
  });

  test('Gegeben die Schlüssel startseite.ablaufUeberschrift und startseite.ablaufText, wenn sie geprüft werden, dann sind beide in beiden Sprachen und in beiden i18n-Dateien nicht-leer vorhanden', () => {
    erwarteSchluesselInBeidenKopien('startseite.ablaufUeberschrift');
    erwarteSchluesselInBeidenKopien('startseite.ablaufText');
  });
});

// ---------------------------------------------------------------------------
// Szenario 5: CTA-Knopf bleibt genauso schnell auffindbar
// (AK7, Pre-Mortem-Risiko 1) - 2 Testfälle
// ---------------------------------------------------------------------------
describe('Szenario: CTA-Knopf bleibt genauso schnell auffindbar (AK7, Pre-Mortem-Risiko 1)', () => {
  test('Gegeben der CTA-Knopf "Spiel erstellen oder beitreten" (#label-cta), wenn seine Position im Markup geprüft wird, dann steht er vor allen drei neuen Panels', () => {
    const inhalt = leseIndexHtml();
    const ctaIndex = inhalt.indexOf('id="label-cta"');
    expect(ctaIndex).toBeGreaterThan(-1);

    const zweckIndex = inhalt.indexOf('id="label-panel-zweck-titel"');
    const spieleranzahlIndex = inhalt.indexOf('id="label-panel-spieleranzahl-titel"');
    const ablaufIndex = inhalt.indexOf('id="label-panel-ablauf-titel"');

    expect(zweckIndex).toBeGreaterThan(-1);
    expect(spieleranzahlIndex).toBeGreaterThan(-1);
    expect(ablaufIndex).toBeGreaterThan(-1);

    expect(ctaIndex).toBeLessThan(zweckIndex);
    expect(ctaIndex).toBeLessThan(spieleranzahlIndex);
    expect(ctaIndex).toBeLessThan(ablaufIndex);
  });

  test('Gegeben der bestehende Kontrast-Regressionsschutz für den primären Button, wenn der .btn.primary-Farbverlauf in public/index.html geprüft wird, dann bleibt er im exakt selben, bereits getesteten Format unverändert', () => {
    const inhalt = leseIndexHtml();
    const match = inhalt.match(/\.btn\.primary\{background:linear-gradient\(180deg,(#[0-9a-fA-F]{6}),(#[0-9a-fA-F]{6})\)/);
    expect(match).not.toBeNull();
    expect(match[1]).toBe('#2b6fd8');
    expect(match[2]).toBe('#1a56c4');
  });
});

// ---------------------------------------------------------------------------
// Szenario 6: Sofortiger Sprachwechsel ohne Neuladen (AK9) - 1 Testfall
// ---------------------------------------------------------------------------
describe('Szenario: Sofortiger Sprachwechsel ohne Neuladen (AK9)', () => {
  test('Gegeben die bestehenden setText()/t()-Aufrufe (z. B. für den Titel), wenn wendeSpracheAn() geprüft wird, dann sind alle sechs neuen setText()/t()-Aufrufe der drei Panels Teil DERSELBEN Funktion wie die bestehenden Aufrufe (kein separater, nicht bei jedem Wechsel laufender Codepfad)', () => {
    const koerper = wendeSpracheAnKoerper(leseIndexHtml());

    // Bestehender Aufruf als Anker, der beweist, dass wir im richtigen
    // Funktionskörper suchen.
    expect(koerper).toMatch(/setText\(\s*'label-titel'\s*,\s*t\(\s*'startseite\.titel'\s*\)\s*\)/);

    const neueAufrufe = [
      /setText\(\s*'label-panel-zweck-titel'\s*,\s*t\(\s*'startseite\.zweckUeberschrift'\s*\)\s*\)/,
      /setText\(\s*'label-panel-zweck-text'\s*,\s*t\(\s*'startseite\.zweckText'\s*\)\s*\)/,
      /setText\(\s*'label-panel-spieleranzahl-titel'\s*,\s*t\(\s*'startseite\.spieleranzahlUeberschrift'\s*\)\s*\)/,
      /setText\(\s*'label-panel-spieleranzahl-text'\s*,\s*t\(\s*'startseite\.spieleranzahlText'\s*\)\s*\)/,
      /setText\(\s*'label-panel-ablauf-titel'\s*,\s*t\(\s*'startseite\.ablaufUeberschrift'\s*\)\s*\)/,
      /setText\(\s*'label-panel-ablauf-text'\s*,\s*t\(\s*'startseite\.ablaufText'\s*\)\s*\)/,
    ];
    for (const regex of neueAufrufe) {
      expect(koerper).toMatch(regex);
    }
  });
});

// ---------------------------------------------------------------------------
// Szenario 7: Keine Wartezeit, kein Lade-, kein Fehlerzustand (AK10)
// - 2 Testfälle
// ---------------------------------------------------------------------------
describe('Szenario: Keine Wartezeit, kein Lade-, kein Fehlerzustand (AK10)', () => {
  test('Gegeben die neuen statischen Panels, wenn public/index.html auf Firebase/Firestore/fetch/onSnapshot-Zugriffe durchsucht wird, dann gibt es keinen einzigen', () => {
    const inhalt = leseIndexHtml();
    expect(inhalt).not.toMatch(/firebase/i);
    expect(inhalt).not.toMatch(/firestore/i);
    expect(inhalt).not.toMatch(/fetch\(/);
    expect(inhalt).not.toMatch(/onSnapshot/);
  });

  test('Gegeben der bestehende, einzige localStorage-Zugriff für die Sprachvorliebe, wenn public/index.html auf localStorage.getItem-Aufrufe geprüft wird, dann gibt es weiterhin genau einen (kein zusätzlicher, ungeprüfter Zugriff durch die neuen Panels)', () => {
    const inhalt = leseIndexHtml();
    const treffer = inhalt.match(/localStorage\.getItem/g) || [];
    expect(treffer.length).toBe(1);
  });
});
