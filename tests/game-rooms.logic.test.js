/**
 * FEATURE-001 – Phase 1: Spiel-Räume
 * Anwendungslogik-Tests (Beitritts-Code-Erzeugung, Stationszuweisung, Rollenwahl,
 * Anzeigename, Host-Session-Kennung).
 *
 * Framework: Jest. Läuft gegen den Firestore-Emulator, damit die Stationszuweisung
 * als echte, unteilbare Transaktion geprüft werden kann (Pre-Mortem-Risiko 1:
 * Race Condition bei gleichzeitigem Beitritt).
 *
 * Diese Datei prüft AUSSCHLIESSLICH die Anwendungslogik (Transaktionen,
 * Zuweisung), NICHT die Sicherheitsregeln – dafür ist
 * tests/game-rooms.security.rules.test.js zuständig. Deshalb bekommt der
 * Emulator hier bewusst ein offenes Testregelwerk (`allow read, write: if true`)
 * statt der echten firestore.rules.
 *
 * ÄNDERUNG (flow-game-impl, 2026-07-17, mit Stephan abgestimmt – Option B ohne
 * Cloud Function statt Auth-Custom-Claims): Jede Person hat eine eigene,
 * stabile Auth-UID (anonyme Firebase-Authentifizierung pro Browser-Sitzung).
 * `createGame`/`joinGame`/`restoreHostSession` bekommen diese `uid` deshalb
 * jetzt als Parameter mit. Das Teilnehmenden-Dokument des Hosts liegt dadurch
 * unter `teilnehmende/{uid}` statt unter dem ursprünglich angenommenen festen
 * Pfad `teilnehmende/host`. Die fachlichen Given/When/Then-Szenarien selbst
 * sind unverändert.
 *
 * ÄNDERUNG 2 (2026-07-17, nach echtem Browser-Test): hostKennung liegt jetzt
 * in spiele/{code}/geheim/kennung und ist nie client-lesbar (Vertraulichkeit,
 * siehe firestore.rules). restoreHostSession() prüft die Kennung deshalb
 * nicht mehr selbst, sondern verlässt sich auf die Sicherheitsregel
 * (Schreibversuch schlägt bei falscher Kennung fehl). Der Testfall "falsche/
 * fremde Host-Session-Kennung wird abgelehnt" ist deshalb hier NICHT mehr
 * sinnvoll prüfbar (diese Datei läuft mit offenen Regeln, jeder Schreibversuch
 * gelingt) und wurde nach tests/game-rooms.security.rules.test.js verschoben
 * (dort bereits als "ungültige/fremde Host-Kennung ... wird abgelehnt"
 * vorhanden, prüft denselben Sachverhalt direkt gegen die echten Regeln).
 *
 * Module:
 *  - src/game/createGame.js   -> erzeugt Spiel + eindeutigen Beitritts-Code
 *  - src/game/joinGame.js     -> Beitritt per Code, Stationszuweisung/Rollenwahl
 *  - src/game/hostSession.js  -> Host-Session-Kennung speichern/prüfen
 */

const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');

let testEnv;
let db;

const PROJECT_ID = 'flow-game-19f01-test-logic';
const STATIONEN = ['wareneingang', 'kommissionierung', 'packstation', 'versand', 'qualitaetskontrolle'];

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

const { createGame } = require('../src/game/createGame');
const { joinGame } = require('../src/game/joinGame');
const { restoreHostSession } = require('../src/game/hostSession');

let naechsteUid = 0;
function neueUid(praefix = 'uid') {
  naechsteUid += 1;
  return `${praefix}-${naechsteUid}`;
}

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

describe('Szenario: Beitritts-Code-Eindeutigkeit bei gleichzeitiger Spielerstellung', () => {
  test('Gegeben kein Spiel existiert, wenn ein Host ein Spiel erstellt, dann besteht der Code aus 8 Zeichen ohne leicht verwechselbare Zeichen (0/O, 1/I/l)', async () => {
    const { code } = await createGame({ hostAnzeigename: 'Host A', uid: neueUid('host') }, db);
    expect(code).toHaveLength(8);
    expect(code).not.toMatch(/[0O1Il]/);
  });

  test('Gegeben zwei Hosts erstellen zeitgleich je ein Spiel, wenn beide Erstellungen gleichzeitig laufen, dann erhalten beide unterschiedliche, gültige Codes', async () => {
    const [spielA, spielB] = await Promise.all([
      createGame({ hostAnzeigename: 'Host A', uid: neueUid('host') }, db),
      createGame({ hostAnzeigename: 'Host B', uid: neueUid('host') }, db),
    ]);
    expect(spielA.code).not.toEqual(spielB.code);
  });
});

describe('Szenario: Stationszuweisung bei gleichzeitigem Beitritt mehrerer Spielender', () => {
  test('Gegeben ein leeres Spiel, wenn ein Spielender beitritt, dann wird ihm sichtbar eine der fünf Stationen zugewiesen', async () => {
    const { code } = await createGame({ hostAnzeigename: 'Host A', uid: neueUid('host') }, db);
    const teilnehmer = await joinGame({ code, anzeigename: 'Spielerin 1', rolle: 'spielende', uid: neueUid() }, db);
    expect(STATIONEN).toContain(teilnehmer.station);
  });

  test('Gegeben ein leeres Spiel, wenn fünf Spielende nacheinander beitreten, dann erfolgt die Zuweisung automatisch in Beitrittsreihenfolge über alle fünf Stationen', async () => {
    const { code } = await createGame({ hostAnzeigename: 'Host A', uid: neueUid('host') }, db);
    const zugewiesen = [];
    for (let i = 0; i < 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const teilnehmer = await joinGame({ code, anzeigename: `Spielerin ${i}`, rolle: 'spielende', uid: neueUid() }, db);
      zugewiesen.push(teilnehmer.station);
    }
    expect(new Set(zugewiesen).size).toBe(5);
    expect(zugewiesen.sort()).toEqual([...STATIONEN].sort());
  });

  test('Gegeben ein Spiel mit vier freien Stationen, wenn zwei Spielende fast gleichzeitig um dieselbe letzte freie Station konkurrieren, dann bekommt nur einer diese Station und der andere fällt automatisch auf eine andere gültige Rückmeldung zurück (kein Fehler, keine Doppelvergabe)', async () => {
    const { code } = await createGame({ hostAnzeigename: 'Host A', uid: neueUid('host') }, db);
    for (let i = 0; i < 4; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await joinGame({ code, anzeigename: `Vorab-Spieler ${i}`, rolle: 'spielende', uid: neueUid() }, db);
    }
    const [ergebnis1, ergebnis2] = await Promise.all([
      joinGame({ code, anzeigename: 'Wettlauf A', rolle: 'spielende', uid: neueUid() }, db),
      joinGame({ code, anzeigename: 'Wettlauf B', rolle: 'spielende', uid: neueUid() }, db),
    ]);
    const stationen = [ergebnis1, ergebnis2]
      .filter((e) => e.rolle === 'spielende')
      .map((e) => e.station);
    expect(new Set(stationen).size).toBe(stationen.length); // keine doppelte Vergabe
    expect([ergebnis1.rolle, ergebnis2.rolle].filter((r) => r === 'spielende')).toHaveLength(1);
  });
});

describe('Szenario: Eigene Rollenwahl, wenn bereits alle fünf Stationen belegt sind', () => {
  test('Gegeben alle fünf Stationen sind bereits vergeben, wenn eine sechste Person mit dem Code beitreten will, dann wird ihr das vor dem Beitritt angezeigt und sie kann bewusst z. B. als Beobachtende beitreten', async () => {
    const { code } = await createGame({ hostAnzeigename: 'Host A', uid: neueUid('host') }, db);
    for (let i = 0; i < 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await joinGame({ code, anzeigename: `Spielerin ${i}`, rolle: 'spielende', uid: neueUid() }, db);
    }
    const sechste = await joinGame({ code, anzeigename: 'Person 6', rolle: 'beobachtende', uid: neueUid() }, db);
    expect(sechste.rolle).toBe('beobachtende');
    expect(sechste.station).toBeUndefined();
  });

  test('Gegeben alle fünf Stationen sind bereits vergeben, wenn eine sechste Person versucht, ohne bewusste Rollenwahl automatisch als Spielende beizutreten, dann wird das abgelehnt statt automatisch zufällig zugeordnet', async () => {
    const { code } = await createGame({ hostAnzeigename: 'Host A', uid: neueUid('host') }, db);
    for (let i = 0; i < 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await joinGame({ code, anzeigename: `Spielerin ${i}`, rolle: 'spielende', uid: neueUid() }, db);
    }
    await expect(
      joinGame({ code, anzeigename: 'Person 6', rolle: 'spielende', uid: neueUid() }, db)
    ).rejects.toThrow();
  });
});

describe('Szenario: Anzeigename bei Beitritt für Host und Spielende', () => {
  test('Gegeben ein neues Spiel wird erstellt, wenn der Host einen Anzeigenamen angibt, dann ist dieser Name im Teilnehmenden-Dokument des Hosts gespeichert', async () => {
    const hostUid = neueUid('host');
    const { code } = await createGame({ hostAnzeigename: 'Chris', uid: hostUid }, db);
    const hostDoc = await db.doc(`spiele/${code}/teilnehmende/${hostUid}`).get();
    expect(hostDoc.exists).toBe(true);
    expect(hostDoc.data().anzeigename).toBe('Chris');
    expect(hostDoc.data().rolle).toBe('host');
  });

  test('Gegeben ein Spielender tritt bei, wenn er einen Anzeigenamen angibt, dann ist dieser Name für andere im selben Spiel sichtbar', async () => {
    const { code } = await createGame({ hostAnzeigename: 'Host A', uid: neueUid('host') }, db);
    const teilnehmer = await joinGame({ code, anzeigename: 'Robin', rolle: 'spielende', uid: neueUid() }, db);
    expect(teilnehmer.anzeigename).toBe('Robin');
  });
});

describe('Szenario: Beitritt als Beobachterin ohne Schreibrechte auf Spielzüge', () => {
  test('Gegeben ein laufendes Spiel, wenn eine Person bewusst als Beobachtende beitritt, dann bekommt sie keine Station zugewiesen', async () => {
    const { code } = await createGame({ hostAnzeigename: 'Host A', uid: neueUid('host') }, db);
    const beobachterin = await joinGame({ code, anzeigename: 'Beo', rolle: 'beobachtende', uid: neueUid() }, db);
    expect(beobachterin.station).toBeUndefined();
  });
});

describe('Szenario: Ablehnung bei falschem/unbekanntem Code', () => {
  test('Gegeben kein Spiel mit diesem Code existiert, wenn jemand mit einem falschen Code beitreten will, dann wird eine verständliche Fehlermeldung geliefert und kein Beitritt vollzogen', async () => {
    await expect(
      joinGame({ code: 'ZZZZZZZZ', anzeigename: 'Wer auch immer', rolle: 'spielende', uid: neueUid() }, db)
    ).rejects.toThrow(/code/i);
  });
});

describe('Szenario: Host bekommt nach eigenem Neuladen die Moderationsrechte zurück', () => {
  test('Gegeben ein Host hat ein Spiel erstellt und seine Host-Session-Kennung lokal gespeichert, wenn er (ggf. mit neuer Auth-Sitzung) nach Neuladen dieselbe Kennung vorlegt, dann bekommt er die Moderationsrechte am selben Spiel zurück', async () => {
    const { code, hostSessionKennung } = await createGame({ hostAnzeigename: 'Host A', uid: neueUid('host') }, db);
    const neueSitzungUid = neueUid('host-neu');
    const wiederhergestellt = await restoreHostSession(
      { code, hostSessionKennung, uid: neueSitzungUid },
      db
    );
    expect(wiederhergestellt.rolle).toBe('host');
    expect(wiederhergestellt.spielCode).toBe(code);
  });

  // "Falsche/fremde Host-Session-Kennung wird abgelehnt" ist hier absichtlich
  // NICHT mehr enthalten (siehe Kommentar am Dateianfang, ÄNDERUNG 2) – geprüft
  // wird das jetzt in tests/game-rooms.security.rules.test.js gegen die echten
  // Regeln, da restoreHostSession() die Kennung nicht mehr selbst prüft.
});

describe('Szenario: Verwaistes Spiel nach 24 Stunden Inaktivität nicht mehr erreichbar', () => {
  test('Gegeben ein Spiel ohne Aktivität seit mehr als 24 Stunden, wenn jemand mit dessen Code beitreten will, dann wird der Beitritt abgelehnt, weil der Code nicht mehr gültig ist', async () => {
    const { code } = await createGame({ hostAnzeigename: 'Host A', uid: neueUid('host') }, db);
    await db.doc(`spiele/${code}`).update({
      letzteAktivitaet: Date.now() - 25 * 60 * 60 * 1000,
    });
    await expect(
      joinGame({ code, anzeigename: 'Zu spät', rolle: 'spielende', uid: neueUid() }, db)
    ).rejects.toThrow();
  });
});