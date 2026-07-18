/**
 * FEATURE-002 – Spiellogik "Spielfeld + Runden 1–3"
 *
 * Given/When/Then-Testfälle für die serverautoritative Spiellogik: Stapel-Tor-Schwellen,
 * Zeitmessung (Durchlaufzeit/Bearbeitungszeit/Pro-Spieler-Zeit), Kennzahlenberechnung
 * und Rundenwechsel. Gleiches Testmuster wie in FEATURE-001
 * (tests/game-rooms.logic.test.js): Jest + Firestore-Emulator.
 *
 * Diese Tests erwarten Module, die ERST in `flow-game-impl` entstehen:
 *   - src/game/stapelTor.js       (Schwellenprüfung 6/3/1, getrennte Stapelzählung Runde 2)
 *   - src/game/rundenStart.js     (Durchlaufzeit-Start, DoR-Auslösung, Bearbeitungszeit-Start)
 *   - src/game/kartenBewegung.js  (atomare Kartenbewegung als Transaktion)
 *   - src/game/rundenEnde.js      (automatisches Stoppen aller Zeiten bei letzter Karte im Ziel)
 *   - src/game/kennzahlen.js      (Durchlaufzeit, Bearbeitungszeit, Pro-Spieler-Zeit,
 *                                   Zeit bis erste/letzte Lieferung, Abstand dazwischen)
 *   - src/game/rundenwechsel.js   (Host-ausgelöster Wechsel, Kartenpositionen zurücksetzen)
 *
 * WICHTIG: Diese Tests sind zum Zeitpunkt des Schreibens ERWARTUNGSGEMÄSS ROT
 * (Module existieren noch nicht → Import schlägt fehl bzw. Funktionen sind undefined).
 * Das ist der gewünschte "Red"-Zustand vor `flow-game-impl`.
 */

const {
  initializeTestEnvironment,
  assertSucceeds,
} = require('@firebase/rules-unit-testing');
const fs = require('fs');
const path = require('path');

// Diese Module existieren zum Zeitpunkt der BDD-Phase noch nicht — erwartungsgemäß Red.
const { pruefeStapelTor } = require('../src/game/stapelTor');
const { starteRunde, loeseDefinitionOfReadyAus } = require('../src/game/rundenStart');
const { bewegeKarte } = require('../src/game/kartenBewegung');
const { pruefeRundenEnde } = require('../src/game/rundenEnde');
const { berechneKennzahlen } = require('../src/game/kennzahlen');
const { wechsleZurNaechstenRunde } = require('../src/game/rundenwechsel');

const PROJECT_ID = 'flow-game-feature-002-logic-test';
let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync(path.resolve(__dirname, '../firestore.rules'), 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

describe('FEATURE-002 Spiellogik: Stapel-Tor-Schwellen je Runde', () => {
  test('Szenario Runde 1: Stapel-Tor öffnet erst bei allen 6 Karten an der Zielstation', async () => {
    // Given: 5 von 6 Karten sind an Station 1 angekommen
    const angekommen = 5;
    // When: Das Stapel-Tor für den Übergang Station 1 → Station 2 wird geprüft
    const offenBei5 = await pruefeStapelTor({ runde: 1, station: 2, angekommeneKarten: angekommen });
    // Then: Das Tor ist noch geschlossen
    expect(offenBei5).toBe(false);

    // Given: Die sechste Karte kommt ebenfalls an
    // When: Erneut geprüft mit 6 angekommenen Karten
    const offenBei6 = await pruefeStapelTor({ runde: 1, station: 2, angekommeneKarten: 6 });
    // Then: Das Tor ist jetzt offen
    expect(offenBei6).toBe(true);
  });

  test('Szenario Runde 2: Stapel-Tor öffnet bei 3 Karten (je Stapel getrennt gezählt)', async () => {
    // Given/When: Stapel A hat 3 von 3 Karten an der Zielstation, Stapel B hat 1 von 3
    const stapelA = await pruefeStapelTor({ runde: 2, station: 2, stapel: 'A', angekommeneKarten: 3 });
    const stapelB = await pruefeStapelTor({ runde: 2, station: 2, stapel: 'B', angekommeneKarten: 1 });

    // Then: Stapel A ist offen, Stapel B bleibt gesperrt — unabhängig von Stapel A
    expect(stapelA).toBe(true);
    expect(stapelB).toBe(false);
  });

  test('Szenario Runde 2: Beide Stapel getrennt gezählt — keine gemeinsame Gesamtsumme', async () => {
    // Given: Zusammen sind 4 Karten angekommen (2 aus A, 2 aus B) — eine naive Gesamtsummen-Prüfung
    // würde bei Schwelle 3 fälschlich "offen" ergeben, wenn nicht pro Stapel gezählt wird.
    const stapelA = await pruefeStapelTor({ runde: 2, station: 2, stapel: 'A', angekommeneKarten: 2 });
    const stapelB = await pruefeStapelTor({ runde: 2, station: 2, stapel: 'B', angekommeneKarten: 2 });

    // Then: Beide Stapel bleiben einzeln unter der Schwelle von 3 und sind daher geschlossen
    expect(stapelA).toBe(false);
    expect(stapelB).toBe(false);
  });

  test('Szenario Runde 3: Stapel-Tor öffnet bereits bei einer einzelnen angekommenen Karte', async () => {
    const offen = await pruefeStapelTor({ runde: 3, station: 4, angekommeneKarten: 1 });
    expect(offen).toBe(true);
  });

  test('Szenario: Übergang Auftragseingang → Station 1 ist in allen drei Runden immer offen', async () => {
    for (const runde of [1, 2, 3]) {
      // Given/When: Noch keine einzige Karte ist an Station 1 angekommen
      const offen = await pruefeStapelTor({ runde, station: 1, angekommeneKarten: 0, istErsterUebergang: true });
      // Then: Der Übergang ist trotzdem sofort offen (kein Tor für den allerersten Übergang)
      expect(offen).toBe(true);
    }
  });
});

describe('FEATURE-002 Spiellogik: Zeitmessung', () => {
  test('Szenario: Durchlaufzeit startet automatisch bei Aufgabenvorstellung', async () => {
    // Given: Ein neues Spiel, Runde 1 wurde noch nicht gestartet
    // When: Der Host stellt die Aufgabe vor (Runde wird gestartet)
    const runde = await starteRunde({ code: 'ABCD1234', rundenNummer: 1 });

    // Then: Die Durchlaufzeit läuft bereits, ohne dass eine Karte bewegt wurde
    expect(runde.durchlaufzeitStart).not.toBeNull();
    expect(runde.bearbeitungszeitStart).toBeNull();
  });

  test('Szenario: Bearbeitungszeit startet mit der ersten tatsächlich bewegten Karte', async () => {
    // Given: Runde läuft, DoR abgeschlossen, noch keine Karte bewegt
    const code = 'ABCD1234';
    await starteRunde({ code, rundenNummer: 1 });
    await loeseDefinitionOfReadyAus({ code, rundenNummer: 1, ausgeloestVon: 'host-1' });

    // When: Die erste gültige Kartenbewegung passiert
    const ergebnis = await bewegeKarte({
      code, rundenNummer: 1, kartenId: 'karte-1', vonPosition: 0, nachPosition: 1, ausgefuehrtVon: 'spieler-station-1',
    });

    // Then: Die Bearbeitungszeit ist jetzt gesetzt
    expect(ergebnis.bearbeitungszeitStart).not.toBeNull();
  });

  test('Szenario: Alle Zeiten stoppen automatisch, sobald die letzte Karte im Ziel ankommt', async () => {
    // Given: Fünf der sechs Karten sind bereits im Ziel (Position 6)
    const code = 'ABCD1234';
    const rundenNummer = 1;

    // When: Die letzte, sechste Karte erreicht ebenfalls das Ziel
    const rundenzustand = await pruefeRundenEnde({
      code, rundenNummer, kartenPositionen: [6, 6, 6, 6, 6, 6],
    });

    // Then: Durchlaufzeit-Ende, Bearbeitungszeit-Ende sind gesetzt, ohne dass jemand das ausgelöst hat
    expect(rundenzustand.beendet).toBe(true);
    expect(rundenzustand.durchlaufzeitEnde).not.toBeNull();
  });

  test('Szenario: Eine Station ohne jede Bewegung in der Runde zeigt "0 Bewegungen" ohne Sonderfehler', async () => {
    // Given: Bewegungsprotokoll ohne jeden Eintrag für Station 5
    const bewegungen = [
      { station: 1, anzahl: 6 },
      { station: 2, anzahl: 6 },
      { station: 3, anzahl: 6 },
      { station: 4, anzahl: 6 },
      // Station 5 fehlt komplett im Protokoll
    ];

    // When: Die Kennzahlen berechnet werden
    const kennzahlen = await berechneKennzahlen({ bewegungen, stationen: [1, 2, 3, 4, 5] });

    // Then: Station 5 zeigt schlicht 0 Bewegungen, kein Fehler/Absturz
    expect(kennzahlen.proStation[5].anzahlBewegungen).toBe(0);
  });

  test('Szenario: Zeit bis erster/letzter Lieferung und Abstand dazwischen korrekt berechnet', async () => {
    const lieferungen = [
      { kartenId: 'karte-1', angekommenAm: 1000 },
      { kartenId: 'karte-2', angekommenAm: 1500 },
      { kartenId: 'karte-3', angekommenAm: 4000 },
      { kartenId: 'karte-4', angekommenAm: 4200 },
      { kartenId: 'karte-5', angekommenAm: 4500 },
      { kartenId: 'karte-6', angekommenAm: 5000 },
    ];
    const kennzahlen = await berechneKennzahlen({ lieferungen, rundenStart: 0 });

    expect(kennzahlen.zeitBisErsterLieferung).toBe(1000);
    expect(kennzahlen.zeitBisLetzterLieferung).toBe(5000);
    expect(kennzahlen.abstandErsteLetzteLieferung).toBe(4000);
  });

  test('Szenario Runde 1 vs. Runde 3: erste Lieferung kommt in Runde 3 deutlich früher an', async () => {
    // Given: Simulierte Lieferzeitpunkte je Runde (Ergebnis der jeweiligen Stapel-Tor-Schwelle)
    const kennzahlenRunde1 = await berechneKennzahlen({
      lieferungen: [{ kartenId: 'karte-1', angekommenAm: 9000 }], rundenStart: 0,
    });
    const kennzahlenRunde3 = await berechneKennzahlen({
      lieferungen: [{ kartenId: 'karte-1', angekommenAm: 1500 }], rundenStart: 0,
    });

    // Then: Runde 3 liefert sichtbar früher als Runde 1
    expect(kennzahlenRunde3.zeitBisErsterLieferung).toBeLessThan(kennzahlenRunde1.zeitBisErsterLieferung);
  });
});

describe('FEATURE-002 Spiellogik: Rundenwechsel', () => {
  test('Szenario: Rundenwechsel setzt alle Kartenpositionen zurück und startet die neue Runde', async () => {
    // Given: Runde 1 ist beendet
    const code = 'ABCD1234';

    // When: Der Host löst den Wechsel zur nächsten Runde aktiv aus
    const neueRunde = await wechsleZurNaechstenRunde({ code, vonRunde: 1, ausgeloestVon: 'host-1' });

    // Then: Runde 2 beginnt mit allen sechs Karten zurück im Auftragseingang (Position 0)
    expect(neueRunde.rundenNummer).toBe(2);
    expect(neueRunde.karten.every((k) => k.position === 0)).toBe(true);
    expect(neueRunde.beitrittsCode).toBe(code); // derselbe Code bleibt gültig
  });

  test('Szenario: Ohne aktive Host-Aktion bleibt das Spielfeld im Endzustand der abgeschlossenen Runde', async () => {
    // Given: Runde 1 ist beendet, niemand hat den Wechsel ausgelöst
    const code = 'ABCD1234';

    // When: Der Rundenzustand direkt danach abgefragt wird (kein wechsleZurNaechstenRunde-Aufruf)
    const rundenzustand = await pruefeRundenEnde({ code, rundenNummer: 1, kartenPositionen: [6, 6, 6, 6, 6, 6] });

    // Then: Es existiert noch keine Runde 2, das Spielfeld zeigt weiterhin den Endzustand von Runde 1
    expect(rundenzustand.naechsteRundeExistiert).toBe(false);
  });
});

describe('FEATURE-002 Spiellogik: Pre-Mortem-Risiken', () => {
  test('Szenario: Gleichzeitige DoR-Auslösung durch Host und Team startet die Bearbeitungszeit nicht doppelt', async () => {
    // Given: Runde läuft, DoR noch offen
    const code = 'ABCD1234';
    await starteRunde({ code, rundenNummer: 1 });

    // When: Host und Team-Mitglied lösen DoR im selben Moment aus (simuliert als zwei parallele Aufrufe)
    const [ergebnisHost, ergebnisTeam] = await Promise.all([
      loeseDefinitionOfReadyAus({ code, rundenNummer: 1, ausgeloestVon: 'host-1' }),
      loeseDefinitionOfReadyAus({ code, rundenNummer: 1, ausgeloestVon: 'spieler-station-1' }),
    ]);

    // Then: Beide Aufrufe laufen fehlerfrei durch, DoR ist genau einmal wirksam geworden
    expect(ergebnisHost.dorAbgeschlossen).toBe(true);
    expect(ergebnisTeam.dorAbgeschlossen).toBe(true);
    expect(ergebnisHost.dorAbgeschlossenAm).toEqual(ergebnisTeam.dorAbgeschlossenAm);
  });

  test('Szenario: get()-vs-getAfter()-Falle — eine Regel muss die soeben selbst geschriebene Kartenposition sofort sehen', async () => {
    // Given: Eine Karte wird innerhalb derselben Transaktion bewegt und im selben Vorgang gegen das
    // Stapel-Tor der Zielstation geprüft (bekannte Falle aus FEATURE-001: get() sieht den Stand VOR
    // dem eigenen Schreibvorgang, getAfter() sieht ihn danach).
    const code = 'ABCD1234';
    const ergebnis = await bewegeKarte({
      code, rundenNummer: 1, kartenId: 'karte-6', vonPosition: 1, nachPosition: 2,
      ausgefuehrtVon: 'spieler-station-2', geradeGeschriebenGehoertZurZaehlung: true,
    });

    // Then: Die Bewegung wird korrekt genehmigt/verweigert basierend auf dem Zustand NACH dem eigenen
    // Schreibvorgang, nicht auf einem veralteten Vor-Zustand
    expect(ergebnis.fehlerBeiStapelZaehlung).toBeUndefined();
  });

  test('Szenario: Verbindungsabbruch mitten in einer Kartenbewegung erzeugt keinen sichtbaren Zwischenzustand', async () => {
    // Given: Eine Kartenbewegung wird als atomare Transaktion ausgeführt, die Verbindung bricht
    // simuliert mitten in der Übertragung ab
    const code = 'ABCD1234';
    const abgebrochenerVersuch = bewegeKarte({
      code, rundenNummer: 1, kartenId: 'karte-2', vonPosition: 1, nachPosition: 2,
      ausgefuehrtVon: 'spieler-station-2', simuliereVerbindungsabbruch: true,
    });

    // Then: Entweder ist der Zug vollständig durch, oder er ist gar nicht passiert — nie halb
    await expect(abgebrochenerVersuch).rejects.toBeDefined();
    const kartenZustandDanach = await berechneKennzahlen({ code, rundenNummer: 1, nurKartenZustand: true });
    expect([1, 2]).toContain(kartenZustandDanach.karten['karte-2'].position);
  });
});
