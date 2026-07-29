/**
 * FEATURE-008 – Karten per Drag-and-Drop statt Klick-Button bewegen
 * BDD-Tests (flow-game-bdd, 2026-07-29) für die neue Kennzahl "Fehlversuche"
 * (finale Klärung der Frage 8, Backlog.md "### FEATURE-008"): Fehlversuche
 * sollen zusätzlich als eigene, für alle sichtbare Kennzahl gezählt und am
 * Rundenende ausgewiesen werden, analog zur Fehlerzahl-Auswertung aus Runde 4.
 *
 * Gleiches Testmuster wie tests/game-evaluation.logic.test.js (FEATURE-003):
 * reine Node-Tests gegen src/game/kennzahlen.js, KEIN Firestore-Emulator
 * nötig (berechneKennzahlen() ist eine reine Berechnungsfunktion ohne
 * Datenbankzugriff, real code-geprüft).
 *
 * NAMENSGEBUNG (eigene, begründete Festlegung für diese Tests, da die
 * freigegebene Spec nur beobachtbares Verhalten beschreibt, keine Feldnamen
 * — exakt dieselbe Situation wie bei den ursprünglichen FEATURE-003-Tests,
 * siehe deren Kopfkommentar): Ein fehlgeschlagener Versuch wird — analog zum
 * bereits bestehenden Muster `proStation[station].anzahlBewegungen`/
 * `.beteiligungsspanne` (aus einem `bewegungen`-Eingabe-Array berechnet,
 * `src/game/kennzahlen.js`, real code-geprüft) — über ein neues, gleich
 * aufgebautes Eingabe-Array `fehlversuche: [{ station, anzahl }]` in ein
 * neues Ausgabefeld `proStation[station].fehlversuche` überführt ("0
 * Fehlversuche" ohne Sonderbehandlung, wenn eine Station keinen Fehlversuch
 * hatte — dieselbe, bereits etablierte Konvention wie bei anzahlBewegungen).
 * Falls flow-game-impl andere Feldnamen wählt (z. B. einen globalen Zähler
 * statt pro Station, siehe offene Detailfrage in der finalen Klärung 8),
 * bitte mit diesen Tests abgleichen statt sie stillschweigend zu ignorieren.
 *
 * WICHTIG: Diese Tests sind zum Zeitpunkt des Schreibens ERWARTUNGSGEMÄSS ROT
 * — real code-geprüft: berechneKennzahlen() (src/game/kennzahlen.js) kennt
 * heute kein `fehlversuche`-Eingabefeld und erzeugt kein
 * `proStation[station].fehlversuche`-Ausgabefeld; ein zusätzliches
 * Eingabefeld wird von der Funktion aktuell schlicht ignoriert.
 */

const { berechneKennzahlen } = require('../src/game/kennzahlen');

describe('FEATURE-008 Spiellogik: Neue Kennzahl "Fehlversuche" (finale Klärung Frage 8)', () => {
  test('Szenario: Eine Station mit zwei absichtlichen Fehlversuchen zeigt in der Auswertung "2 Fehlversuche"', async () => {
    // Given: Zwei Stationen, Station 2 hat zwei Fehlversuche (falsche Zielspalte), Station 4 keinen
    const eingabe = {
      stationen: [1, 2, 3, 4, 5],
      bewegungen: [],
      fehlversuche: [
        { station: 2, anzahl: 2 },
      ],
    };

    // When: Die Kennzahlen berechnet werden
    const ergebnis = await berechneKennzahlen(eingabe);

    // Then: proStation[2].fehlversuche zeigt 2, alle anderen Stationen 0
    expect(ergebnis.proStation[2].fehlversuche).toBe(2);
    expect(ergebnis.proStation[1].fehlversuche).toBe(0);
    expect(ergebnis.proStation[3].fehlversuche).toBe(0);
    expect(ergebnis.proStation[4].fehlversuche).toBe(0);
    expect(ergebnis.proStation[5].fehlversuche).toBe(0);
  });

  test('Szenario: Eine Station ohne jeden Fehlversuch zeigt weiterhin "0 Fehlversuche", ohne Sonderbehandlung (dieselbe Konvention wie bei anzahlBewegungen)', async () => {
    // Given: Keine Station hat überhaupt einen Fehlversuch gemacht
    const eingabe = {
      stationen: [1, 2, 3],
      bewegungen: [],
      fehlversuche: [],
    };

    // When
    const ergebnis = await berechneKennzahlen(eingabe);

    // Then
    expect(ergebnis.proStation[1].fehlversuche).toBe(0);
    expect(ergebnis.proStation[2].fehlversuche).toBe(0);
    expect(ergebnis.proStation[3].fehlversuche).toBe(0);
  });

  test('Szenario: Fehlversuche fließen NICHT in die bestehenden Kennzahlen anzahlBewegungen/beteiligungsspanne ein (AK14, Regressionsschutz gegen Kollision)', async () => {
    // Given: Station 3 hat eine echte Bewegung UND (unabhängig davon gezählt) einen Fehlversuch
    const eingabe = {
      stationen: [1, 2, 3],
      bewegungen: [
        { station: 3, anzahl: 1, ersteBewegungAm: 1000, letzteBewegungAm: 1000 },
      ],
      fehlversuche: [
        { station: 3, anzahl: 1 },
      ],
    };

    // When
    const ergebnis = await berechneKennzahlen(eingabe);

    // Then: anzahlBewegungen bleibt exakt 1 (nicht 2) - der Fehlversuch zählt separat
    expect(ergebnis.proStation[3].anzahlBewegungen).toBe(1);
    expect(ergebnis.proStation[3].fehlversuche).toBe(1);
  });

  test('Szenario: Fehlt das fehlversuche-Eingabefeld ganz (ältere Aufrufer / Runde ohne diesen Nachtrag), bleibt proStation trotzdem vollständig mit 0 Fehlversuchen befüllt (Abwärtskompatibilität)', async () => {
    // Given: Ein Aufruf ganz ohne fehlversuche-Feld (heutiges Aufrufmuster vor FEATURE-008)
    const eingabe = {
      stationen: [1, 2],
      bewegungen: [{ station: 1, anzahl: 3, ersteBewegungAm: 0, letzteBewegungAm: 500 }],
    };

    // When
    const ergebnis = await berechneKennzahlen(eingabe);

    // Then: bestehende Felder unverändert korrekt, neues Feld defaultet auf 0 statt undefined/Fehler
    expect(ergebnis.proStation[1].anzahlBewegungen).toBe(3);
    expect(ergebnis.proStation[1].fehlversuche).toBe(0);
    expect(ergebnis.proStation[2].fehlversuche).toBe(0);
  });
});
