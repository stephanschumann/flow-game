/**
 * FEATURE-012 – Zentrale Spielbegriffe im Spiel selbst erklären (Gate,
 * Definition of Ready). BDD-Tests (flow-game-bdd, 2026-08-01) für die
 * Akzeptanzkriterien 1-15 aus der am 2026-08-01 freigegebenen Spec in
 * Backlog.md ("### FEATURE-012"), inkl. der zwei Korrekturrunden zu den
 * genauen Erklärungstexten (Abschnitt "Freigegebene Erklärungstexte").
 *
 * Diese Datei braucht KEIN neues Modul und KEINEN Firestore-Emulator – das
 * Ticket ändert laut Spec ausdrücklich weder firestore.rules noch das
 * Firestore-Datenmodell (reiner Anzeige-Text plus eine Begriffs-Umbenennung).
 * Sie liest den echten, existierenden Quelltext von public/spiel.html und
 * beide i18n-Kopien und prüft per Mustersuche, ob die geforderten
 * Erklärungstexte bereits enthalten sind – exakt dasselbe Vorgehen wie
 * tests/game-startseite-erklaerung.static.test.js und
 * tests/game-bugfix-006-sprachreine-anzeige.static.test.js.
 *
 * NAMENSGEBUNG (eigene, begründete Festlegung dieser BDD-Phase, siehe auch
 * Hinweis am Kopf der beiden oben genannten Dateien – bitte mit
 * flow-game-impl abgleichen statt stillschweigend zu ignorieren):
 *
 *   - i18n-Schlüssel (neu, beide Kopien):
 *       spielbrett.rundenstartErklaerungRunde1/-Runde2/-Runde3/-Runde4
 *       spielbrett.gateErklaerung
 *       spielbrett.zeitErklaerung
 *   - i18n-Schlüssel (bestehend, INHALT geändert):
 *       spielbrett.dorHinweis (ausführlicherer Text statt des bisherigen
 *         vagen Satzes)
 *       spielbrett.torPraefix.de ("Tor" -> "Gate")
 *   - Element-IDs (neu, statisches Markup in public/spiel.html):
 *       #rundenstart-erklaerung (zentral, einmal, für Runde 1-3, im
 *         Spielbrett-Bereich, Pre-Mortem-Risiko 2: NICHT pro Spalte
 *         wiederholt)
 *       #gate-erklaerung (zentral, einmal, nur für Runde 1/3)
 *       #zeit-erklaerung (immer sichtbar, alle Runden)
 *       #rv-rundenstart-erklaerung (in der eigenen Runde-4-Ansicht rv-brett)
 *   - Alle vier neuen/geänderten Elemente nutzen die bereits etablierte,
 *     gegen FEATURE-005/AK13 geprüfte Klasse "hinweis info" (kein neues,
 *     ungetestetes visuelles Muster, kein Hover-Tooltip, keine reine
 *     Farbcodierung – siehe Implementierungsoption 1 der Analyse-Spec).
 *
 * WICHTIG – bewusst RED beim ersten Lauf: Keiner der oben genannten neuen
 * Schlüssel/Elemente existiert im unveränderten Code, torPraefix.de ist noch
 * "Tor", und die Runde-2-Anzeige zeigt im geschlossenen Zustand weiterhin nur
 * die nackte Zahl ohne Wort (siehe Analyse-Spec, Pflicht-Code-Verifikation).
 * Einzelne Regressions-/Struktur-Szenarien (z. B. "abgebende Station bleibt
 * unverändert zuständig") können bereits grün sein, weil sie unverändertes
 * Bestandsverhalten absichern statt neue Funktionalität zu fordern.
 *
 * Framework: Jest + Node "fs" (kein DOM/jsdom im Projekt vorhanden, siehe
 * package.json devDependencies), Textmuster-Prüfung gegen den echten
 * Quelltext. Die Browser-Kopie public/js/i18n/uebersetzungen.js kann NICHT
 * per require() geladen werden (kein module.exports, kein jsdom) – deshalb
 * wird sie wie im etablierten Muster nur als Text durchsucht, während die
 * Node-Kopie src/i18n/uebersetzungen.js per require() strukturiert geprüft
 * wird.
 */

const fs = require('fs');
const path = require('path');

const SPIEL_HTML_PFAD = path.join(__dirname, '..', 'public', 'spiel.html');
const spielHtmlInhalt = fs.readFileSync(SPIEL_HTML_PFAD, 'utf8');

const { UEBERSETZUNGEN: UEBERSETZUNGEN_NODE } = require('../src/i18n/uebersetzungen');
const BROWSER_UEBERSETZUNGEN_PFAD = path.join(__dirname, '..', 'public', 'js', 'i18n', 'uebersetzungen.js');
const browserUebersetzungenInhalt = fs.readFileSync(BROWSER_UEBERSETZUNGEN_PFAD, 'utf8');

const { stapelTorSchwelle } = require('../src/game/stapelTor');
const { istWurfErfolgreich } = require('../src/game/rundeVier/wuerfelLogik');

function schneide(inhalt, startAnker, endAnker) {
  const start = inhalt.indexOf(startAnker);
  expect(start).toBeGreaterThan(-1); // die bekannte Anker-Stelle muss existieren
  const ende = inhalt.indexOf(endAnker, start);
  expect(ende).toBeGreaterThan(start); // End-Anker muss nach Start-Anker gefunden werden
  return inhalt.slice(start, ende);
}

function renderBrettKoerper() {
  return schneide(spielHtmlInhalt, 'function renderBrett(db, code) {', 'async function versucheRundenEnde(db, code) {');
}

function renderRundeVierKoerper() {
  return schneide(spielHtmlInhalt, 'function renderRundeVier(db, code) {', 'async function versucheRundenEndeRundeVier(db, code) {');
}

function renderRundenStatusKoerper() {
  return schneide(spielHtmlInhalt, 'function renderRundenStatus(db, code) {', 'function darfIchDieseKarteBewegen(rundenNummer, vonPosition, karte) {');
}

function wendeSpracheAufStatischeTexteAnKoerper() {
  return schneide(spielHtmlInhalt, 'function wendeSpracheAufStatischeTexteAn() {', 'function setText(id, text) {');
}

function erwarteSchluesselInBeidenKopien(schluessel) {
  expect(UEBERSETZUNGEN_NODE[schluessel]).toBeDefined();
  expect(UEBERSETZUNGEN_NODE[schluessel].de.trim().length).toBeGreaterThan(0);
  expect(UEBERSETZUNGEN_NODE[schluessel].en.trim().length).toBeGreaterThan(0);
  expect(browserUebersetzungenInhalt).toMatch(
    new RegExp(`'${schluessel.replace(/\./g, '\\.')}':\\s*\\{`)
  );
}

// ---------------------------------------------------------------------------
// AK 1-3: Rundenspezifische Rundenstart-Erklärung für Runde 1, 2, 3.
// ---------------------------------------------------------------------------
describe('Szenario: Rundenstart-Erklärung für Runde 1, 2 und 3 (AK1, AK2, AK3)', () => {
  test('Gegeben die drei rundenspezifischen Schlüssel, wenn die zentrale Übersetzungstabelle geprüft wird, dann existieren alle drei mit nicht-leerem DE/EN in beiden i18n-Kopien', () => {
    erwarteSchluesselInBeidenKopien('spielbrett.rundenstartErklaerungRunde1');
    erwarteSchluesselInBeidenKopien('spielbrett.rundenstartErklaerungRunde2');
    erwarteSchluesselInBeidenKopien('spielbrett.rundenstartErklaerungRunde3');
  });

  test('Gegeben der Runde-1-Text, wenn sein Inhalt geprüft wird, dann entspricht er dem freigegebenen Wortlaut ("6 Karten", Grundprinzip Auftragseingang -> Stationen -> Ziel) in DE und EN', () => {
    const de = UEBERSETZUNGEN_NODE['spielbrett.rundenstartErklaerungRunde1'].de;
    const en = UEBERSETZUNGEN_NODE['spielbrett.rundenstartErklaerungRunde1'].en;
    expect(de).toMatch(/Auftragseingang/);
    expect(de).toMatch(/6 Karten/);
    expect(en).toMatch(/inbox/i);
    expect(en).toMatch(/6 cards/i);
  });

  test('Gegeben der Runde-2-Text, wenn sein Inhalt geprüft wird, dann nennt er "3 Karten" (in einem Stapel) statt "6 Karten" in DE und EN', () => {
    const de = UEBERSETZUNGEN_NODE['spielbrett.rundenstartErklaerungRunde2'].de;
    const en = UEBERSETZUNGEN_NODE['spielbrett.rundenstartErklaerungRunde2'].en;
    expect(de).toMatch(/3 Karten/);
    expect(de).not.toMatch(/6 Karten/);
    expect(en).toMatch(/3 cards/i);
  });

  test('Gegeben der Runde-3-Text, wenn sein Inhalt geprüft wird, dann nennt er "1 Karte" statt "6 Karten" in DE und EN', () => {
    const de = UEBERSETZUNGEN_NODE['spielbrett.rundenstartErklaerungRunde3'].de;
    const en = UEBERSETZUNGEN_NODE['spielbrett.rundenstartErklaerungRunde3'].en;
    expect(de).toMatch(/1 Karte\b/);
    expect(de).not.toMatch(/6 Karten/);
    expect(en).toMatch(/1 card\b/i);
  });

  test('Gegeben renderBrett() (zuständig für Runde 1-3), wenn sein Funktionskörper geprüft wird, dann referenziert er alle drei rundenspezifischen Schlüssel (rundenspezifisch ausgewählt, nicht hartcodiert)', () => {
    const koerper = renderBrettKoerper();
    expect(koerper).toMatch(/spielbrett\.rundenstartErklaerungRunde1/);
    expect(koerper).toMatch(/spielbrett\.rundenstartErklaerungRunde2/);
    expect(koerper).toMatch(/spielbrett\.rundenstartErklaerungRunde3/);
  });

  test('Gegeben das Spielbrett-Markup, wenn public/spiel.html auf ein zentrales, EINMALIGES Erklärungselement geprüft wird, dann existiert #rundenstart-erklaerung genau einmal (Pre-Mortem-Risiko 2: NICHT pro Spalte wiederholt)', () => {
    const treffer = spielHtmlInhalt.match(/id="rundenstart-erklaerung"/g) || [];
    expect(treffer.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// AK 4: Eigene, ausführliche Rundenstart-Erklärung für Runde 4.
// ---------------------------------------------------------------------------
describe('Szenario: Ausführliche Rundenstart-Erklärung für Runde 4 (AK4)', () => {
  test('Gegeben der Runde-4-Schlüssel, wenn die zentrale Übersetzungstabelle geprüft wird, dann existiert er mit nicht-leerem DE/EN in beiden i18n-Kopien', () => {
    erwarteSchluesselInBeidenKopien('spielbrett.rundenstartErklaerungRunde4');
  });

  test('Gegeben der Runde-4-Text, wenn sein Inhalt geprüft wird, dann erklärt er sowohl die Würfel-Regel (Schwelle über 3, Weiterwürfeln bei 1/2/3) als auch die Länderkarten-Regel (Hilfe/Recherche erlaubt, bereits genannte Stadt zählt als Dublette) in DE und EN', () => {
    const de = UEBERSETZUNGEN_NODE['spielbrett.rundenstartErklaerungRunde4'].de;
    const en = UEBERSETZUNGEN_NODE['spielbrett.rundenstartErklaerungRunde4'].en;
    expect(de).toMatch(/über 3/);
    expect(de).toMatch(/4, 5 oder 6/);
    expect(de).toMatch(/helfen lassen|recherchieren/);
    expect(de).toMatch(/Dublette/);
    expect(en).toMatch(/above 3/i);
    expect(en).toMatch(/4, 5, or 6/i);
    expect(en).toMatch(/help|look it up/i);
    expect(en).toMatch(/duplicate/i);
  });

  test('Gegeben renderRundeVier(), wenn sein Funktionskörper geprüft wird, dann referenziert er den Runde-4-Rundenstart-Schlüssel', () => {
    const koerper = renderRundeVierKoerper();
    expect(koerper).toMatch(/spielbrett\.rundenstartErklaerungRunde4/);
  });

  test('Gegeben die eigene Runde-4-Ansicht (rv-brett), wenn public/spiel.html auf ein zugehöriges Erklärungselement geprüft wird, dann existiert #rv-rundenstart-erklaerung', () => {
    expect(spielHtmlInhalt).toMatch(/id="rv-rundenstart-erklaerung"/);
  });

  test('Gegeben renderRundeVier() blendet für Host/Beobachtende (eigeneRundeVierPosition === null) frühzeitig aus, wenn der Funktionskörper VOR dieser frühen Rückgabe geprüft wird, dann ist die Runde-4-Rundenstart-Erklärung bereits dort gesetzt (AK12: sonst wäre sie für Host/Beobachtende unsichtbar, siehe früher return in Zeile ~1980-1988 des unveränderten Codes)', () => {
    const kompletterKoerper = renderRundeVierKoerper();
    const indexFruehesReturn = kompletterKoerper.indexOf('if (eigeneRundeVierPosition === null) {');
    expect(indexFruehesReturn).toBeGreaterThan(-1);
    const vorFruehemReturn = kompletterKoerper.slice(0, indexFruehesReturn);
    expect(vorFruehemReturn).toMatch(/spielbrett\.rundenstartErklaerungRunde4/);
  });
});

// ---------------------------------------------------------------------------
// AK 5: Definition-of-Ready-Erklärung (alle Runden).
// ---------------------------------------------------------------------------
describe('Szenario: Definition-of-Ready-Erklärung erklärt Bestätigung und Vorher-/Nachher-Rechte (AK5)', () => {
  test('Gegeben der bestehende Schlüssel spielbrett.dorHinweis, wenn sein Inhalt geprüft wird, dann bestätigt er "alle Informationen" zum Loslegen UND nennt ausdrücklich Fragen klären/Absprachen/Planung vor der Bestätigung UND Kartenbewegung/Bearbeitungszeit-Beginn danach (DE)', () => {
    const de = UEBERSETZUNGEN_NODE['spielbrett.dorHinweis'].de;
    // Aktuell (heutiger Stand): "Bevor Karten bewegt werden können, muss die
    // Gruppe die Aufgabe verstanden haben." - erwähnt weder "alle
    // Informationen" noch Fragen/Absprachen/Planung explizit.
    expect(de).toMatch(/alle Informationen/);
    expect(de).toMatch(/Fragen klären|klären/);
    expect(de).toMatch(/abstimmen|Absprachen/);
    expect(de).toMatch(/planen|Planung/);
    expect(de).toMatch(/Bearbeitungszeit/);
  });

  test('Gegeben derselbe Schlüssel, wenn der englische Inhalt geprüft wird, dann bestätigt er analog "all the information" und nennt clarify/coordinate/plan sowie den Beginn der processing time', () => {
    const en = UEBERSETZUNGEN_NODE['spielbrett.dorHinweis'].en;
    expect(en).toMatch(/all the information/i);
    expect(en).toMatch(/clarify/i);
    expect(en).toMatch(/coordinate/i);
    expect(en).toMatch(/plan/i);
    expect(en).toMatch(/processing time/i);
  });

  test('Gegeben beide i18n-Kopien, wenn die Browser-Kopie geprüft wird, dann ist spielbrett.dorHinweis dort mit demselben neuen Wortlaut synchron (Pre-Mortem-Risiko 1: Node/Browser-Sync)', () => {
    const de = UEBERSETZUNGEN_NODE['spielbrett.dorHinweis'].de;
    expect(browserUebersetzungenInhalt).toContain(de);
  });
});

// ---------------------------------------------------------------------------
// AK 6 + AK 7: Gate-Erklärung für Runde 1/3 + Umbenennung Tor -> Gate (DE).
// ---------------------------------------------------------------------------
describe('Szenario: Gate-Erklärung für Runde 1/3 und Begriffs-Umbenennung "Tor" -> "Gate" auf Deutsch (AK6, AK7)', () => {
  test('Gegeben der neue Schlüssel spielbrett.gateErklaerung, wenn die zentrale Übersetzungstabelle geprüft wird, dann existiert er mit nicht-leerem DE/EN in beiden i18n-Kopien und erklärt "wie viele Karten"/"nötig" bzw. "how many cards"/"needed"', () => {
    erwarteSchluesselInBeidenKopien('spielbrett.gateErklaerung');
    const de = UEBERSETZUNGEN_NODE['spielbrett.gateErklaerung'].de;
    const en = UEBERSETZUNGEN_NODE['spielbrett.gateErklaerung'].en;
    expect(de).toMatch(/wie viele Karten/);
    expect(de).toMatch(/nötig/);
    expect(en).toMatch(/how many cards/i);
    expect(en).toMatch(/needed/i);
  });

  test('Gegeben der bestehende Schlüssel spielbrett.torPraefix, wenn sein deutscher Wert geprüft wird, dann lautet er jetzt "Gate" statt "Tor" (Englisch bleibt unverändert "Gate")', () => {
    expect(UEBERSETZUNGEN_NODE['spielbrett.torPraefix'].de).toBe('Gate');
    expect(UEBERSETZUNGEN_NODE['spielbrett.torPraefix'].en).toBe('Gate');
  });

  test('Gegeben dieselbe Umbenennung, wenn die Browser-Kopie geprüft wird, dann steht dort ebenfalls "Gate" statt "Tor" für den deutschen Wert (Pre-Mortem-Risiko 1: Node/Browser-Sync)', () => {
    expect(browserUebersetzungenInhalt).toMatch(/'spielbrett\.torPraefix':\s*\{\s*de:\s*'Gate'/);
  });

  test('Gegeben renderBrett(), wenn der Zweig für Runde 1/3 (NICHT Runde 2) geprüft wird, dann setzt er zusätzlich ein Gate-Erklärungselement über t(\'spielbrett.gateErklaerung\')', () => {
    const koerper = renderBrettKoerper();
    const rundeEinsDreiZweig = schneide(koerper, 'const schwelle = window.FlowGame.stapelTorSchwelle(rundenNummer);', 'spalte.appendChild(torInfo);');
    expect(rundeEinsDreiZweig).toMatch(/spielbrett\.gateErklaerung/);
  });

  test('Gegeben die Anzeige an einer Station in Runde 1/3, wenn der torPraefix-Aufruf geprüft wird, dann bleibt er unverändert bei t(\'spielbrett.torPraefix\') (Anzeigetext übernimmt die Umbenennung automatisch über die Übersetzungstabelle, kein separater hartcodierter String "Gate")', () => {
    const koerper = renderBrettKoerper();
    expect(koerper).toMatch(/t\(\s*'spielbrett\.torPraefix'\s*\)/);
    expect(koerper).not.toMatch(/'Gate'\s*\+\s*':'/);
  });

  test('Gegeben das Spielbrett-Markup, wenn public/spiel.html auf ein zentrales, EINMALIGES Gate-Erklärungselement geprüft wird, dann existiert #gate-erklaerung genau einmal (nicht pro Spalte wiederholt)', () => {
    const treffer = spielHtmlInhalt.match(/id="gate-erklaerung"/g) || [];
    expect(treffer.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// AK 8: Runde 2 zeigt im geschlossenen Zustand ein erkennbares Wort.
// ---------------------------------------------------------------------------
describe('Szenario: Runde 2 zeigt "geschlossen"/"closed" als Wort, nicht nur eine nackte Zahl (AK8)', () => {
  function rundeZweiZweig() {
    const koerper = renderBrettKoerper();
    return schneide(koerper, "['A', 'B'].forEach(function (stapel) {", '} else {');
  }

  test('Gegeben der Runde-2-Stapelzeilen-Code, wenn er auf die heute bestehende, unvollständige Formel geprüft wird, dann taucht diese NICHT mehr unverändert auf (aktuell: nur " offen" wird angehängt, der geschlossene Zustand bleibt ohne jedes Wort)', () => {
    const zweig = rundeZweiZweig();
    // Aktuell (Bug, siehe Analyse-Spec): zeile.textContent = stapel + ': ' +
    // anzahl + '/3' + (offen ? ' offen' : '') - kein Zweig fuer geschlossen.
    expect(zweig).not.toMatch(/\(offen\s*\?\s*'\s*offen'\s*:\s*''\)/);
  });

  test('Gegeben derselbe Code, wenn er auf eine vollständige offen/geschlossen-Fallunterscheidung geprüft wird, dann nutzt der geschlossene Fall denselben, bereits an anderer Stelle etablierten Übersetzungsschlüssel spielbrett.torGeschlossen (analog zu torOffen für den offenen Fall)', () => {
    const zweig = rundeZweiZweig();
    expect(zweig).toMatch(/spielbrett\.torOffen/);
    expect(zweig).toMatch(/spielbrett\.torGeschlossen/);
  });

  test('Regressionsschutz: Der Schlüssel spielbrett.torGeschlossen selbst bleibt unverändert "geschlossen"/"closed" (keine Wortänderung, nur neue Verwendungsstelle)', () => {
    expect(UEBERSETZUNGEN_NODE['spielbrett.torGeschlossen'].de).toBe('geschlossen');
    expect(UEBERSETZUNGEN_NODE['spielbrett.torGeschlossen'].en).toBe('closed');
  });
});

// ---------------------------------------------------------------------------
// AK 9: Zeit-Erklärung (alle Runden), Zeitmessung selbst bleibt unverändert.
// ---------------------------------------------------------------------------
describe('Szenario: Zeit-Erklärung ordnet die laufende Uhr in den Analysezweck ein, ohne die Zeitmessung selbst zu ändern (AK9)', () => {
  test('Gegeben der neue Schlüssel spielbrett.zeitErklaerung, wenn die zentrale Übersetzungstabelle geprüft wird, dann existiert er mit nicht-leerem DE/EN in beiden i18n-Kopien und erklärt, dass verschiedene Zeiten gemessen werden, um sie im Nachgang zu analysieren', () => {
    erwarteSchluesselInBeidenKopien('spielbrett.zeitErklaerung');
    const de = UEBERSETZUNGEN_NODE['spielbrett.zeitErklaerung'].de;
    const en = UEBERSETZUNGEN_NODE['spielbrett.zeitErklaerung'].en;
    expect(de).toMatch(/verschiedene Zeiten/);
    expect(de).toMatch(/analysieren/);
    expect(en).toMatch(/different times/i);
    expect(en).toMatch(/analyze/i);
  });

  test('Gegeben das Markup rund um die Zeiten-Anzeige, wenn public/spiel.html auf ein zugehöriges, immer sichtbares Erklärungselement geprüft wird, dann existiert #zeit-erklaerung genau einmal', () => {
    const treffer = spielHtmlInhalt.match(/id="zeit-erklaerung"/g) || [];
    expect(treffer.length).toBe(1);
  });

  test('Gegeben wendeSpracheAufStatischeTexteAn(), wenn ihr Funktionskörper geprüft wird, dann setzt sie #zeit-erklaerung über t(\'spielbrett.zeitErklaerung\') (statischer Text, unabhängig von Rundendaten, genau wie der bestehende dorHinweis-Text)', () => {
    const koerper = wendeSpracheAufStatischeTexteAnKoerper();
    expect(koerper).toMatch(/setText\(\s*'zeit-erklaerung'\s*,\s*t\(\s*'spielbrett\.zeitErklaerung'\s*\)\s*\)/);
  });

  test('Regressionsschutz: Die eigentliche Zeitmessungs-Berechnung (Startzeitpunkt, Formel Ende-minus-Start) in renderRundenStatus() bleibt exakt unverändert – dieses Ticket ändert laut Scope-Abgrenzung zu BUGFIX-007 nur die Erklärung, nicht die Messung selbst', () => {
    const koerper = renderRundenStatusKoerper();
    expect(koerper).toMatch(/zeitDurchlaufEl\.textContent\s*=\s*formatiereZeit\(\(endeMs\s*!=\s*null\s*\?\s*endeMs\s*:\s*Date\.now\(\)\)\s*-\s*startMs\)/);
  });
});

// ---------------------------------------------------------------------------
// AK 10: Runde 4 zeigt keine Gate-Erklärung, aber weiterhin AK4/AK5/AK9.
// ---------------------------------------------------------------------------
describe('Szenario: Runde 4 zeigt keine Gate-Erklärung, aber weiterhin Rundenstart-, DoR- und Zeit-Erklärung (AK10)', () => {
  test('Gegeben renderRundeVier() (zuständig für Runde 4), wenn sein Funktionskörper geprüft wird, dann referenziert er WEDER spielbrett.gateErklaerung NOCH spielbrett.torPraefix (Runde 4 hat kein Gate-Konzept)', () => {
    const koerper = renderRundeVierKoerper();
    expect(koerper).not.toMatch(/spielbrett\.gateErklaerung/);
    expect(koerper).not.toMatch(/spielbrett\.torPraefix/);
  });

  test('Gegeben renderRundenStatus(), wenn sein Funktionskörper geprüft wird, dann behandelt er den dor-bereich weiterhin OHNE rundenspezifische Ausnahme für Runde 4 (dorBereich.hidden hängt nur von runde.dorAbgeschlossen ab, nicht von aktuelleRundenNummer === 4) – die DoR-Erklärung (AK5) gilt unverändert für alle Runden inklusive Runde 4', () => {
    const koerper = renderRundenStatusKoerper();
    expect(koerper).toMatch(/dorBereich\.hidden\s*=\s*Boolean\(runde\.dorAbgeschlossen\)/);
  });

  test('Gegeben renderRundeVier(), wenn erneut auf den Runde-4-Rundenstart-Schlüssel geprüft wird (Dopplung von AK4, hier gezielt im Kontext "trotzdem vorhanden"), dann ist er vorhanden', () => {
    const koerper = renderRundeVierKoerper();
    expect(koerper).toMatch(/spielbrett\.rundenstartErklaerungRunde4/);
  });

  test('Gegeben #zeit-erklaerung (AK9, statisch/rundenunabhängig), wenn renderRundenStatus() geprüft wird, dann versteckt sie es NICHT eigens für Runde 4 (kein "aktuelleRundenNummer === 4"-Sonderfall rund um zeit-erklaerung)', () => {
    const koerper = renderRundenStatusKoerper();
    expect(koerper).not.toMatch(/aktuelleRundenNummer === 4[\s\S]{0,120}zeit-erklaerung/);
  });
});

// ---------------------------------------------------------------------------
// AK 11: Sofortiger Sprachwechsel für alle neuen/geänderten Texte.
// ---------------------------------------------------------------------------
describe('Szenario: Alle neuen/geänderten Erklärungstexte wechseln sofort mit der Sprache, ohne Neuladen (AK11)', () => {
  test('Gegeben wendeSpracheAufSichtbareAnsichtenAn() (löst bei jedem Sprachwechsel ein Neu-Rendern der sichtbaren Ansichten aus), wenn ihr Funktionskörper geprüft wird, dann ruft sie weiterhin renderRundenStatus() UND (für Runde ungleich 4) renderBrett() auf – genau die zwei Funktionen, die laut AK1-AK10 die neuen rundenabhängigen Erklärungstexte setzen', () => {
    const koerper = schneide(spielHtmlInhalt, 'function wendeSpracheAufSichtbareAnsichtenAn() {', 'function zeigeFehler(nachricht) {');
    expect(koerper).toMatch(/renderRundenStatus\(aktuelleDbInstanz, aktuellerSpielCode\)/);
    expect(koerper).toMatch(/renderBrett\(aktuelleDbInstanz, aktuellerSpielCode\)/);
  });

  test('Gegeben renderRundenStatus() ruft für Runde 4 renderRundeVier() auf, wenn dieser Aufruf geprüft wird, dann bleibt er unverändert bestehen (transitiv sorgt das bei einem Sprachwechsel auch für ein Neu-Rendern der Runde-4-Erklärung, AK4/AK10)', () => {
    const koerper = renderRundenStatusKoerper();
    expect(koerper).toMatch(/renderRundeVier\(db, code\)/);
  });

  test('Gegeben #zeit-erklaerung und der bestehende #label-dor-hinweis, wenn wendeSpracheAufStatischeTexteAn() geprüft wird, dann setzt sie beide bei jedem Sprachwechsel neu (kein einmalig gesetzter, dann "eingefrorener" Text)', () => {
    const koerper = wendeSpracheAufStatischeTexteAnKoerper();
    expect(koerper).toMatch(/setText\(\s*'label-dor-hinweis'\s*,\s*t\(\s*'spielbrett\.dorHinweis'\s*\)\s*\)/);
    expect(koerper).toMatch(/setText\(\s*'zeit-erklaerung'\s*,\s*t\(\s*'spielbrett\.zeitErklaerung'\s*\)\s*\)/);
  });
});

// ---------------------------------------------------------------------------
// AK 12: Für Host, Spielende, Beobachtende gleichermaßen sichtbar.
// ---------------------------------------------------------------------------
describe('Szenario: Neue Erklärungstexte sind für Host, Spielende und Beobachtende gleichermaßen sichtbar (AK12)', () => {
  test('Gegeben renderBrett() baut das Spielbrett unabhängig von eigeneRolle/eigeneStationsNummer immer vollständig auf (kein Early-Return für Host/Beobachtende), wenn der Funktionskörper geprüft wird, dann liegt die einzige rollenabhängige Verzweigung (eigeneHinweis) NACH der Erzeugung von rundenstart-erklaerung/gate-erklaerung (die also unabhängig von der Rolle gesetzt werden)', () => {
    const koerper = renderBrettKoerper();
    const indexRundenstart = koerper.indexOf('rundenstart-erklaerung');
    const indexRollenHinweis = koerper.indexOf('eigeneHinweis.hidden');
    expect(indexRundenstart).toBeGreaterThan(-1);
    expect(indexRollenHinweis).toBeGreaterThan(-1);
    expect(indexRundenstart).toBeLessThan(indexRollenHinweis);
  });

  test('Gegeben renderRundeVier() blendet für Host/Beobachtende (eigeneRundeVierPosition === null) den Fokus-/Warteschlangen-Bereich frühzeitig aus, wenn der Funktionskörper geprüft wird, dann liegt die Runde-4-Rundenstart-Erklärung VOR dieser frühen Rückgabe (siehe bereits oben unter AK4 geprüft – hier erneut, gezielt im Kontext der Rollen-Gleichheit)', () => {
    const koerper = renderRundeVierKoerper();
    const indexFruehesReturn = koerper.indexOf('if (eigeneRundeVierPosition === null) {');
    const indexRundenstartRunde4 = koerper.indexOf('spielbrett.rundenstartErklaerungRunde4');
    expect(indexFruehesReturn).toBeGreaterThan(-1);
    expect(indexRundenstartRunde4).toBeGreaterThan(-1);
    expect(indexRundenstartRunde4).toBeLessThan(indexFruehesReturn);
  });
});

// ---------------------------------------------------------------------------
// AK 13: Kein Hover-only, keine reine Farbcodierung.
// ---------------------------------------------------------------------------
describe('Szenario: Erklärungstexte sind ohne Hover lesbar und hängen nicht allein von Farbe ab (AK13)', () => {
  test('Gegeben die vier neuen Erklärungselemente, wenn public/spiel.html auf ihre class-Zuweisung geprüft wird, dann nutzen alle die bereits etablierte, gegen FEATURE-005 geprüfte Klasse "hinweis info" (kein neues, ungetestetes visuelles Muster, kein title-Attribut als einzige Erklärung)', () => {
    ['rundenstart-erklaerung', 'gate-erklaerung', 'zeit-erklaerung', 'rv-rundenstart-erklaerung'].forEach((id) => {
      const anker = `id="${id}"`;
      const stelleIndex = spielHtmlInhalt.indexOf(anker);
      expect(stelleIndex).toBeGreaterThan(-1);
      const umfeld = spielHtmlInhalt.slice(Math.max(0, stelleIndex - 120), stelleIndex + 40);
      expect(umfeld).toMatch(/class="hinweis info"/);
    });
  });

  test('Gegeben dieselben vier Elemente, wenn ihr direktes Umfeld auf ein title-Attribut (reiner Hover-Tooltip) geprüft wird, dann findet sich dort keines', () => {
    ['rundenstart-erklaerung', 'gate-erklaerung', 'zeit-erklaerung', 'rv-rundenstart-erklaerung'].forEach((id) => {
      const anker = `id="${id}"`;
      const stelleIndex = spielHtmlInhalt.indexOf(anker);
      expect(stelleIndex).toBeGreaterThan(-1);
      const umfeld = spielHtmlInhalt.slice(Math.max(0, stelleIndex - 40), stelleIndex + 200);
      expect(umfeld).not.toMatch(/title="/);
    });
  });
});

// ---------------------------------------------------------------------------
// AK 14: Kein "einmal gesehen"-Zustand, übersteht Rejoin/Geräte-/Rollenwechsel.
// ---------------------------------------------------------------------------
describe('Szenario: Kein "einmal gesehen"-Zustand für die neuen Erklärungstexte (AK14)', () => {
  test('Gegeben die neuen/geänderten i18n-Schlüssel dieses Tickets, wenn der gesamte Quelltext von public/spiel.html auf ein lokales Dismiss-/"gesehen"-Muster rund um diese Schlüssel geprüft wird, dann findet sich weder localStorage.setItem noch ein "-gesehen"/"-dismissed"-Feld in ihrer Nähe', () => {
    ['spielbrett.rundenstartErklaerungRunde1', 'spielbrett.rundenstartErklaerungRunde4', 'spielbrett.gateErklaerung', 'spielbrett.zeitErklaerung'].forEach((schluessel) => {
      const stelleIndex = spielHtmlInhalt.indexOf(schluessel);
      if (stelleIndex === -1) return; // wird bereits durch die jeweiligen AK-Tests oben als fehlend/rot gemeldet
      const umfeld = spielHtmlInhalt.slice(Math.max(0, stelleIndex - 300), stelleIndex + 300);
      expect(umfeld).not.toMatch(/localStorage\.setItem/);
      expect(umfeld).not.toMatch(/[Gg]esehen|dismissed/);
    });
  });

  test('Gegeben renderBrett()/renderRundeVier() werden bei jedem Firestore-Snapshot (auch nach Rejoin bzw. beim allerersten Rendern nach Beitritt) komplett neu ausgeführt, wenn ihr jeweiliger Aufruf-Kontext geprüft wird, dann hängt das Setzen der neuen Erklärungstexte an keiner Bedingung, die nur beim ALLERERSTEN Aufruf wahr wäre (z. B. kein "istErsterRenderAufruf"-Flag)', () => {
    expect(spielHtmlInhalt).not.toMatch(/istErsterRenderAufruf|bereitsErklaertGezeigt|erklaerungGesehen/);
  });
});

// ---------------------------------------------------------------------------
// AK 15: Bestehendes Spielverhalten bleibt unverändert (nur Erklärungen +
// die eine Begriffsumbenennung Tor -> Gate).
// ---------------------------------------------------------------------------
describe('Szenario: Bestehendes Spielverhalten (Gate-Schwellen, Würfel-Regel) bleibt durch dieses Ticket unverändert (AK15, Regressionsschutz)', () => {
  test('Gegeben stapelTorSchwelle() aus src/game/stapelTor.js, wenn sie für Runde 1, 2 und 3 aufgerufen wird, dann liefert sie unverändert 6, 3 und 1 (nur die Erklärung ist neu, nicht die Schwelle selbst)', () => {
    expect(stapelTorSchwelle(1)).toBe(6);
    expect(stapelTorSchwelle(2)).toBe(3);
    expect(stapelTorSchwelle(3)).toBe(1);
  });

  test('Gegeben istWurfErfolgreich() aus src/game/rundeVier/wuerfelLogik.js, wenn sie für 1-6 aufgerufen wird, dann bleibt die Schwelle unverändert bei "größer 3" (1, 2, 3 -> false; 4, 5, 6 -> true)', () => {
    [1, 2, 3].forEach((wert) => expect(istWurfErfolgreich(wert)).toBe(false));
    [4, 5, 6].forEach((wert) => expect(istWurfErfolgreich(wert)).toBe(true));
  });

  test('Regressionsschutz: Die bestehenden Übersetzungsschlüssel spielbrett.torOffen und spielbrett.dorButton bleiben inhaltlich unverändert (nur torPraefix.de und dorHinweis ändern sich laut Scope)', () => {
    expect(UEBERSETZUNGEN_NODE['spielbrett.torOffen'].de).toBe('offen');
    expect(UEBERSETZUNGEN_NODE['spielbrett.torOffen'].en).toBe('open');
    expect(UEBERSETZUNGEN_NODE['spielbrett.dorButton'].de).toBe('Definition of Ready abschließen');
  });
});
