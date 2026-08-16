/**
 * TASK-004 – Verifikation: Beteiligungsspanne-Berechnung bei vollständig
 * besetztem Spiel.
 * BDD-Tests (flow-game-bdd, 2026-08-14) für die freigegebene Spec in
 * Backlog.md ("### TASK-004 Verifikation: Beteiligungsspanne-Berechnung bei
 * vollständig besetztem Spiel"), Testplan-Grundgerüst Punkte 1-3.
 *
 * WARUM DIESE DATEI DIE EIGENTLICHE LÜCKE SCHLIESST (siehe Analyse-Spec,
 * "Pflicht-Code-Verifikation der Prämissen" + "Node-Referenz/Browser-Sync-
 * Check"): Die einzige bisher automatisiert getestete Fassung der
 * Beteiligungsspanne-Berechnung ist die Node-Referenz
 * (`src/game/kennzahlen.js`, siehe tests/game-evaluation.logic.test.js).
 * Die tatsächlich produktiv im Browser laufende Fassung
 * (`public/js/game/kennzahlen.js`) hat bislang KEINEN einzigen
 * automatisierten Test (Repo-weite Suche `berechneKennzahlen|public/js/
 * game/kennzahlen` in tests/: 0 Treffer vor dieser Datei). Diese Datei lädt
 * die ECHTE Browser-Kopie über eine minimale vm-Sandbox, die `window` als
 * globales Objekt bereitstellt - exakt wie public/spiel.html es per
 * <script>-Tags tut (kein Bundler im Projekt) - nach demselben, bereits
 * etablierten Muster wie
 * tests/game-bugfix-014-createGame-browser.integration.test.js.
 *
 * WICHTIG - erwartetes Rot vor der Implementierung: Diese Datei existiert
 * heute (14.08.2026) zum ersten Mal. Die geprüfte Funktionalität
 * (public/js/game/kennzahlen.js#berechneKennzahlen) existiert zwar bereits
 * im Code, wurde aber noch NIE gegen die hier formulierten, von Hand
 * vorausberechneten Erwartungswerte automatisiert verifiziert - die Tests
 * schlagen deshalb jetzt fehl, falls die Implementierung (oder diese
 * erstmalige Verifikation) einen Fehler enthält; siehe Testlauf-Ergebnis am
 * Ende der Datei-Historie in Backlog.md für den tatsächlich beobachteten
 * ersten Ausführungsstand.
 *
 * SCOPE-HINWEIS (bewusst NICHT Teil dieser Datei): Der in der Analyse
 * gefundene Reload-Grenzfall ("Rundenende-Schreiber mit unvollständigem
 * bewegungsLog durch Reload/späten Beitritt mitten in der Runde") ist laut
 * Stephans Entscheidung (Backlog.md, "Update nach Stephans Entscheidung
 * (2026-08-14)") als eigenständiges Ticket BUGFIX-016 ausgelagert - diese
 * Datei testet ausschließlich den engen TASK-004-Ursprungs-Scope
 * ("funktioniert die Formel bei echter Mehrstationen-Aktivität ohne
 * Reloads"), kein vollständiges bewegungsLog eines mitten in der Runde
 * beigetretenen/neu geladenen Clients wird hier simuliert.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { berechneKennzahlen: berechneKennzahlenNode } = require('../src/game/kennzahlen');

/**
 * Lädt die echte Browser-Kopie von public/js/game/kennzahlen.js in einer
 * minimalen vm-Sandbox (IIFE der Form `(function (global) { ... })(window)`,
 * hängt ihre API an `global.FlowGame`, siehe Kopfkommentar der Quelldatei).
 * Gibt das befüllte `window.FlowGame`-Objekt zurück.
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

describe('Szenario: Mehrere Stationen mit unterschiedlicher Bewegungsanzahl und zeitlichem Abstand liefern in der echten Browser-Fassung korrekte Werte je Station (AK1, AK2, Testplan-Grundgerüst Punkt 1)', () => {
  test('Gegeben ein bewegungsLog mit echten Bewegungen an fünf unterschiedlichen Stationen (unterschiedliche Anzahl, unterschiedlicher zeitlicher Abstand, plus eine komplett inaktive Station dazwischen), wenn public/js/game/kennzahlen.js#berechneKennzahlen() real per vm-Sandbox darauf aufgerufen wird, dann stimmen anzahlBewegungen und beteiligungsspanne für JEDE Station einzeln mit den von Hand vorausberechneten erwarteten Werten überein - nicht nur im Aggregat und nicht nur für eine einzelne Positiv-Station', () => {
    const FlowGame = ladeBrowserFlowGame();

    // Given: bewusst nah beieinanderliegende Stationsnummern (1-5) mit klar
    // unterschiedlichen, absichtlich NICHT austauschbaren Werten je Station,
    // damit ein Verwechslungs-/Gruppierungsfehler (z. B. Station 2 bekommt
    // versehentlich die Werte von Station 3) real auffallen würde. Station 2
    // bleibt komplett inaktiv (0 Bewegungen), obwohl Nachbarstationen 1 und
    // 3 aktiv sind - Polaritäts-Testfall gegen Vermischung.
    const bewegungsLog = [
      { station: 1, wann: 100 },
      { station: 1, wann: 2500 },
      { station: 1, wann: 8000 }, // Station 1: 3 Bewegungen, Spanne 7900
      // Station 2: keine einzige Bewegung -> muss 0/0 bleiben
      { station: 3, wann: 600 },
      { station: 3, wann: 8400 }, // Station 3: 2 Bewegungen, Spanne 7800
      { station: 4, wann: 900 },
      { station: 4, wann: 3000 },
      { station: 4, wann: 5000 },
      { station: 4, wann: 8600 }, // Station 4: 4 Bewegungen, Spanne 7700
      { station: 5, wann: 1200 },
      { station: 5, wann: 8800 }, // Station 5: 2 Bewegungen, Spanne 7600
    ];

    // When
    const kennzahlen = FlowGame.berechneKennzahlen({ bewegungsLog });

    // Then: jede Station einzeln geprüft, nicht nur die naheliegende
    expect(kennzahlen.proStation[1]).toEqual({ anzahlBewegungen: 3, beteiligungsspanne: 7900 });
    expect(kennzahlen.proStation[2]).toEqual({ anzahlBewegungen: 0, beteiligungsspanne: 0 });
    expect(kennzahlen.proStation[3]).toEqual({ anzahlBewegungen: 2, beteiligungsspanne: 7800 });
    expect(kennzahlen.proStation[4]).toEqual({ anzahlBewegungen: 4, beteiligungsspanne: 7700 });
    expect(kennzahlen.proStation[5]).toEqual({ anzahlBewegungen: 2, beteiligungsspanne: 7600 });
  });
});

describe('Szenario: Genau eine einzige Bewegung an einer Station ist von einer komplett inaktiven Station unterscheidbar (AK2, Grenzfall Beispiel 3, Testplan-Grundgerüst Punkt 2)', () => {
  test('Gegeben Station 3 hat genau eine einzige Bewegung und Station 5 hat gar keine Bewegung, wenn die echte Browser-Fassung die Kennzahlen berechnet, dann zeigt Station 3 anzahlBewegungen=1 UND beteiligungsspanne=0 (nicht "0 Bewegungen"), während Station 5 weiterhin anzahlBewegungen=0 UND beteiligungsspanne=0 zeigt - beide Felder zusammen betrachtet bleiben die zwei Fälle unterscheidbar', () => {
    const FlowGame = ladeBrowserFlowGame();

    const bewegungsLog = [
      { station: 3, wann: 4200 }, // genau eine einzige Bewegung
      // Station 5: keine einzige Bewegung
    ];

    const kennzahlen = FlowGame.berechneKennzahlen({ bewegungsLog });

    expect(kennzahlen.proStation[3].anzahlBewegungen).toBe(1);
    expect(kennzahlen.proStation[3].beteiligungsspanne).toBe(0);
    expect(kennzahlen.proStation[5].anzahlBewegungen).toBe(0);
    expect(kennzahlen.proStation[5].beteiligungsspanne).toBe(0);
    // Die beiden Fälle sind NICHT identisch, sobald man beide Felder
    // gemeinsam betrachtet (anzahlBewegungen unterscheidet sie), auch wenn
    // beteiligungsspanne für sich genommen in beiden Fällen 0 ist.
    expect(kennzahlen.proStation[3].anzahlBewegungen).not.toBe(kennzahlen.proStation[5].anzahlBewegungen);
  });
});

describe('Szenario: Node-Referenz und echte Browser-Fassung liefern bei vollständiger, äquivalent aufbereiteter Eingabe dasselbe Ergebnis je Station (AK3, Node/Browser-Sync-Bestätigung, Testplan-Grundgerüst Punkt 3)', () => {
  test('Gegeben dieselbe zugrunde liegende Bewegungs-Historie wird einmal als vor-aggregiertes bewegungen-Array (Node-Eingabeform) und einmal als äquivalentes rohes bewegungsLog (Browser-Eingabeform, wie es aus docChanges() mitgeschnitten würde) aufbereitet, wenn beide Fassungen ihre jeweilige berechneKennzahlen()-Variante real aufrufen, dann liefern beide für jede betroffene Station identische anzahlBewegungen und beteiligungsspanne - unabhängig davon, welche der beiden Fassungen ausgewertet wird', async () => {
    // Given: identische zugrunde liegende Historie, zweimal aufbereitet
    const rohBewegungen = {
      1: [100, 2500, 8000],
      3: [600, 8400],
      4: [900, 3000, 5000, 8600],
    };

    const bewegungenNode = Object.entries(rohBewegungen).map(([station, zeiten]) => ({
      station: Number(station),
      anzahl: zeiten.length,
      ersteBewegungAm: Math.min(...zeiten),
      letzteBewegungAm: Math.max(...zeiten),
    }));

    const bewegungsLogBrowser = Object.entries(rohBewegungen).flatMap(([station, zeiten]) => (
      zeiten.map((wann) => ({ station: Number(station), wann }))
    ));

    // When: beide Fassungen real aufgerufen
    const kennzahlenNode = await berechneKennzahlenNode({
      bewegungen: bewegungenNode,
      stationen: [1, 2, 3, 4, 5],
    });
    const FlowGame = ladeBrowserFlowGame();
    const kennzahlenBrowser = FlowGame.berechneKennzahlen({ bewegungsLog: bewegungsLogBrowser });

    // Then: für jede Station identisches Ergebnis, inkl. der inaktiven
    // Stationen 2 und 5 (0/0 auf beiden Seiten)
    [1, 2, 3, 4, 5].forEach((station) => {
      expect(kennzahlenBrowser.proStation[station].anzahlBewegungen)
        .toBe(kennzahlenNode.proStation[station].anzahlBewegungen);
      expect(kennzahlenBrowser.proStation[station].beteiligungsspanne)
        .toBe(kennzahlenNode.proStation[station].beteiligungsspanne);
    });
  });
});
