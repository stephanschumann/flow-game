/**
 * FEATURE-005 – Phase 5: Robustheit (Wiederbetreten)
 * BDD-Tests (flow-game-bdd, 2026-07-20) für die Akzeptanzkriterien 1-3, 6-8 und
 * 16 aus der freigegebenen Spec in Backlog.md ("### FEATURE-005").
 *
 * WICHTIG – bewusst RED, keine Implementierung vorhanden: Diese Datei ruft
 * `src/game/teilnehmerSession.js` auf. Dieses Modul existiert noch NICHT –
 * das ist beabsichtigt (Red im Red-Green-Refactor-Sinn, siehe
 * flow-game-bdd-Skill Schritt 5). Der erwartete Fehlschlag ist
 * "Cannot find module '../src/game/teilnehmerSession'", NICHT ein Syntax-
 * oder Emulator-Setup-Fehler. flow-game-impl legt dieses Modul samt der
 * identischen Kopie unter public/js/game/teilnehmerSession.js an (Projekt-
 * Konvention, siehe joinGame.js/hostSession.js).
 *
 * Erwartete API (Vorschlag, analog zum bestehenden Host-Modell in
 * src/game/hostSession.js – finale Signatur entscheidet flow-game-impl):
 *
 *   restoreTeilnehmerSession({ code, rolle, anzeigename, uid }, db)
 *     -> ruft intern joinGame() mit den lokal gespeicherten Werten auf
 *        (nutzt die bestehende Idempotenz aus src/game/joinGame.js) und
 *        gibt zusätzlich `warRejoin: true/false` zurück, damit der Client
 *        zwischen "gerade neu beigetreten" und "wiederbetreten" unter-
 *        scheiden kann (z. B. für eine "Willkommen zurück"-Anzeige).
 *
 *   registriereAktivenTab({ code, uid, tabId }, db)
 *     -> speichert, welcher Tab/welches Fenster gerade als "aktiv" für
 *        diese uid gilt (AK16: neuester Tab gewinnt, geklärte Frage 2).
 *        Jeder Aufruf überschreibt den vorherigen aktiven Tab.
 *
 *   istAktiverTab({ code, uid, tabId }, db)
 *     -> prüft, ob genau dieser tabId aktuell als aktiver Tab hinterlegt
 *        ist. Ein älterer Tab, der nicht mehr aktiv ist, kann sich damit
 *        selbst als getrennt/inaktiv erkennen (AK16).
 *
 * Framework: Jest + @firebase/rules-unit-testing (Firestore-Emulator),
 * gleiches Muster wie tests/game-rooms.logic.test.js. Offenes Testregelwerk,
 * da hier ausschliesslich Anwendungslogik geprüft wird, nicht firestore.rules.
 */

const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');

const PROJECT_ID = 'flow-game-19f01-test-rejoin';

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
// Bewusst RED: dieses Modul existiert noch nicht (siehe Kommentar oben).
const { restoreTeilnehmerSession, registriereAktivenTab, istAktiverTab } = require('../src/game/teilnehmerSession');

let testEnv;
let db;

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

describe('Szenario: Automatischer Rejoin für Spielende nach Neuladen (AK1, AK2, AK3)', () => {
  test('Gegeben eine spielende Person hat bereits eine Station, wenn restoreTeilnehmerSession mit denselben gespeicherten Werten (Code, Rolle, Anzeigename, uid) erneut aufgerufen wird, dann bekommt sie exakt dieselbe Station und Rolle zurück, ohne erneute Eingabe', async () => {
    const { code } = await createGame({ hostAnzeigename: 'Host A', uid: neueUid('host') }, db);
    const spielerUid = neueUid();
    const ersterBeitritt = await joinGame(
      { code, anzeigename: 'Rejoin-Spielerin', rolle: 'spielende', uid: spielerUid },
      db
    );

    const rejoin = await restoreTeilnehmerSession(
      { code, rolle: 'spielende', anzeigename: 'Rejoin-Spielerin', uid: spielerUid },
      db
    );

    expect(rejoin.rolle).toBe('spielende');
    expect(rejoin.station).toBe(ersterBeitritt.station);
  });

  test('Gegeben ein automatischer Rejoin ruft intern joinGame() erneut mit derselben uid auf (AK3, Regressionstest FEATURE-002), dann entsteht kein zweites Teilnehmenden-Dokument und keine doppelte Stationszuweisung', async () => {
    const { code } = await createGame({ hostAnzeigename: 'Host A', uid: neueUid('host') }, db);
    const spielerUid = neueUid();
    await joinGame({ code, anzeigename: 'Rejoin-Spielerin', rolle: 'spielende', uid: spielerUid }, db);

    await restoreTeilnehmerSession(
      { code, rolle: 'spielende', anzeigename: 'Rejoin-Spielerin', uid: spielerUid },
      db
    );
    await restoreTeilnehmerSession(
      { code, rolle: 'spielende', anzeigename: 'Rejoin-Spielerin', uid: spielerUid },
      db
    );

    const spielSnap = await db.doc(`spiele/${code}`).get();
    const belegteStationen = spielSnap.data().belegteStationen || {};
    const eintraegeFuerSpieler = Object.entries(belegteStationen).filter(([, uid]) => uid === spielerUid);
    expect(eintraegeFuerSpieler).toHaveLength(1);
  });
});

describe('Szenario: Automatischer Rejoin für Beobachtende nach Neuladen (AK1, AK2)', () => {
  test('Gegeben eine beobachtende Person ist bereits beigetreten, wenn restoreTeilnehmerSession erneut aufgerufen wird, dann bleibt sie Beobachtende ohne Station, nie eine neu zugewiesene Rolle', async () => {
    const { code } = await createGame({ hostAnzeigename: 'Host A', uid: neueUid('host') }, db);
    const beobachterUid = neueUid();
    await joinGame({ code, anzeigename: 'Rejoin-Beo', rolle: 'beobachtende', uid: beobachterUid }, db);

    const rejoin = await restoreTeilnehmerSession(
      { code, rolle: 'beobachtende', anzeigename: 'Rejoin-Beo', uid: beobachterUid },
      db
    );

    expect(rejoin.rolle).toBe('beobachtende');
    expect(rejoin.station).toBeUndefined();
  });
});

describe('Szenario: Rejoin kennzeichnet sich selbst als Wiederbetreten, nicht als Erstbeitritt', () => {
  test('Gegeben eine Person tritt zum ERSTEN Mal über restoreTeilnehmerSession bei (noch kein Teilnehmer-Dokument), dann meldet die Funktion warRejoin: false; gegeben sie ruft danach erneut mit denselben Werten auf, dann meldet sie warRejoin: true', async () => {
    const { code } = await createGame({ hostAnzeigename: 'Host A', uid: neueUid('host') }, db);
    const spielerUid = neueUid();

    const ersterAufruf = await restoreTeilnehmerSession(
      { code, rolle: 'spielende', anzeigename: 'Erstbeitritt', uid: spielerUid },
      db
    );
    expect(ersterAufruf.warRejoin).toBe(false);

    const zweiterAufruf = await restoreTeilnehmerSession(
      { code, rolle: 'spielende', anzeigename: 'Erstbeitritt', uid: spielerUid },
      db
    );
    expect(zweiterAufruf.warRejoin).toBe(true);
    expect(zweiterAufruf.station).toBe(ersterAufruf.station);
  });
});

describe('Szenario: Host in Spiel A + Spielende in Spiel B gleichzeitig (AK8, Pre-Mortem-Risiko 2)', () => {
  test('Gegeben dieselbe Person ist Host in Spiel A und Spielende in Spiel B, wenn beide Sitzungen (Host-Rejoin für A, Teilnehmenden-Rejoin für B) beim Laden geprüft werden, dann bleiben beide Zustände unabhängig korrekt bestehen', async () => {
    const gemeinsameUid = neueUid('doppelrolle');

    const spielA = await createGame({ hostAnzeigename: 'Host A', uid: neueUid('host-a') }, db);
    const spielB = await createGame({ hostAnzeigename: 'Host B', uid: neueUid('host-b') }, db);

    // Dieselbe Person ist Host in Spiel A (eigene hostSessionKennung von A)
    // UND Spielende in Spiel B – beide Rollen dürfen sich nicht vermischen.
    const hostWiederhergestellt = await restoreHostSession(
      { code: spielA.code, hostSessionKennung: spielA.hostSessionKennung, uid: gemeinsameUid },
      db
    );
    const teilnehmerBeitritt = await joinGame(
      { code: spielB.code, anzeigename: 'Doppelrolle', rolle: 'spielende', uid: gemeinsameUid },
      db
    );
    const teilnehmerRejoin = await restoreTeilnehmerSession(
      { code: spielB.code, rolle: 'spielende', anzeigename: 'Doppelrolle', uid: gemeinsameUid },
      db
    );

    expect(hostWiederhergestellt.rolle).toBe('host');
    expect(hostWiederhergestellt.spielCode).toBe(spielA.code);
    expect(teilnehmerRejoin.rolle).toBe('spielende');
    expect(teilnehmerRejoin.station).toBe(teilnehmerBeitritt.station);
  });
});

describe('Szenario: Gleichzeitiges Wiederbetreten zweier unterschiedlicher Personen (AK7 im Rejoin-Kontext)', () => {
  test('Gegeben zwei verschiedene Personen haben bereits unterschiedliche Stationen, wenn beide fast gleichzeitig einen Rejoin auslösen, dann behält jede Person ausschliesslich ihre eigene Station – nie werden Stationen vertauscht oder doppelt vergeben', async () => {
    const { code } = await createGame({ hostAnzeigename: 'Host A', uid: neueUid('host') }, db);
    const uidPersonA = neueUid();
    const uidPersonB = neueUid();
    const beitrittA = await joinGame({ code, anzeigename: 'Person A', rolle: 'spielende', uid: uidPersonA }, db);
    const beitrittB = await joinGame({ code, anzeigename: 'Person B', rolle: 'spielende', uid: uidPersonB }, db);

    const [rejoinA, rejoinB] = await Promise.all([
      restoreTeilnehmerSession({ code, rolle: 'spielende', anzeigename: 'Person A', uid: uidPersonA }, db),
      restoreTeilnehmerSession({ code, rolle: 'spielende', anzeigename: 'Person B', uid: uidPersonB }, db),
    ]);

    expect(rejoinA.station).toBe(beitrittA.station);
    expect(rejoinB.station).toBe(beitrittB.station);
    expect(rejoinA.station).not.toBe(rejoinB.station);
  });
});

describe('Szenario: Zwei gleichzeitig offene Tabs derselben Person – neuester Tab gewinnt (AK16, geklärte Frage 2)', () => {
  test('Gegeben Tab A registriert sich zuerst als aktiver Tab für eine uid, wenn Tab B sich danach für dieselbe uid/dasselbe Spiel registriert, dann gilt Tab B als aktiv und Tab A gilt nicht mehr als aktiv', async () => {
    const { code } = await createGame({ hostAnzeigename: 'Host A', uid: neueUid('host') }, db);
    const spielerUid = neueUid();
    await joinGame({ code, anzeigename: 'Zwei-Tabs-Person', rolle: 'spielende', uid: spielerUid }, db);

    await registriereAktivenTab({ code, uid: spielerUid, tabId: 'tab-A' }, db);
    await registriereAktivenTab({ code, uid: spielerUid, tabId: 'tab-B' }, db);

    const tabAAktiv = await istAktiverTab({ code, uid: spielerUid, tabId: 'tab-A' }, db);
    const tabBAktiv = await istAktiverTab({ code, uid: spielerUid, tabId: 'tab-B' }, db);

    expect(tabAAktiv).toBe(false);
    expect(tabBAktiv).toBe(true);
  });

  test('Gegeben nur ein einziger Tab hat sich je registriert, wenn dieser Tab seinen eigenen Status prüft, dann gilt er als aktiv (keine aktive Blockade eines einzelnen Tabs, geklärte Frage 2)', async () => {
    const { code } = await createGame({ hostAnzeigename: 'Host A', uid: neueUid('host') }, db);
    const spielerUid = neueUid();
    await joinGame({ code, anzeigename: 'Ein-Tab-Person', rolle: 'spielende', uid: spielerUid }, db);

    await registriereAktivenTab({ code, uid: spielerUid, tabId: 'einziger-tab' }, db);
    const aktiv = await istAktiverTab({ code, uid: spielerUid, tabId: 'einziger-tab' }, db);

    expect(aktiv).toBe(true);
  });
});
