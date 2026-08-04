/**
 * FEATURE-018 – Spiel auch ohne separaten Gastgeber spielbar (Host kann mitspielen).
 * Sicherheitsregel-Tests (Firestore Security Rules) über den Firebase Emulator.
 * BDD-Tests (flow-game-bdd, 2026-08-04) für AK3, AK4, AK5, AK6 sowie die
 * Fundstellen-Sweep-Befunde 2/3 der freigegebenen Analyse-Spec (Gate 1,
 * 2026-08-04, Frage 4 zugestimmt: gezielte Lockerung der Host-Sichtbarkeits-
 * regel).
 *
 * Zentrale Befunde der Spec, die diese Tests voraussetzen:
 *  - bewegungErlaubt() (firestore.rules) prüft ausschliesslich das
 *    station-Feld der bewegenden Person, NICHT rolle – ist also bereits
 *    heute rollenunabhängig (Befund 2). Ein mitspielender Host mit
 *    station-Feld dürfte schon HEUTE, ohne jede Regeländerung, an seiner
 *    Station Karten bewegen.
 *  - Die Leseregel für teilnehmende/{uid} verbirgt heute JEDES Dokument mit
 *    rolle=='host' vor allen anderen Teilnehmenden, unabhängig davon, ob
 *    ein station-Feld gesetzt ist (Befund 3) – das ist der eigentliche
 *    Blocker für AK3 (Sichtbarkeit) und muss noch gelockert werden.
 *  - `station` liegt auf teilnehmende/{uid} NACH der bestehenden, generischen
 *    Migration (public/js/game/kartenBewegung.js, stelleEigeneStationsnummerSicher())
 *    als NUMERISCHER Wert 1-5 vor (nicht als Stationsname-String) – dieselbe
 *    Konvention wie tests/game-round.security.rules.test.js. Diese Migration
 *    ist bereits generisch (kein rolle-Check) und braucht für FEATURE-018
 *    keine Änderung.
 *
 * WICHTIG – bewusst RED beim ersten Lauf für die mit "NEU" markierten
 * Blöcke: die Leseregel wurde noch nicht gelockert, ein mitspielender Host
 * bleibt für andere Teilnehmende weiterhin unsichtbar. Die mit
 * "REGRESSION"/"BEREITS ERFÜLLT" markierten Blöcke bestätigen bereits
 * heute korrektes bzw. unverändertes Verhalten (Befund 2, klassischer Host).
 *
 * Diese Datei seedet Testdaten direkt über withSecurityRulesDisabled (bewusst
 * UNABHÄNGIG von createGame()/joinGame(), die den neuen `mitspielen`-
 * Parameter noch nicht unterstützen – siehe
 * tests/game-feature-018-host-mitspielen.logic.test.js für die Tests der
 * eigentlichen Anwendungslogik) und prüft ausschliesslich, was die
 * firestore.rules-Regeln selbst für einen Host MIT station-Feld erlauben
 * bzw. verbieten.
 *
 * Framework: Jest + @firebase/rules-unit-testing (Firestore-Emulator), exakt
 * dasselbe Testmuster wie tests/game-round.security.rules.test.js.
 * Voraussetzung zum Ausführen: `firebase emulators:exec --only firestore
 * "jest tests/game-feature-018-host-mitspielen.security.rules.test.js"`.
 * TRANSPARENT DOKUMENTIERT (identischer, bereits mehrfach bestätigter Befund
 * wie BUGFIX-005/FEATURE-008, siehe tests/helpers/fakeFirestore.js-
 * Kopfkommentar): der Firestore-Emulator-JAR-Download ist in dieser
 * Cloud-Sandbox durch die Organisations-Egress-Policy blockiert – diese
 * Datei konnte deshalb in der Sandbox nicht tatsächlich ausgeführt werden
 * (weder rot noch grün beobachtet) und braucht Stephans lokalen Testlauf.
 */

const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require('@firebase/rules-unit-testing');
const {
  doc, setDoc, updateDoc, serverTimestamp, getDoc,
} = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'flow-game-feature-018-test';
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

/**
 * Legt ein Spiel mit einem Host an – wahlweise MITSPIELEND (eigene
 * numerische Station 1-5, kein hostKennung-Feld auf dem Teilnehmenden-
 * Dokument mehr, siehe Option A der Spec) oder KLASSISCH (kein
 * station-Feld) – plus einer weiteren spielenden Person und Runde 1 mit
 * sechs Karten im Auftragseingang (Position 0), identisches Grundmuster wie
 * tests/game-round.security.rules.test.js#seedGame().
 */
async function seedGame({
  code = 'ABCD1234',
  hostUid = 'host-1',
  hostMitStation = null, // null = klassischer Host, 1-5 = mitspielender Host
} = {}) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, `spiele/${code}`), {
      erstelltAm: Date.now(),
      letzteAktivitaet: Date.now(),
      aktuelleRunde: 1,
      belegteStationen: hostMitStation ? { [hostMitStation]: hostUid, 2: 'spieler-station-2' } : { 2: 'spieler-station-2' },
    });
    await setDoc(doc(db, `spiele/${code}/geheim/kennung`), { hostKennung: 'geheimes-host-secret' });

    const hostDaten = hostMitStation
      ? { rolle: 'host', anzeigename: 'Mitspielender Host', station: hostMitStation }
      : { rolle: 'host', anzeigename: 'Klassischer Host' };

    const teilnehmende = [
      { uid: hostUid, daten: hostDaten },
      { uid: 'spieler-station-2', daten: { rolle: 'spielende', anzeigename: 'Spielerin 2', station: 2 } },
    ];
    for (const t of teilnehmende) {
      await setDoc(doc(db, `spiele/${code}/teilnehmende/${t.uid}`), t.daten);
    }

    await setDoc(doc(db, `spiele/${code}/runden/1`), {
      phase: 'dor_abgeschlossen',
      dorAbgeschlossen: true,
      durchlaufzeitStart: Date.now(),
      bearbeitungszeitStart: null,
      durchlaufzeitEnde: null,
    });

    for (let i = 1; i <= 6; i += 1) {
      await setDoc(doc(db, `spiele/${code}/runden/1/karten/karte-${i}`), {
        position: 0,
        letzteBewegungVon: null,
        letzteBewegungAm: null,
      });
    }
  });
  return code;
}

describe('NEU (AK3, Fundstellen-Sweep Befund 3, Frage 4 zugestimmt): Sichtbarkeit der mitspielenden gastgebenden Person', () => {
  test('Gegeben eine mitspielende gastgebende Person hat eine Station, wenn eine andere Person deren Teilnehmenden-Dokument liest, dann wird das erlaubt (Frage 4: Sichtbarkeitsregel gezielt gelockert)', async () => {
    const code = await seedGame({ hostMitStation: 1 });
    const spielerKontext = testEnv.authenticatedContext('spieler-station-2');
    await assertSucceeds(
      getDoc(doc(spielerKontext.firestore(), `spiele/${code}/teilnehmende/host-1`))
    );
  });
});

describe('REGRESSION (FEATURE-001, Fundstellen-Sweep Befund 3): eine NICHT mitspielende, klassische gastgebende Person bleibt weiterhin unsichtbar', () => {
  test('Gegeben eine klassische, nicht mitspielende gastgebende Person (kein station-Feld), wenn eine andere Person deren Teilnehmenden-Dokument liest, dann bleibt es abgelehnt (unverändertes Verhalten, AK6)', async () => {
    const code = await seedGame({ hostMitStation: null });
    const spielerKontext = testEnv.authenticatedContext('spieler-station-2');
    await assertFails(
      getDoc(doc(spielerKontext.firestore(), `spiele/${code}/teilnehmende/host-1`))
    );
  });
});

describe('BEREITS ERFÜLLT (AK4, Befund 2 der Spec): bewegungErlaubt() ist bereits heute rollenunabhängig', () => {
  test('Gegeben eine mitspielende gastgebende Person steht an ihrer eigenen Station (1), wenn sie eine Karte vom Auftragseingang (Position 0) zu ihrer Station (Position 1) bewegt, dann wird es erlaubt – wie bei jeder anderen mitspielenden Person, weil bewegungErlaubt() ausschliesslich das station-Feld prüft, nicht rolle', async () => {
    const code = await seedGame({ hostMitStation: 1 });
    const hostKontext = testEnv.authenticatedContext('host-1');
    const zug = updateDoc(doc(hostKontext.firestore(), `spiele/${code}/runden/1/karten/karte-1`), {
      position: 1,
      letzteBewegungVon: 'host-1',
      letzteBewegungAm: serverTimestamp(),
    });
    await assertSucceeds(zug);
  });
});

describe('REGRESSION (FEATURE-002): ein klassischer, nicht mitspielender Host darf weiterhin keine Karten bewegen', () => {
  test('Gegeben ein klassischer, nicht mitspielender Host (kein station-Feld), wenn er versucht, eine Karte zu bewegen, dann bleibt es abgelehnt', async () => {
    const code = await seedGame({ hostMitStation: null });
    const hostKontext = testEnv.authenticatedContext('host-1');
    const zug = updateDoc(doc(hostKontext.firestore(), `spiele/${code}/runden/1/karten/karte-1`), {
      position: 1,
      letzteBewegungVon: 'host-1',
      letzteBewegungAm: serverTimestamp(),
    });
    await assertFails(zug);
  });
});
