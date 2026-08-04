/**
 * FEATURE-018 – Spiel auch ohne separaten Gastgeber spielbar (Host kann mitspielen).
 * BDD-Tests (flow-game-bdd, 2026-08-04) für die Akzeptanzkriterien 1, 2, 6, 7, 8
 * aus der freigegebenen Spec in Backlog.md ("### FEATURE-018", Analyse-Spec +
 * Gate 1 – Freigabe durch Stephan, 2026-08-04) sowie die zugehörigen
 * Pre-Mortem-Risiken 1 (Race Condition Stationszuweisung) und die im Testplan-
 * Grundgerüst vorskizzierten Given/When/Then-Fälle 1, 2, 8, 9.
 *
 * Geklärte Fragen, die diese Tests voraussetzen (Gate 1, 2026-08-04):
 *  - Frage 1: Der mitspielende Host belegt eine der FÜNF bestehenden
 *    Stationen (keine zusätzliche, sechste Station) – Option A der Spec.
 *  - Frage 3: "Ich spiele mit" ist nur beim Erstellen wählbar (kein
 *    nachträgliches Umschalten im Scope dieses Tickets).
 *
 * Erwartete neue API (Option A, Empfehlung der Analyse-Spec): createGame()
 * bekommt einen optionalen Parameter `mitspielen` (boolean, Default false).
 * Ist er true, weist dieselbe, bereits bestehende Transaktion der
 * gastgebenden Person zusätzlich eine der fünf Stationen zu (analog zur
 * ersten-freien-Station-Logik aus joinGame()) und aktualisiert
 * belegteStationen im selben Commit (Pre-Mortem-Risiko 1).
 *
 * Prüft die ECHTEN Module src/game/createGame.js, src/game/joinGame.js und
 * src/game/hostSession.js gegen tests/helpers/fakeFirestore.js (echter
 * Firestore-Emulator in dieser Sandbox laut BUGFIX-005-Präzedenzfall durch
 * die Organisations-Egress-Policy blockiert – siehe dortige Begründung).
 * Für die serverseitige Durchsetzung (Sichtbarkeitsregel, bewegungErlaubt())
 * siehe die separate, emulator-gebundene Datei
 * tests/game-feature-018-host-mitspielen.security.rules.test.js.
 *
 * WICHTIG – bewusst RED beim ersten Lauf: createGame() nimmt den Parameter
 * `mitspielen` heute noch gar nicht entgegen und weist der gastgebenden
 * Person nie eine Station zu (Befund 1 der Analyse-Spec). Die mit "NEU"
 * markierten describe-Blöcke unten schlagen deshalb jetzt erwartungsgemäss
 * fehl; die mit "REGRESSION" markierten Blöcke bestätigen bereits heute
 * unverändertes Verhalten und sind bewusst bereits GRÜN.
 *
 * Framework: Jest, reine Funktionslogik mit In-Memory-Fake-Firestore.
 */

const { erzeugeFakeDb } = require('./helpers/fakeFirestore');
const { createGame, STATIONEN } = require('../src/game/createGame');
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

describe('NEU (AK1/AK2, Testplan-Eintrag 1): Host aktiviert "ich spiele mit" beim Erstellen', () => {
  test('Gegeben ein Host erstellt ein neues Spiel und aktiviert "ich spiele mit", wenn die Erstellung abgeschlossen ist, dann hat die gastgebende Person zusätzlich zu rolle="host" eine der fünf Stationen zugewiesen bekommen', async () => {
    const hostUid = neueUid('host');
    const { code } = await createGame(
      { hostAnzeigename: 'Host A', uid: hostUid, mitspielen: true },
      db
    );

    const hostDoc = await db
      .collection('spiele')
      .doc(code)
      .collection('teilnehmende')
      .doc(hostUid)
      .get();

    expect(hostDoc.data().rolle).toBe('host');
    expect(STATIONEN).toContain(hostDoc.data().station);
  });

  test('Gegeben ein Host erstellt ein neues Spiel und aktiviert "ich spiele mit", wenn die Erstellung abgeschlossen ist, dann ist belegteStationen im selben Commit bereits mit der Host-Station vorbelegt (Pre-Mortem-Risiko 1: keine spätere, getrennte Schreiboperation nötig)', async () => {
    const hostUid = neueUid('host');
    const { code } = await createGame(
      { hostAnzeigename: 'Host B', uid: hostUid, mitspielen: true },
      db
    );

    const hostDoc = await db.collection('spiele').doc(code).collection('teilnehmende').doc(hostUid).get();
    const spielDoc = await db.collection('spiele').doc(code).get();

    const hostStation = hostDoc.data().station;
    expect(spielDoc.data().belegteStationen[hostStation]).toBe(hostUid);
  });
});

describe('REGRESSION (AK6, Testplan-Eintrag 2, FEATURE-001): Host erstellt ein Spiel OHNE "ich spiele mit" zu aktivieren', () => {
  test('Gegeben ein Host erstellt ein Spiel ohne den Parameter "mitspielen", wenn die Erstellung abgeschlossen ist, dann bleibt das Verhalten exakt wie bisher: kein station-Feld, belegteStationen bleibt leer', async () => {
    const hostUid = neueUid('host');
    const { code } = await createGame({ hostAnzeigename: 'Host C', uid: hostUid }, db);

    const hostDoc = await db.collection('spiele').doc(code).collection('teilnehmende').doc(hostUid).get();
    const spielDoc = await db.collection('spiele').doc(code).get();

    expect(hostDoc.data().station).toBeUndefined();
    expect(spielDoc.data().belegteStationen).toEqual({});
  });

  test('Gegeben ein Host erstellt ein Spiel ausdrücklich mit mitspielen:false, wenn die Erstellung abgeschlossen ist, dann bleibt das Verhalten ebenfalls exakt wie bisher: kein station-Feld', async () => {
    const hostUid = neueUid('host');
    const { code } = await createGame({ hostAnzeigename: 'Host D', uid: hostUid, mitspielen: false }, db);

    const hostDoc = await db.collection('spiele').doc(code).collection('teilnehmende').doc(hostUid).get();
    expect(hostDoc.data().station).toBeUndefined();
  });
});

describe('NEU (AK2 abhängig von Frage 1, Pre-Mortem-Risiko 1): der mitspielende Host zählt als eine der fünf Stationen, keine Doppelvergabe', () => {
  test('Gegeben ein Host hat "ich spiele mit" aktiviert (belegt eine Station), wenn vier weitere Personen nacheinander als Spielende beitreten, dann bekommen sie automatisch genau die vier verbleibenden freien Stationen – keine davon ist identisch mit der Host-Station', async () => {
    const hostUid = neueUid('host');
    const { code } = await createGame({ hostAnzeigename: 'Host E', uid: hostUid, mitspielen: true }, db);
    const hostDoc = await db.collection('spiele').doc(code).collection('teilnehmende').doc(hostUid).get();
    const hostStation = hostDoc.data().station;

    const vergebeneStationen = [];
    for (let i = 0; i < 4; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const teilnehmer = await joinGame(
        { code, anzeigename: `Spielerin ${i}`, rolle: 'spielende', uid: neueUid() },
        db
      );
      vergebeneStationen.push(teilnehmer.station);
    }

    expect(vergebeneStationen).not.toContain(hostStation);
    expect(new Set(vergebeneStationen).size).toBe(4);
    expect(new Set([...vergebeneStationen, hostStation])).toEqual(new Set(STATIONEN));
  });

  // KORREKTUR (Stephans Entscheidung, Nachtrag 2026-08-04, siehe Backlog.md
  // "#### Nachtrag: Escape-Hatch-Konflikt entschieden"): Dieser Testfall
  // erwartete ursprünglich, dass eine sechste beitretende Person nach
  // Host-Mitspielen automatisch und still auf die Rolle "stationenVoll"
  // umgewandelt wird. Das bestehende, bereits an anderer Stelle dediziert
  // abgesicherte Verhalten (siehe tests/game-rooms.logic.test.js, Szenario
  // "Eigene Rollenwahl, wenn bereits alle fünf Stationen belegt sind", Test
  // ca. Zeile 263) bleibt unverändert bestehen: eine sechste Person, die
  // aktiv "spielende" beitreten möchte, obwohl alle Stationen (inklusive der
  // Host-Station) bereits belegt sind, bekommt stattdessen einen Fehler mit
  // dem sprachneutralen Code SPIEL_VOLL und muss sich bewusst selbst für
  // "beobachtende" entscheiden – keine automatische, stille Rollen-Umwandlung.
  test('Gegeben ein Host hat "ich spiele mit" aktiviert und alle vier übrigen Stationen sind bereits an andere Personen vergeben, wenn eine sechste Person aktiv als "spielende" beitreten möchte, dann wird das mit dem Fehlercode SPIEL_VOLL abgelehnt statt automatisch auf "stationenVoll" umzuschalten (alle fünf Stationen inklusive Host-Station sind belegt)', async () => {
    expect.assertions(1);
    const hostUid = neueUid('host');
    const { code } = await createGame({ hostAnzeigename: 'Host F', uid: hostUid, mitspielen: true }, db);

    for (let i = 0; i < 4; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await joinGame({ code, anzeigename: `Spielerin ${i}`, rolle: 'spielende', uid: neueUid() }, db);
    }

    try {
      await joinGame(
        { code, anzeigename: 'Sechste Person', rolle: 'spielende', uid: neueUid() },
        db
      );
    } catch (fehler) {
      expect(fehler.code).toBe('SPIEL_VOLL');
    }
  });
});

describe('REGRESSION (BUGFIX-005, Testplan-Eintrag 8): restoreHostSession() nach Reload behält eine bereits zugewiesene Station', () => {
  test('Gegeben ein Teilnehmenden-Dokument einer mitspielenden gastgebenden Person hat bereits ein station-Feld, wenn restoreHostSession() nach einem Reload für dieselbe uid aufgerufen wird, dann bleibt die zuvor zugewiesene Station unverändert erhalten (merge:true überschreibt sie nicht)', async () => {
    const hostUid = neueUid('host');
    const { code, hostSessionKennung } = await createGame({ hostAnzeigename: 'Host G', uid: hostUid }, db);

    // Direkt gesetzt (nicht über createGame, das den Parameter noch nicht
    // unterstützt) – bildet den Zielzustand nach, den createGame() nach der
    // Implementierung erzeugen soll, um restoreHostSession() unabhängig
    // davon isoliert zu prüfen (siehe Kopfkommentar).
    await db.collection('spiele').doc(code).collection('teilnehmende').doc(hostUid).set(
      { rolle: 'host', hostKennung: hostSessionKennung, station: 'wareneingang' },
      { merge: true }
    );

    await restoreHostSession({ code, hostSessionKennung, uid: hostUid }, db);

    const nachher = await db.collection('spiele').doc(code).collection('teilnehmende').doc(hostUid).get();
    expect(nachher.data().station).toBe('wareneingang');
    expect(nachher.data().rolle).toBe('host');
  });
});

describe('NEU (Testplan-Eintrag 9, baut auf FEATURE-001-Spiel-Isolation auf): zwei parallele Spiele mit je mitspielendem Host bleiben unabhängig', () => {
  test('Gegeben zwei verschiedene Spiele, jeweils mit mitspielendem Host, wenn beide Spiele erstellt werden, dann bleibt die Stationsbelegung des einen Spiels für das andere Spiel vollständig unsichtbar/unwirksam', async () => {
    const hostUidA = neueUid('host-a');
    const hostUidB = neueUid('host-b');
    const spielA = await createGame({ hostAnzeigename: 'Host A', uid: hostUidA, mitspielen: true }, db);
    const spielB = await createGame({ hostAnzeigename: 'Host B', uid: hostUidB, mitspielen: true }, db);

    const spielDocA = await db.collection('spiele').doc(spielA.code).get();
    const spielDocB = await db.collection('spiele').doc(spielB.code).get();

    const hostDocA = await db.collection('spiele').doc(spielA.code).collection('teilnehmende').doc(hostUidA).get();
    const hostDocB = await db.collection('spiele').doc(spielB.code).collection('teilnehmende').doc(hostUidB).get();

    expect(Object.keys(spielDocA.data().belegteStationen)).toEqual([hostDocA.data().station]);
    expect(Object.keys(spielDocB.data().belegteStationen)).toEqual([hostDocB.data().station]);
    expect(spielDocA.data().belegteStationen).not.toEqual(spielDocB.data().belegteStationen === undefined ? {} : spielDocB.data().belegteStationen);
  });
});
