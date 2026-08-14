/**
 * FEATURE-010 – Neue Kennzahl: Wartezeit je Spieler und Runde (vor/nach
 * aktiver Bearbeitung).
 * BDD-Tests (flow-game-bdd, 2026-08-14) für die von Stephan freigegebene Spec
 * in Backlog.md ("### FEATURE-010 Neue Kennzahl: Wartezeit je Spieler und
 * Runde", Update nach Stephans Entscheidung 2026-08-14, Ampel Grün).
 *
 * Geprüfte Option (freigegeben): Option A – proStation[station].wartezeitVorher/
 * .wartezeitNachher werden rein additiv aus den bereits vorhandenen
 * ersteBewegungAm/letzteBewegungAm (Node) bzw. dem live mitgeschnittenen
 * bewegungsLog (Browser) relativ zu bearbeitungszeitStart/-Ende berechnet.
 * Kein neues Firestore-Feld, keine firestore.rules-Änderung (siehe Spec,
 * "Betroffene Architektur").
 *
 * Diese Datei prüft BEIDE Fassungen (Pre-Mortem Risiko 1 / Node-Referenz-
 * Browser-Sync-Check der Spec: "beide Dateien im selben Implementierungs-
 * schritt ändern, für beide je einen eigenen automatisierten Test schreiben"):
 *   - src/game/kennzahlen.js        (Node-Referenz, Eingabe: bewegungen[])
 *   - public/js/game/kennzahlen.js  (Browser-Produktivfassung, Eingabe:
 *                                     bewegungsLog[], echte Datei per
 *                                     vm-Sandbox geladen – gleiches Muster wie
 *                                     tests/game-task-004-kennzahlen-browser.
 *                                     integration.test.js)
 *
 * WICHTIG – erwartetes Rot vor der Implementierung: `wartezeitVorher`/
 * `wartezeitNachher` existieren zum Zeitpunkt des Schreibens in KEINER der
 * beiden kennzahlen.js-Dateien (Repo-weite Suche in der Analyse: 0 Treffer in
 * beiden Dateien). Alle Testfälle unten, die diese Felder erwarten, schlagen
 * deshalb jetzt bewusst fehl – das ist der gewünschte "Red"-Zustand vor
 * `flow-game-impl`.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { berechneKennzahlen: berechneKennzahlenNode } = require('../src/game/kennzahlen');

/**
 * Lädt die echte Browser-Kopie von public/js/game/kennzahlen.js in einer
 * minimalen vm-Sandbox (IIFE `(function (global) { ... })(window)`, hängt
 * ihre API an `global.FlowGame`), exakt wie
 * tests/game-task-004-kennzahlen-browser.integration.test.js es bereits tut.
 */
function ladeBrowserFlowGame() {
  const sandbox = {};
  sandbox.window = sandbox;
  vm.createContext(sandbox);

  const kennzahlenCode = fs.readFileSync(
    path.join(__dirname, '..', 'public/js/game/kennzahlen.js'),
    'utf8'
  );
  vm.runInContext(kennzahlenCode, sandbox, { filename: 'public/js/game/kennzahlen.js' });

  return sandbox.window.FlowGame;
}

// Gemeinsame Fixture (bewusst 5 unterschiedliche, nah beieinanderliegende
// Stationsnummern mit klar unterschiedlichen Werten je Station, plus EINE
// komplett inaktive Station – Polaritäts-/Verwechslungsschutz nach demselben
// Muster wie tests/game-task-004-kennzahlen-browser.integration.test.js,
// nicht nur der naheliegende Positivfall):
//   Station 1: startet praktisch sofort (wartezeitVorher nahe 0)   – AK2
//   Station 2/3/4: unterschiedlich lange Wartezeit vorher/nachher  – AK2, AK3
//   Station 5: KEINE einzige Bewegung in der Runde                 – AK9
const BEARBEITUNGSZEIT_START = 500;
const BEARBEITUNGSZEIT_ENDE = 9500;

const rohBewegungenProStation = {
  1: [550, 3000, 8000], // erste 550, letzte 8000
  2: [2200, 5000, 8300], // erste 2200, letzte 8300
  3: [4000, 6200, 8400], // erste 4000, letzte 8400
  4: [3100, 6000, 9000], // erste 3100, letzte 9000
  // Station 5: keine Einträge
};

const erwarteteWerte = {
  1: { wartezeitVorher: 50, wartezeitNachher: 1500, beteiligungsspanne: 7450 }, // 550-500, 9500-8000, 8000-550
  2: { wartezeitVorher: 1700, wartezeitNachher: 1200, beteiligungsspanne: 6100 }, // 2200-500, 9500-8300, 8300-2200
  3: { wartezeitVorher: 3500, wartezeitNachher: 1100, beteiligungsspanne: 4400 }, // 4000-500, 9500-8400, 8400-4000
  4: { wartezeitVorher: 2600, wartezeitNachher: 500, beteiligungsspanne: 5900 }, // 3100-500, 9500-9000, 9000-3100
  5: { wartezeitVorher: 0, wartezeitNachher: 0, beteiligungsspanne: 0 }, // AK9: keine Bewegung -> beide explizit 0
};

function baueNodeBewegungen() {
  return Object.entries(rohBewegungenProStation).map(([station, zeiten]) => ({
    station: Number(station),
    anzahl: zeiten.length,
    ersteBewegungAm: Math.min(...zeiten),
    letzteBewegungAm: Math.max(...zeiten),
  }));
}

function baueBrowserBewegungsLog() {
  return Object.entries(rohBewegungenProStation).flatMap(([station, zeiten]) => (
    zeiten.map((wann) => ({ station: Number(station), wann }))
  ));
}

describe('FEATURE-010 Node-Referenz (src/game/kennzahlen.js): Wartezeit vorher/nachher je Station', () => {
  test('Szenario: Nach Rundenende zeigt jede Station mit mindestens einer Bewegung einen konkreten Wartezeit-vorher- UND Wartezeit-nachher-Wert statt weiterhin nichts (AK1), für jede Station einzeln geprüft statt nur im Aggregat', async () => {
    // Given: eine vollständig beendete Runde mit Bearbeitungszeit-Rahmen und
    // Bewegungsprotokollen für vier von fünf Stationen
    const eingabe = {
      bearbeitungszeitStart: BEARBEITUNGSZEIT_START,
      bearbeitungszeitEnde: BEARBEITUNGSZEIT_ENDE,
      stationen: [1, 2, 3, 4, 5],
      bewegungen: baueNodeBewegungen(),
    };

    // When: die Kennzahlen serverseitig berechnet werden
    const kennzahlen = await berechneKennzahlenNode(eingabe);

    // Then: jede aktive Station hat konkrete Zahlenwerte (keine "—"/undefined)
    [1, 2, 3, 4].forEach((station) => {
      expect(typeof kennzahlen.proStation[station].wartezeitVorher).toBe('number');
      expect(typeof kennzahlen.proStation[station].wartezeitNachher).toBe('number');
    });
  });

  test('Szenario: Eine Station, die die Runde faktisch selbst auslöst (Position 1), zeigt eine Wartezeit vorher nahe 00:00; eine Station in der Mitte der Kette, die spürbar später beginnt, zeigt eine deutlich größere Wartezeit vorher (AK2)', async () => {
    const kennzahlen = await berechneKennzahlenNode({
      bearbeitungszeitStart: BEARBEITUNGSZEIT_START,
      bearbeitungszeitEnde: BEARBEITUNGSZEIT_ENDE,
      stationen: [1, 3],
      bewegungen: baueNodeBewegungen(),
    });

    expect(kennzahlen.proStation[1].wartezeitVorher).toBe(erwarteteWerte[1].wartezeitVorher); // 50 ms, nahe 0
    expect(kennzahlen.proStation[3].wartezeitVorher).toBe(erwarteteWerte[3].wartezeitVorher); // 3500 ms
    expect(kennzahlen.proStation[3].wartezeitVorher).toBeGreaterThan(kennzahlen.proStation[1].wartezeitVorher);
  });

  test('Szenario: Eine Station, deren letzte eigene Bewegung deutlich vor Rundenende liegt, zeigt eine Wartezeit danach größer als 00:00, die dem beobachteten Abstand zwischen letzter Bewegung und Rundenende entspricht (AK3)', async () => {
    const kennzahlen = await berechneKennzahlenNode({
      bearbeitungszeitStart: BEARBEITUNGSZEIT_START,
      bearbeitungszeitEnde: BEARBEITUNGSZEIT_ENDE,
      stationen: [3],
      bewegungen: baueNodeBewegungen(),
    });

    // Station 3: letzte Bewegung bei 8400, Rundenende bei 9500 -> 1100 ms
    expect(kennzahlen.proStation[3].wartezeitNachher).toBe(erwarteteWerte[3].wartezeitNachher);
    expect(kennzahlen.proStation[3].wartezeitNachher).toBeGreaterThan(0);
  });

  test('Szenario: Die neuen Werte erscheinen zusätzlich neben der bereits bestehenden Beteiligungsspanne je Station, ersetzen sie nicht (AK4, Regressionsschutz)', async () => {
    const kennzahlen = await berechneKennzahlenNode({
      bearbeitungszeitStart: BEARBEITUNGSZEIT_START,
      bearbeitungszeitEnde: BEARBEITUNGSZEIT_ENDE,
      stationen: [1, 2],
      bewegungen: baueNodeBewegungen(),
    });

    // Then: beteiligungsspanne bleibt vorhanden und unverändert korrekt,
    // UND wartezeitVorher/wartezeitNachher sind zusätzlich vorhanden
    expect(kennzahlen.proStation[1].beteiligungsspanne).toBe(erwarteteWerte[1].beteiligungsspanne);
    expect(kennzahlen.proStation[1].wartezeitVorher).toBe(erwarteteWerte[1].wartezeitVorher);
    expect(kennzahlen.proStation[1].wartezeitNachher).toBe(erwarteteWerte[1].wartezeitNachher);
    expect(kennzahlen.proStation[2].beteiligungsspanne).toBe(erwarteteWerte[2].beteiligungsspanne);
  });

  test('Szenario: Eine Station ohne jede Bewegung in der gesamten Runde zeigt wartezeitVorher UND wartezeitNachher explizit als 0 – nicht als volle Rundenzeit und nicht als undefined/"—" (AK9, Grenzfall, Stephans Entscheidung Variante c)', async () => {
    // Given: Bewegungsprotokoll ohne jeden Eintrag für Station 5 (identisches
    // Fixture-Muster wie der bestehende "0 Bewegungen"-Test in
    // tests/game-evaluation.logic.test.js)
    const kennzahlen = await berechneKennzahlenNode({
      bearbeitungszeitStart: BEARBEITUNGSZEIT_START,
      bearbeitungszeitEnde: BEARBEITUNGSZEIT_ENDE,
      stationen: [1, 5],
      bewegungen: baueNodeBewegungen(), // enthält keinen Eintrag für Station 5
    });

    // Then: explizit 0/0 – NICHT die volle Bearbeitungszeit (9000 ms) und
    // NICHT undefined
    expect(kennzahlen.proStation[5].wartezeitVorher).toBe(0);
    expect(kennzahlen.proStation[5].wartezeitNachher).toBe(0);
    expect(kennzahlen.proStation[5].wartezeitVorher).not.toBe(BEARBEITUNGSZEIT_ENDE - BEARBEITUNGSZEIT_START);
  });
});

describe('FEATURE-010 Browser-Produktivfassung (public/js/game/kennzahlen.js): Wartezeit vorher/nachher je Station', () => {
  test('Szenario: Nach Rundenende zeigt jede Station mit mindestens einer Bewegung einen konkreten Wartezeit-vorher- UND Wartezeit-nachher-Wert statt weiterhin nichts (AK1), real per vm-Sandbox gegen die echte Produktivdatei geprüft', () => {
    const FlowGame = ladeBrowserFlowGame();

    const kennzahlen = FlowGame.berechneKennzahlen({
      bearbeitungszeitStart: BEARBEITUNGSZEIT_START,
      bearbeitungszeitEnde: BEARBEITUNGSZEIT_ENDE,
      bewegungsLog: baueBrowserBewegungsLog(),
    });

    [1, 2, 3, 4].forEach((station) => {
      expect(typeof kennzahlen.proStation[station].wartezeitVorher).toBe('number');
      expect(typeof kennzahlen.proStation[station].wartezeitNachher).toBe('number');
    });
  });

  test('Szenario: Eine Station, die die Runde faktisch selbst auslöst (Position 1), zeigt eine Wartezeit vorher nahe 00:00; eine Station in der Mitte der Kette zeigt eine deutlich größere Wartezeit vorher (AK2)', () => {
    const FlowGame = ladeBrowserFlowGame();

    const kennzahlen = FlowGame.berechneKennzahlen({
      bearbeitungszeitStart: BEARBEITUNGSZEIT_START,
      bearbeitungszeitEnde: BEARBEITUNGSZEIT_ENDE,
      bewegungsLog: baueBrowserBewegungsLog(),
    });

    expect(kennzahlen.proStation[1].wartezeitVorher).toBe(erwarteteWerte[1].wartezeitVorher);
    expect(kennzahlen.proStation[3].wartezeitVorher).toBe(erwarteteWerte[3].wartezeitVorher);
    expect(kennzahlen.proStation[3].wartezeitVorher).toBeGreaterThan(kennzahlen.proStation[1].wartezeitVorher);
  });

  test('Szenario: Eine Station, deren letzte eigene Bewegung deutlich vor Rundenende liegt, zeigt eine Wartezeit danach größer als 00:00, die dem beobachteten Abstand entspricht (AK3)', () => {
    const FlowGame = ladeBrowserFlowGame();

    const kennzahlen = FlowGame.berechneKennzahlen({
      bearbeitungszeitStart: BEARBEITUNGSZEIT_START,
      bearbeitungszeitEnde: BEARBEITUNGSZEIT_ENDE,
      bewegungsLog: baueBrowserBewegungsLog(),
    });

    expect(kennzahlen.proStation[3].wartezeitNachher).toBe(erwarteteWerte[3].wartezeitNachher);
    expect(kennzahlen.proStation[3].wartezeitNachher).toBeGreaterThan(0);
  });

  test('Szenario: Die neuen Werte erscheinen zusätzlich neben der bereits bestehenden Beteiligungsspanne je Station, ersetzen sie nicht (AK4, Regressionsschutz)', () => {
    const FlowGame = ladeBrowserFlowGame();

    const kennzahlen = FlowGame.berechneKennzahlen({
      bearbeitungszeitStart: BEARBEITUNGSZEIT_START,
      bearbeitungszeitEnde: BEARBEITUNGSZEIT_ENDE,
      bewegungsLog: baueBrowserBewegungsLog(),
    });

    expect(kennzahlen.proStation[1].beteiligungsspanne).toBe(erwarteteWerte[1].beteiligungsspanne);
    expect(kennzahlen.proStation[1].wartezeitVorher).toBe(erwarteteWerte[1].wartezeitVorher);
    expect(kennzahlen.proStation[1].wartezeitNachher).toBe(erwarteteWerte[1].wartezeitNachher);
    expect(kennzahlen.proStation[2].beteiligungsspanne).toBe(erwarteteWerte[2].beteiligungsspanne);
  });

  test('Szenario: Eine Station ohne jede Bewegung in der gesamten Runde zeigt wartezeitVorher UND wartezeitNachher explizit als 0 (AK9, Grenzfall)', () => {
    const FlowGame = ladeBrowserFlowGame();

    const kennzahlen = FlowGame.berechneKennzahlen({
      bearbeitungszeitStart: BEARBEITUNGSZEIT_START,
      bearbeitungszeitEnde: BEARBEITUNGSZEIT_ENDE,
      bewegungsLog: baueBrowserBewegungsLog(), // enthält keinen Eintrag für Station 5
    });

    expect(kennzahlen.proStation[5].wartezeitVorher).toBe(0);
    expect(kennzahlen.proStation[5].wartezeitNachher).toBe(0);
    expect(kennzahlen.proStation[5].wartezeitVorher).not.toBe(BEARBEITUNGSZEIT_ENDE - BEARBEITUNGSZEIT_START);
  });
});

describe('FEATURE-010 Node-Referenz und echte Browser-Fassung liefern bei äquivalenter Eingabe dasselbe Ergebnis (Pre-Mortem Risiko 1, BUGFIX-011-Muster)', () => {
  test('Gegeben dieselbe zugrunde liegende Bewegungs-Historie wird einmal als vor-aggregiertes bewegungen-Array (Node) und einmal als äquivalentes rohes bewegungsLog (Browser) aufbereitet, wenn beide Fassungen ihre jeweilige berechneKennzahlen()-Variante real aufrufen, dann liefern beide für jede Station identische wartezeitVorher- UND wartezeitNachher-Werte – auch für die komplett inaktive Station 5', async () => {
    const kennzahlenNode = await berechneKennzahlenNode({
      bearbeitungszeitStart: BEARBEITUNGSZEIT_START,
      bearbeitungszeitEnde: BEARBEITUNGSZEIT_ENDE,
      stationen: [1, 2, 3, 4, 5],
      bewegungen: baueNodeBewegungen(),
    });

    const FlowGame = ladeBrowserFlowGame();
    const kennzahlenBrowser = FlowGame.berechneKennzahlen({
      bearbeitungszeitStart: BEARBEITUNGSZEIT_START,
      bearbeitungszeitEnde: BEARBEITUNGSZEIT_ENDE,
      bewegungsLog: baueBrowserBewegungsLog(),
    });

    [1, 2, 3, 4, 5].forEach((station) => {
      // Explizit gegen die von Hand vorausberechneten Zahlenwerte prüfen
      // (nicht nur beide Seiten gegeneinander) – sonst würde ein Vergleich
      // von zwei "undefined" (Feld existiert in keiner Fassung) fälschlich
      // GRÜN durchlaufen, obwohl die Funktionalität komplett fehlt (siehe
      // flow-game-bdd, Abschnitt 4a, "Alarmsignal Grün ohne Funktionalität").
      expect(typeof kennzahlenNode.proStation[station].wartezeitVorher).toBe('number');
      expect(typeof kennzahlenBrowser.proStation[station].wartezeitVorher).toBe('number');
      expect(kennzahlenBrowser.proStation[station].wartezeitVorher)
        .toBe(kennzahlenNode.proStation[station].wartezeitVorher);
      expect(kennzahlenBrowser.proStation[station].wartezeitNachher)
        .toBe(kennzahlenNode.proStation[station].wartezeitNachher);
    });
  });
});

/**
 * AK6 (Runde 4 zeigt weiterhin keine Wartezeit-Spalten) wird HIER BEWUSST
 * NICHT als eigener Testfall formuliert – siehe Rückmeldung an Stephan/
 * flow-game-impl: `berechneKennzahlen()` (Browser) nimmt weder heute noch
 * laut Spec eine `rundenNummer` entgegen, wird aber real UNVERÄNDERT sowohl
 * von public/js/game/rundenEnde.js (Runden 1-3) ALS AUCH von
 * public/js/game/rundeVier.js Zeile ~474 (Runde 4, mit echtem bewegungsLog
 * der fünf "Zuständigkeits-Nummern") aufgerufen – real code-geprüft, nicht
 * vermutet. Ohne eine von Stephan/flow-game-impl entschiedene Unterscheidung
 * (z. B. neuer rundenNummer-Parameter mit Rundenwechsel-Guard) würde Option A
 * die neuen Felder auch für Runde 4 füllen und AK6 verletzen. Ein Test dafür
 * würde einen nicht-freigegebenen Lösungsweg vorwegnehmen (siehe flow-game-
 * bdd-Regel "keine Rückfrage einfach selbst entscheiden") – deshalb als
 * offene Rückfrage im Ticket-Testplan festgehalten statt hier geraten.
 */
