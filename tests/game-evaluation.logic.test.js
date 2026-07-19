/**
 * FEATURE-003 – Phase 3: Auswertung — Spiellogik (Kennzahlen-Aggregation + Vergleichsansicht)
 *
 * Given/When/Then-Testfälle für die serverautoritative Auswertungslogik: die
 * vollständige Kennzahlen-Aggregation je beendeter Runde (Durchlaufzeit,
 * Bearbeitungszeit, Zeit bis erster/letzter Lieferung, Abstand dazwischen,
 * Pro-Spieler-Zeit/Beteiligungsspanne je Station) sowie die Vergleichsansicht
 * über mehrere Runden hinweg. Gleiches Testmuster wie FEATURE-002
 * (tests/game-round.logic.test.js): Jest + Firestore-Emulator.
 *
 * Diese Tests erwarten:
 *   - src/game/kennzahlen.js       – erweitert um durchlaufzeit, bearbeitungszeit
 *                                     und proStation[station].beteiligungsspanne
 *                                     (existiert bisher nur für proStation[].anzahlBewegungen
 *                                     und die Lieferzeiten-Kennzahlen aus FEATURE-002).
 *   - src/game/vergleichsansicht.js (NEU, existiert noch nicht) – erstelleVergleichsansicht(),
 *                                     iteriert als sortierte Liste über die runden-Unterkollektion
 *                                     statt über drei feste Einzelfelder (Entscheidung 4/
 *                                     Pre-Mortem-Risiko 4 der FEATURE-003-Spec), damit Runde 4
 *                                     (FEATURE-004, inkl. fehlerzahl) sich ohne Strukturumbau
 *                                     ergänzen lässt.
 *
 * NAMENSGEBUNG (eigene, begründete Festlegung für diese Tests, da die Spec nur
 * beobachtbares Verhalten beschreibt, keine Feldnamen): `durchlaufzeit` und
 * `bearbeitungszeit` als Differenz aus den bereits in FEATURE-002 servergesetzten
 * *Start/*Ende-Zeitstempeln, `proStation[station].beteiligungsspanne` als Differenz
 * aus der ersten und letzten Bewegung an dieser Station. Falls flow-game-impl
 * andere Feldnamen wählt, bitte mit diesen Tests abgleichen statt sie stillschweigend
 * zu ignorieren.
 *
 * WICHTIG: Diese Tests sind zum Zeitpunkt des Schreibens ERWARTUNGSGEMÄSS ROT
 * (die Erweiterung von kennzahlen.js existiert noch nicht, vergleichsansicht.js
 * existiert überhaupt noch nicht). Das ist der gewünschte "Red"-Zustand vor
 * `flow-game-impl`.
 */

const { berechneKennzahlen } = require('../src/game/kennzahlen');

// Existiert zum Zeitpunkt der BDD-Phase noch nicht — erwartungsgemäß Red
// (der require() selbst schlägt fehl, solange die Datei fehlt).
let erstelleVergleichsansicht;
try {
  // eslint-disable-next-line global-require
  ({ erstelleVergleichsansicht } = require('../src/game/vergleichsansicht'));
} catch (fehler) {
  // Modul existiert noch nicht — die betroffenen Tests unten schlagen dann
  // beim Aufruf bewusst fehl (erstelleVergleichsansicht bleibt undefined),
  // statt die gesamte Datei mit einem Require-Fehler abzubrechen. Dadurch
  // bleiben auch die Kennzahlen-Aggregations-Tests in derselben Datei lauffähig.
  erstelleVergleichsansicht = undefined;
}

describe('FEATURE-003 Spiellogik: Kennzahlen-Aggregation je beendeter Runde', () => {
  test('Szenario: Eine beendete Runde liefert alle fünf vorgesehenen Kennzahlen (Durchlaufzeit, Bearbeitungszeit, Zeit bis erster/letzter Lieferung, Abstand, Pro-Spieler-Zeit je Station)', async () => {
    // Given: Eine vollständig beendete Runde mit servergesetzten Start-/End-Zeitstempeln,
    // sechs Lieferungen und Bewegungsprotokollen für alle fünf Stationen
    const eingabe = {
      rundenStart: 0,
      durchlaufzeitStart: 0,
      durchlaufzeitEnde: 9000,
      bearbeitungszeitStart: 500,
      bearbeitungszeitEnde: 8800,
      stationen: [1, 2, 3, 4, 5],
      bewegungen: [
        { station: 1, anzahl: 6, ersteBewegungAm: 100, letzteBewegungAm: 8000 },
        { station: 2, anzahl: 6, ersteBewegungAm: 300, letzteBewegungAm: 8200 },
        { station: 3, anzahl: 6, ersteBewegungAm: 600, letzteBewegungAm: 8400 },
        { station: 4, anzahl: 6, ersteBewegungAm: 900, letzteBewegungAm: 8600 },
        { station: 5, anzahl: 6, ersteBewegungAm: 1200, letzteBewegungAm: 8800 },
      ],
      lieferungen: [
        { kartenId: 'karte-1', angekommenAm: 3000 },
        { kartenId: 'karte-2', angekommenAm: 4000 },
        { kartenId: 'karte-3', angekommenAm: 5000 },
        { kartenId: 'karte-4', angekommenAm: 6000 },
        { kartenId: 'karte-5', angekommenAm: 7000 },
        { kartenId: 'karte-6', angekommenAm: 9000 },
      ],
    };

    // When: Die Kennzahlen serverseitig berechnet werden
    const kennzahlen = await berechneKennzahlen(eingabe);

    // Then: Alle fünf Kennzahlenarten sind vorhanden und korrekt
    expect(kennzahlen.durchlaufzeit).toBe(9000); // durchlaufzeitEnde - durchlaufzeitStart
    expect(kennzahlen.bearbeitungszeit).toBe(8300); // bearbeitungszeitEnde - bearbeitungszeitStart
    expect(kennzahlen.zeitBisErsterLieferung).toBe(3000);
    expect(kennzahlen.zeitBisLetzterLieferung).toBe(9000);
    expect(kennzahlen.abstandErsteLetzteLieferung).toBe(6000);
    expect(kennzahlen.proStation[1].beteiligungsspanne).toBe(7900); // 8000 - 100
    expect(kennzahlen.proStation[5].beteiligungsspanne).toBe(7600); // 8800 - 1200
  });

  test('Szenario: Durchlaufzeit wird als Differenz servergesetzter Start-/End-Zeitstempel berechnet, nicht neu gemessen', async () => {
    // Given: Start und Ende liegen fest, keine weiteren Rohdaten nötig
    const kennzahlen = await berechneKennzahlen({ durchlaufzeitStart: 1000, durchlaufzeitEnde: 4500 });

    // Then: Die Durchlaufzeit ist exakt die Differenz — keine eigene Neumessung/Schätzung
    expect(kennzahlen.durchlaufzeit).toBe(3500);
  });

  test('Szenario: Bearbeitungszeit wird als Differenz servergesetzter Start-/End-Zeitstempel berechnet', async () => {
    const kennzahlen = await berechneKennzahlen({ bearbeitungszeitStart: 2000, bearbeitungszeitEnde: 7300 });
    expect(kennzahlen.bearbeitungszeit).toBe(5300);
  });

  test('Szenario: Eine Station ohne jede Bewegung zeigt in der Auswertung weiterhin "0 Bewegungen"/keine Beteiligungsspanne, ohne Sonderbehandlung', async () => {
    // Given: Bewegungsprotokoll ohne jeden Eintrag für Station 5 (identischer Fall wie in FEATURE-002,
    // hier zusätzlich mit der neuen Beteiligungsspanne-Kennzahl aus FEATURE-003 geprüft)
    const bewegungen = [
      { station: 1, anzahl: 6, ersteBewegungAm: 100, letzteBewegungAm: 8000 },
      { station: 2, anzahl: 6, ersteBewegungAm: 300, letzteBewegungAm: 8200 },
      { station: 3, anzahl: 6, ersteBewegungAm: 600, letzteBewegungAm: 8400 },
      { station: 4, anzahl: 6, ersteBewegungAm: 900, letzteBewegungAm: 8600 },
      // Station 5 fehlt komplett im Protokoll
    ];

    // When: Die Kennzahlen berechnet werden
    const kennzahlen = await berechneKennzahlen({ bewegungen, stationen: [1, 2, 3, 4, 5] });

    // Then: Station 5 zeigt 0 Bewegungen und eine Beteiligungsspanne von 0 — kein Fehler/Absturz
    expect(kennzahlen.proStation[5].anzahlBewegungen).toBe(0);
    expect(kennzahlen.proStation[5].beteiligungsspanne).toBe(0);
  });

  test('Szenario: Zwei Stationen mit unterschiedlich langer Wartezeit durch das Stapel-Tor zeigen unterschiedliche Pro-Spieler-Zeiten (Beispiel aus der Spec)', async () => {
    // Given: Station 2 wartet lange auf das Stapel-Tor (kurze tatsächliche Beteiligungsspanne),
    // Station 4 ist von Anfang bis Ende durchgängig aktiv (lange Beteiligungsspanne)
    const bewegungen = [
      { station: 2, anzahl: 6, ersteBewegungAm: 6000, letzteBewegungAm: 6800 }, // spät gestartet, kurze Spanne
      { station: 4, anzahl: 6, ersteBewegungAm: 500, letzteBewegungAm: 8900 }, // fast die ganze Runde aktiv
    ];

    // When: Die Kennzahlen berechnet werden
    const kennzahlen = await berechneKennzahlen({ bewegungen, stationen: [2, 4] });

    // Then: Die Beteiligungsspannen unterscheiden sich deutlich und sind je Station korrekt zugeordnet
    expect(kennzahlen.proStation[2].beteiligungsspanne).toBe(800);
    expect(kennzahlen.proStation[4].beteiligungsspanne).toBe(8400);
    expect(kennzahlen.proStation[4].beteiligungsspanne).toBeGreaterThan(kennzahlen.proStation[2].beteiligungsspanne);
  });
});

describe('FEATURE-003 Spiellogik: Vergleichsansicht über die gespielten Runden', () => {
  const dreiRunden = [
    {
      rundenNummer: 1, durchlaufzeit: 9000, zeitBisErsterLieferung: 3000, abstandErsteLetzteLieferung: 4000,
    },
    {
      rundenNummer: 2, durchlaufzeit: 6000, zeitBisErsterLieferung: 2000, abstandErsteLetzteLieferung: 2500,
    },
    {
      rundenNummer: 3, durchlaufzeit: 3000, zeitBisErsterLieferung: 800, abstandErsteLetzteLieferung: 900,
    },
  ];

  test('Szenario: Die Vergleichsansicht iteriert als Liste über die runden-Unterkollektion, nicht über drei feste Einzelfelder', async () => {
    // Given: Drei gespielte, ausgewertete Runden
    // When: Die Vergleichsansicht erstellt wird
    const vergleich = await erstelleVergleichsansicht({ runden: dreiRunden });

    // Then: Das Ergebnis ist eine Liste (kein Objekt mit drei benannten Einzelfeldern runde1/runde2/runde3)
    expect(Array.isArray(vergleich)).toBe(true);
    expect(vergleich).toHaveLength(3);
    expect(vergleich.map((r) => r.rundenNummer)).toEqual([1, 2, 3]);
  });

  test('Szenario: Die Runden werden nach Rundennummer sortiert dargestellt, unabhängig von der Eingabereihenfolge', async () => {
    // Given: Die Rundendokumente kommen in unsortierter Reihenfolge aus der Unterkollektion
    const unsortiert = [dreiRunden[2], dreiRunden[0], dreiRunden[1]];

    // When: Die Vergleichsansicht erstellt wird
    const vergleich = await erstelleVergleichsansicht({ runden: unsortiert });

    // Then: Die Ausgabe ist trotzdem nach Rundennummer aufsteigend sortiert
    expect(vergleich.map((r) => r.rundenNummer)).toEqual([1, 2, 3]);
  });

  test('Szenario: Eine vierte, später hinzukommende Runde (FEATURE-004, inkl. Fehlerzahl) lässt sich als zusätzliche Spalte ergänzen, ohne Runde 1–3 umzubauen', async () => {
    // Given: Die drei bestehenden Runden PLUS eine vierte mit zusätzlichem fehlerzahl-Feld
    const mitVierterRunde = [
      ...dreiRunden,
      {
        rundenNummer: 4, durchlaufzeit: 2000, zeitBisErsterLieferung: 500, abstandErsteLetzteLieferung: 600, fehlerzahl: 2,
      },
    ];

    // When: Die Vergleichsansicht erstellt wird
    const vergleich = await erstelleVergleichsansicht({ runden: mitVierterRunde });

    // Then: Vier Spalten insgesamt, Runde 1–3 bleiben in Form und Reihenfolge unverändert,
    // Runde 4 erscheint zusätzlich inklusive ihrer Fehlerzahl
    expect(vergleich).toHaveLength(4);
    expect(vergleich.slice(0, 3).map((r) => r.rundenNummer)).toEqual([1, 2, 3]);
    expect(vergleich[3].rundenNummer).toBe(4);
    expect(vergleich[3].fehlerzahl).toBe(2);
  });

  test('Szenario: Die Vergleichsansicht übernimmt serverseitig berechnete Kennzahlen unverändert, ohne sie clientseitig neu zu berechnen', async () => {
    // Given: Eine einzelne Runde mit fest vorgegebenen, bereits serverseitig berechneten Werten
    const runde = {
      rundenNummer: 1, durchlaufzeit: 12345, zeitBisErsterLieferung: 111, abstandErsteLetzteLieferung: 222,
    };

    // When: Die Vergleichsansicht erstellt wird
    const vergleich = await erstelleVergleichsansicht({ runden: [runde] });

    // Then: Die Werte werden exakt übernommen (Identität), nicht aus anderen Rohdaten neu hergeleitet
    expect(vergleich[0].durchlaufzeit).toBe(12345);
    expect(vergleich[0].zeitBisErsterLieferung).toBe(111);
    expect(vergleich[0].abstandErsteLetzteLieferung).toBe(222);
  });

  test('Szenario: Noch keine gespielte Runde vorhanden → die Vergleichsansicht liefert eine leere Liste ohne Fehler', async () => {
    // Given/When: Es existieren (noch) keine Runden-Dokumente
    const vergleich = await erstelleVergleichsansicht({ runden: [] });

    // Then: Leere Liste statt Absturz/undefined
    expect(vergleich).toEqual([]);
  });
});
