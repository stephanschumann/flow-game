/**
 * FEATURE-002 – Phase 2: Spielfeld + Runden 1–3
 * Schliesst die im Backlog dokumentierte Testlücke ("Bekannte Lücke zwischen
 * Akzeptanzkriterien und geschriebenen Tests", Pre-Mortem-Risiko 3):
 * `tests/game-round.logic.test.js` übergibt `pruefeStapelTor()` die Anzahl
 * bereits angekommener Karten als vorgegebenen Parameter (reine
 * Schwellen-Arithmetik). Diese Datei prüft stattdessen die ECHTE Zählung
 * gegen echte, im Firestore-Emulator geseedete Karten-Dokumente – inklusive
 * des Falls, der das eigentliche Komplexitätsrisiko ausmacht: die getrennte
 * Zählung der zwei Dreierstapel in Runde 2.
 *
 * Läuft, wie tests/game-rooms.logic.test.js (FEATURE-001), mit einem offenen
 * Testregelwerk gegen den Emulator – hier geht es NICHT um die
 * Sicherheitsregeln selbst (dafür ist tests/game-round.security.rules.test.js
 * zuständig, das GENAU DIESELBE Zählung zusätzlich nochmal serverautoritativ
 * in firestore.rules real durchspielt), sondern ausschliesslich um die
 * Zähl-Funktion aus src/game/stapelTor.js.
 *
 * Framework: Jest + @firebase/rules-unit-testing (Firestore-Emulator).
 */

const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const { zaehleAngekommeneKarten, zaehleAngekommeneKartenAusListe } = require('../src/game/stapelTor');

const PROJECT_ID = 'flow-game-feature-002-stapel-zaehlung-test';

const OFFENES_TESTREGELWERK = `
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /{document=**} {
        allow read, write: if true;
      }
    }
  }
`;

let testEnv;
let db;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: 'localhost',
      port: 8080,
      rules: OFFENES_TESTREGELWERK,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  db = testEnv.unauthenticatedContext().firestore();
});

async function seedeKarten(code, rundenNummer, kartenListe) {
  const batch = db.batch();
  kartenListe.forEach((karte) => {
    const ref = db
      .collection('spiele').doc(code)
      .collection('runden').doc(String(rundenNummer))
      .collection('karten').doc(karte.kartenId);
    const daten = { position: karte.position };
    if (karte.stapel) daten.stapel = karte.stapel;
    batch.set(ref, daten);
  });
  await batch.commit();
}

describe('FEATURE-002: Echte Stapel-Zählung gegen echte Firestore-Dokumente', () => {
  test('Runde 1: zählt korrekt, wie viele der sechs echten Karten-Dokumente an Station 1 stehen', async () => {
    const code = 'ZAEHL001';
    await seedeKarten(code, 1, [
      { kartenId: 'karte-1', position: 1 },
      { kartenId: 'karte-2', position: 1 },
      { kartenId: 'karte-3', position: 1 },
      { kartenId: 'karte-4', position: 1 },
      { kartenId: 'karte-5', position: 1 },
      { kartenId: 'karte-6', position: 0 }, // noch im Auftragseingang
    ]);

    const anzahl = await zaehleAngekommeneKarten({ db, code, rundenNummer: 1, position: 1 });
    expect(anzahl).toBe(5);
  });

  test('Runde 1: alle sechs echten Karten-Dokumente an Station 1 → Zählung ergibt 6', async () => {
    const code = 'ZAEHL002';
    await seedeKarten(code, 1, [
      { kartenId: 'karte-1', position: 1 },
      { kartenId: 'karte-2', position: 1 },
      { kartenId: 'karte-3', position: 1 },
      { kartenId: 'karte-4', position: 1 },
      { kartenId: 'karte-5', position: 1 },
      { kartenId: 'karte-6', position: 1 },
    ]);

    const anzahl = await zaehleAngekommeneKarten({ db, code, rundenNummer: 1, position: 1 });
    expect(anzahl).toBe(6);
  });

  test('Runde 2: zwei Dreierstapel werden über echte Dokumente GETRENNT gezählt (kein gemeinsamer Zähler)', async () => {
    const code = 'ZAEHL003';
    await seedeKarten(code, 2, [
      { kartenId: 'karte-1', position: 1, stapel: 'A' },
      { kartenId: 'karte-2', position: 1, stapel: 'A' },
      { kartenId: 'karte-3', position: 1, stapel: 'A' },
      { kartenId: 'karte-4', position: 1, stapel: 'B' },
      { kartenId: 'karte-5', position: 0, stapel: 'B' },
      { kartenId: 'karte-6', position: 0, stapel: 'B' },
    ]);

    const anzahlA = await zaehleAngekommeneKarten({ db, code, rundenNummer: 2, position: 1, stapel: 'A' });
    const anzahlB = await zaehleAngekommeneKarten({ db, code, rundenNummer: 2, position: 1, stapel: 'B' });

    // Stapel A ist vollständig (3/3) angekommen, Stapel B erst zu 1/3 – eine
    // naive Gesamtsummen-Zählung (4 von 6) würde bei Schwelle 3 fälschlich
    // "beide offen" ergeben, wenn nicht getrennt nach `stapel` gezählt wird.
    expect(anzahlA).toBe(3);
    expect(anzahlB).toBe(1);
  });

  test('Runde 3: eine einzelne echte Karte an einer Station wird korrekt als 1 gezählt', async () => {
    const code = 'ZAEHL004';
    await seedeKarten(code, 3, [
      { kartenId: 'karte-1', position: 1 },
      { kartenId: 'karte-2', position: 0 },
      { kartenId: 'karte-3', position: 0 },
      { kartenId: 'karte-4', position: 0 },
      { kartenId: 'karte-5', position: 0 },
      { kartenId: 'karte-6', position: 0 },
    ]);

    const anzahl = await zaehleAngekommeneKarten({ db, code, rundenNummer: 3, position: 1 });
    expect(anzahl).toBe(1);
  });

  test('Zählung ohne jedes seeded Dokument (leere Unter-Sammlung) ergibt 0, kein Fehler/Absturz', async () => {
    const anzahl = await zaehleAngekommeneKarten({ db, code: 'ZAEHL005', rundenNummer: 1, position: 1 });
    expect(anzahl).toBe(0);
  });
});

describe('FEATURE-002: Reine Zähl-Funktion (Liste statt Firestore-Lesevorgang)', () => {
  test('zaehleAngekommeneKartenAusListe zählt nur exakte Positionstreffer, keine >= -Näherung', async () => {
    const karten = [
      { kartenId: 'karte-1', position: 2 },
      { kartenId: 'karte-2', position: 1 },
      { kartenId: 'karte-3', position: 1 },
    ];
    expect(zaehleAngekommeneKartenAusListe({ karten, position: 1 })).toBe(2);
  });
});
