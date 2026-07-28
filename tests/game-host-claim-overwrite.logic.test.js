/**
 * BUGFIX-005 – Beitreten vergibt fälschlich Gastgeber-Rolle statt
 * Mitspieler-Rolle.
 * BDD-Tests (flow-game-bdd, 2026-07-28) für die freigegebene Spec in
 * Backlog.md ("### BUGFIX-005"), Akzeptanzkriterien 1, 3, 4, 5, 6, 8 sowie
 * die Freigabe-Entscheidung 1 (clientseitige Sequenz-Korrektur, Option A).
 *
 * Prüft die ECHTEN Module src/game/hostSession.js, src/game/joinGame.js und
 * src/game/createGame.js gegen tests/helpers/fakeFirestore.js (siehe dortige
 * Begründung: der echte Firestore-Emulator ist in dieser Sandbox durch die
 * Organisations-Egress-Policy blockiert). Für die serverseitige Härtung in
 * firestore.rules selbst (Freigabe-Entscheidung 1, Option B) siehe die
 * separate, emulator-gebundene Datei
 * tests/game-host-claim-overwrite.security.rules.test.js.
 *
 * WICHTIG – bewusst RED: Die ersten beiden describe-Blöcke unten schlagen
 * JETZT tatsächlich fehl (echte Assertion-Fehlschläge, kein Modul-/
 * Syntaxfehler), weil restoreHostSession() (src/game/hostSession.js, Zeile
 * 33-46) heute unbedingt per `.set({ rolle: 'host', ... }, { merge: true })`
 * schreibt – unabhängig vom bisherigen Inhalt des Zieldokuments – und
 * joinGame() (src/game/joinGame.js, Zeile 126-134) ein bereits bestehendes
 * Teilnehmenden-Dokument JEDER Rolle unverändert zurückgibt, auch wenn die
 * gerade aufgerufene, bewusste Aktion eine andere Rolle verlangt.
 *
 * Framework: Jest, reine Funktionslogik mit In-Memory-Fake-Firestore – kein
 * Firestore-Emulator nötig.
 */

const { erzeugeFakeDb } = require('./helpers/fakeFirestore');
const { createGame } = require('../src/game/createGame');
const { joinGame } = require('../src/game/joinGame');
const { restoreHostSession } = require('../src/game/hostSession');

let db;
let naechsteUid = 0;
function neueUid(praefix = 'uid') {
  naechsteUid += 1;
  return `${praefix}-${naechsteUid}`;
}

beforeEach(() => {
  db = erzeugeFakeDb();
});

describe('Kernszenario (AK6): eine spätere, bewusste Beitritts-Handlung darf nicht vom vorangegangenen automatischen Hintergrundvorgang überstimmt werden', () => {
  test('Gegeben restoreHostSession() hat für diese uid bereits ein Teilnehmenden-Dokument mit rolle="host" angelegt (automatischer Hintergrundvorgang beim Laden), wenn dieselbe Person danach bewusst über das Beitritts-Formular "spielende" für DASSELBE Spiel wählt und joinGame() aufgerufen wird, dann entspricht das Ergebnis der bewussten Handlung (rolle="spielende" mit eigener Station), nicht der automatisch vergebenen Host-Rolle', async () => {
    const hostUid = neueUid('urspruenglicher-host');
    const { code, hostSessionKennung } = await createGame(
      { hostAnzeigename: 'Ursprünglicher Host', uid: hostUid },
      db
    );

    // Dieselbe Person (gleiche uid) hat gleichzeitig ein gültiges
    // Host-Geheimnis für dieses Spiel im Browser (z. B. weil sie es selbst
    // erstellt hatte) UND möchte jetzt bewusst als Mitspielende beitreten.
    await restoreHostSession({ code, hostSessionKennung, uid: hostUid }, db);

    const ergebnis = await joinGame(
      { code, anzeigename: 'Ursprünglicher Host', rolle: 'spielende', uid: hostUid },
      db
    );

    expect(ergebnis.rolle).toBe('spielende');
    expect(ergebnis.station).toBeTruthy();
  });
});

describe('Absicherung (Freigabe-Entscheidung 1 / Option A, zweiter Satz): der automatische Host-Wiederherstellungsversuch darf ein bereits bestehendes, andersrolliges Teilnehmenden-Dokument nicht überschreiben', () => {
  test('Gegeben ein Teilnehmenden-Dokument dieser uid existiert bereits mit rolle="spielende" (durch einen abgeschlossenen, bewussten Beitritt), wenn restoreHostSession() für dasselbe Spiel und dieselbe uid mit einer gültigen Host-Kennung aufgerufen wird, dann bleibt das Dokument bei rolle="spielende" (wird NICHT auf "host" überschrieben)', async () => {
    const hostUid = neueUid('host');
    const { code, hostSessionKennung } = await createGame({ hostAnzeigename: 'Host', uid: hostUid }, db);

    const spielerUid = neueUid('spieler');
    const beitritt = await joinGame(
      { code, anzeigename: 'Bewusst beigetretene Person', rolle: 'spielende', uid: spielerUid },
      db
    );
    expect(beitritt.rolle).toBe('spielende');

    // Simuliert: dieselbe uid hat (z. B. durch ein Relikt aus einem anderen
    // Kontext) ebenfalls ein gültiges Host-Geheimnis für GENAU dieses Spiel
    // und ein automatischer Hintergrundvorgang versucht, sie zum Host zu
    // erklären, NACHDEM sie bereits bewusst als Mitspielende beigetreten ist.
    await restoreHostSession({ code, hostSessionKennung, uid: spielerUid }, db).catch(() => {});

    const nachher = await db
      .collection('spiele')
      .doc(code)
      .collection('teilnehmende')
      .doc(spielerUid)
      .get();

    expect(nachher.data().rolle).toBe('spielende');
    expect(nachher.data().station).toBe(beitritt.station);
  });
});

describe('Regressionstest FEATURE-001 (AK3): der echte Host bekommt nach eigenem Neuladen weiterhin zuverlässig seine Moderationsrolle zurück', () => {
  test('Gegeben ein Host hat sein Spiel erstellt, wenn restoreHostSession() mit der korrekten Host-Kennung für dieselbe uid erneut aufgerufen wird (eigenes Neuladen), dann bekommt er weiterhin rolle="host" zurück', async () => {
    const hostUid = neueUid('host');
    const { code, hostSessionKennung } = await createGame({ hostAnzeigename: 'Host A', uid: hostUid }, db);

    const ergebnis = await restoreHostSession({ code, hostSessionKennung, uid: hostUid }, db);

    expect(ergebnis.rolle).toBe('host');
    expect(ergebnis.spielCode).toBe(code);
  });
});

describe('Regressionstest FEATURE-005 (AK4, sinngemäß über joinGame()): eine bereits beigetretene Spielende bekommt beim Wiederbetreten weiterhin zuverlässig ihre ursprüngliche Station zurück', () => {
  test('Gegeben eine spielende Person hat bereits eine Station, wenn joinGame() mit denselben gespeicherten Werten (Code, Rolle, Anzeigename, uid) erneut aufgerufen wird, dann bekommt sie exakt dieselbe Station und Rolle zurück', async () => {
    const hostUid = neueUid('host');
    const { code } = await createGame({ hostAnzeigename: 'Host A', uid: hostUid }, db);
    const spielerUid = neueUid('spieler');

    const ersterBeitritt = await joinGame(
      { code, anzeigename: 'Rejoin-Spielerin', rolle: 'spielende', uid: spielerUid },
      db
    );
    const rejoin = await joinGame(
      { code, anzeigename: 'Rejoin-Spielerin', rolle: 'spielende', uid: spielerUid },
      db
    );

    expect(rejoin.rolle).toBe('spielende');
    expect(rejoin.station).toBe(ersterBeitritt.station);
  });
});

describe('Regressionstest FEATURE-002 (AK5): mehrfaches, kurz aufeinanderfolgendes Beitreten derselben Person bleibt bei genau einer Station', () => {
  test('Gegeben dieselbe Person klickt zweimal hintereinander "Beitreten" für denselben Code, wenn beide Aufrufe verarbeitet werden, dann bleibt es bei genau einer Station, keine zweite Zuweisung', async () => {
    const hostUid = neueUid('host');
    const { code } = await createGame({ hostAnzeigename: 'Host A', uid: hostUid }, db);
    const spielerUid = neueUid('doppel-klick');

    const [ersterAufruf, zweiterAufruf] = await Promise.all([
      joinGame({ code, anzeigename: 'Doppel-Klick-Person', rolle: 'spielende', uid: spielerUid }, db),
      joinGame({ code, anzeigename: 'Doppel-Klick-Person', rolle: 'spielende', uid: spielerUid }, db),
    ]);

    expect(ersterAufruf.station).toBe(zweiterAufruf.station);

    const dokument = await db
      .collection('spiele')
      .doc(code)
      .collection('teilnehmende')
      .doc(spielerUid)
      .get();
    expect(dokument.data().station).toBe(ersterAufruf.station);
  });
});

describe('Regressionstest / Beleg der Root-Cause-Verifikation: getrennte Spiele bleiben unabhängig (Hypothese 2 – Race Condition auf DEMSELBEN Dokument tritt für das real gemeldete Symptom nicht auf)', () => {
  test('Gegeben restoreHostSession() hat für Spiel A bereits ein Host-Dokument geschrieben, wenn joinGame() für ein komplett anderes Spiel B mit derselben uid aufgerufen wird, dann bekommt die Person in Spiel B eine ganz normale, eigene Station – Spiel A bleibt davon unberührt (getrennte Firestore-Dokumente, kein Überschreib-Konflikt möglich)', async () => {
    const uid = neueUid('gleiche-person');

    const spielA = await createGame({ hostAnzeigename: 'Host A', uid: neueUid('anderer-host-a') }, db);
    await restoreHostSession(
      { code: spielA.code, hostSessionKennung: spielA.hostSessionKennung, uid },
      db
    );

    const spielB = await createGame({ hostAnzeigename: 'Host B', uid: neueUid('anderer-host-b') }, db);
    const beitrittB = await joinGame(
      { code: spielB.code, anzeigename: 'Neu beitretende Person', rolle: 'spielende', uid },
      db
    );

    expect(beitrittB.rolle).toBe('spielende');
    expect(beitrittB.station).toBeTruthy();

    const dokumentA = await db
      .collection('spiele')
      .doc(spielA.code)
      .collection('teilnehmende')
      .doc(uid)
      .get();
    expect(dokumentA.data().rolle).toBe('host');
  });
});

describe('Regressionstest AK8: reguläre fachliche Beitritts-Fehler bleiben unverändert', () => {
  test('Gegeben ein ungültiger Spiel-Code, wenn joinGame() aufgerufen wird, dann wird weiterhin der unveränderte Fehlercode UNGUELTIGER_CODE geworfen', async () => {
    await expect(
      joinGame({ code: 'NICHTVORHANDEN', anzeigename: 'Person', rolle: 'spielende', uid: neueUid() }, db)
    ).rejects.toMatchObject({ code: 'UNGUELTIGER_CODE' });
  });
});
