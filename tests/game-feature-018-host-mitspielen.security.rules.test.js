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
  doc, setDoc, updateDoc, serverTimestamp, getDoc, runTransaction,
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

/**
 * BUGFIX-015 (2026-08-10) – Firestore-Regel für spiele/{spielId} "allow
 * create" verlangte bislang zwingend belegteStationen == {} (leere Map),
 * obwohl createGame() bei aktiviertem "Ich spiele selbst mit" (FEATURE-018,
 * mitspielen=true) im selben Commit bereits belegteStationen mit der
 * eigenen Host-Station vorbelegt – dadurch scheiterte die GESAMTE
 * Erstellungs-Transaktion mit "Missing or insufficient permissions".
 * Stephans Entscheidung (Annahmen-Protokoll Frage 1, Backlog.md): Option A
 * – eine strenge, cross-referenzierte Regelkorrektur, die per getAfter()
 * gegen das im selben Commit angelegte teilnehmende/{uid}-Dokument prüft,
 * dass HÖCHSTENS die eigene, tatsächlich zugewiesene Host-Station vorbelegt
 * werden darf (NICHT die laxe Alternative "Option B",
 * belegteStationen.size() <= 1 ohne Cross-Referenz, die eine neue
 * Sicherheitslücke geöffnet hätte, siehe Backlog.md).
 *
 * WICHTIG (schließt exakt den in der Analyse-Spec dokumentierten
 * Testabdeckungs-Blindspot, Pre-Mortem-Risiko 3): Alle Testfälle in diesem
 * Block legen spiele/{spielId} AUSSCHLIESSLICH über die ECHTE, scharf-
 * geschaltete "allow create"-Regel an – bewusst OHNE
 * withSecurityRulesDisabled() für diesen einen Schreibvorgang (anders als
 * seedGame() oben, das ausschliesslich für die bereits bestehenden
 * FEATURE-018-Sichtbarkeits-/Bewegungstests verwendet wird). Genau dieser
 * Bypass in seedGame() ist laut Analyse-Spec der Grund, warum kein
 * bestehender Test diesen Bug vorab gefunden hat.
 *
 * Erwarteter Status BEIM ERSTEN LAUF (firestore.rules noch NICHT korrigiert,
 * Option A ist noch nicht implementiert):
 *  - Testfälle 1 und 5 (mitspielender Host, inkl. Isolation zweier Spiele):
 *    ROT – die aktuelle Regel verlangt weiterhin zwingend
 *    belegteStationen == {}, ein nicht-leerer, aber KORREKTER Eintrag wird
 *    also ebenfalls abgelehnt (exakt der gemeldete Bug).
 *  - Testfälle 3 und 4 (falsche Station/uid bzw. mehr als eine Station):
 *    laufen bereits UNTER DER AKTUELLEN Regel grün – die heutige, pauschale
 *    "== {}"-Bedingung lehnt ausnahmslos JEDEN nicht-leeren
 *    belegteStationen-Wert ab, also auch diese böswilligen Varianten. Ihr
 *    grüner Status ist damit aktuell ein Kollateralschaden der zu strengen
 *    Regel, NICHT durch eine gezielte Cross-Referenz-Prüfung begründet, wie
 *    Option A sie erst einführt. Sie bleiben trotzdem zwingend Teil des
 *    Testplans, weil sie NACH dem Rules-Fix (der die pauschale Ablehnung
 *    aufhebt) die einzige verbleibende Verteidigungslinie gegen genau diese
 *    Angriffsfläche sind (Pre-Mortem-Risiko 2) – ohne sie wäre eine zu laxe
 *    künftige Regeländerung unbemerkt möglich.
 *  - Testfälle 2 und 6 (klassischer, nicht mitspielender Host): GRÜN,
 *    unverändert (Regressionsschutz, AK3/AK6 aus FEATURE-018).
 */

/**
 * Versucht, ein neues Spiel exakt wie createGame() (src/game/createGame.js,
 * Z. 119–134) über eine ECHTE Firestore-Transaktion anzulegen – drei
 * Schreibvorgänge (spiele/{code}, spiele/{code}/geheim/kennung,
 * spiele/{code}/teilnehmende/{uid}) im selben Commit, GEGEN die echten
 * firestore.rules (kein withSecurityRulesDisabled). `belegteStationen` und
 * das optionale `station`-Feld auf dem eigenen teilnehmende-Dokument werden
 * bewusst UNABHÄNGIG voneinander übergeben (statt wie in createGame.js
 * zwingend gekoppelt), damit auch böswillige Client-Versuche mit
 * abweichenden/zusätzlichen Werten abgebildet werden können (AK4/AK5).
 *
 * NIMMT BEWUSST `db` (bereits aufgelöste Firestore-Instanz) statt `kontext`
 * entgegen (Testinfrastruktur-Korrektur, 2026-08-10, nach Stephans lokalem
 * Testlauf): `kontext.firestore()` ruft intern bei JEDEM Aufruf erneut
 * `useEmulator()`/`settings()` auf derselben, App-weit gecachten
 * Firestore-Instanz auf. Sobald diese Instanz bereits eine Operation
 * ausgeführt hat ("_settingsFrozen"), wirft ein erneuter `.firestore()`-Aufruf
 * auf demselben Kontext "FAILED_PRECONDITION: Firestore has already been
 * started..." (bestätigt in node_modules/@firebase/firestore/dist/
 * index.node.cjs.js, `_setSettings()`) – UNABHÄNGIG vom Ergebnis der
 * Sicherheitsregel-Prüfung selbst. Betraf Testfälle 3, 5 und 6, die denselben
 * `kontext` mehrfach für `.firestore()` verwendet hatten (zweiter
 * Erstellungsversuch bzw. anschliessendes `getDoc()`). Behoben, indem jeder
 * Aufrufer `kontext.firestore()` genau EINMAL pro Kontext auflöst und die
 * resultierende `db`-Instanz für alle weiteren Operationen wiederverwendet.
 * Die geprüften Erwartungen (assertFails/assertSucceeds, Eingabewerte) sind
 * dabei unverändert geblieben – ausschliesslich die Instanz-Beschaffung
 * wurde korrigiert.
 */
async function versucheSpielErstellung(db, {
  code,
  uid,
  belegteStationen = {},
  hostStation, // Feld auf dem eigenen teilnehmende-Dokument; undefined = kein station-Feld (klassischer Host)
} = {}) {
  return runTransaction(db, async (tx) => {
    tx.set(doc(db, `spiele/${code}`), {
      code,
      erstelltAm: Date.now(),
      letzteAktivitaet: Date.now(),
      belegteStationen,
    });
    tx.set(doc(db, `spiele/${code}/geheim/kennung`), { hostKennung: 'geheimes-host-secret' });
    const teilnehmerDaten = { rolle: 'host', anzeigename: 'Testperson' };
    if (hostStation) {
      teilnehmerDaten.station = hostStation;
    }
    tx.set(doc(db, `spiele/${code}/teilnehmende/${uid}`), teilnehmerDaten);
  });
}

describe('BUGFIX-015 (echte, scharfgeschaltete allow-create-Regel, KEIN withSecurityRulesDisabled): Stationsvorbelegung beim Spiel-Erstellen', () => {
  test('[1 – ROT bis Option A implementiert] Gegeben ein Host aktiviert beim Erstellen "ich spiele mit", wenn die Erstellung gegen die echte Regel versucht wird, dann gelingt sie (Kern-Regressionstest gegen den gemeldeten Bug, AK1)', async () => {
    const kontext = testEnv.authenticatedContext('host-bugfix-015-a');
    const db = kontext.firestore();
    await assertSucceeds(versucheSpielErstellung(db, {
      code: 'BF015A01',
      uid: 'host-bugfix-015-a',
      belegteStationen: { wareneingang: 'host-bugfix-015-a' },
      hostStation: 'wareneingang',
    }));
  });

  test('[2 – bereits GRÜN, muss GRÜN bleiben] Gegeben ein Host erstellt ein Spiel OHNE "ich spiele mit", wenn die Erstellung gegen die echte Regel versucht wird, dann gelingt sie weiterhin wie bisher (Regressionstest, AK3/AK6 aus FEATURE-018)', async () => {
    const kontext = testEnv.authenticatedContext('host-bugfix-015-b');
    const db = kontext.firestore();
    await assertSucceeds(versucheSpielErstellung(db, {
      code: 'BF015B01',
      uid: 'host-bugfix-015-b',
      belegteStationen: {},
    }));
  });

  test('[3 – aktuell GRÜN, aber nur zufällig korrekt, siehe Kopfkommentar] Gegeben ein Client versucht beim Erstellen, belegteStationen mit einer Station/uid vorzubelegen, die NICHT der im selben Commit angelegten eigenen Host-Station entspricht, wenn die Erstellung gegen die echte Regel versucht wird, dann wird sie abgelehnt (AK5, deckt Pre-Mortem-Risiko 2 ab)', async () => {
    const kontext = testEnv.authenticatedContext('host-bugfix-015-c');
    const db = kontext.firestore();
    // Fall (a): falsche Station (eigene teilnehmende.station ist
    // "wareneingang", belegteStationen trägt aber "kommissionierung").
    await assertFails(versucheSpielErstellung(db, {
      code: 'BF015C01',
      uid: 'host-bugfix-015-c',
      belegteStationen: { kommissionierung: 'host-bugfix-015-c' },
      hostStation: 'wareneingang',
    }));
    // Fall (b): richtige Station, aber falsche uid (fremde Person als
    // vermeintlich belegend eingetragen). Verwendet dieselbe, bereits
    // aufgelöste `db`-Instanz wie Fall (a) (siehe Kopfkommentar von
    // versucheSpielErstellung) statt erneut kontext.firestore() aufzurufen.
    await assertFails(versucheSpielErstellung(db, {
      code: 'BF015C02',
      uid: 'host-bugfix-015-c',
      belegteStationen: { wareneingang: 'fremde-uid' },
      hostStation: 'wareneingang',
    }));
  });

  test('[4 – aktuell GRÜN, aber nur zufällig korrekt, siehe Kopfkommentar] Gegeben ein Client versucht beim Erstellen, MEHR ALS EINE Station in belegteStationen vorzubelegen, wenn die Erstellung gegen die echte Regel versucht wird, dann wird sie abgelehnt (AK4, Grenzwert-Test)', async () => {
    const kontext = testEnv.authenticatedContext('host-bugfix-015-d');
    const db = kontext.firestore();
    await assertFails(versucheSpielErstellung(db, {
      code: 'BF015D01',
      uid: 'host-bugfix-015-d',
      belegteStationen: {
        wareneingang: 'host-bugfix-015-d',
        kommissionierung: 'host-bugfix-015-d',
      },
      hostStation: 'wareneingang',
    }));
  });

  test('[5 – ROT bis Option A implementiert, folgt aus Testfall 1] Gegeben zwei unabhängig voneinander erstellte Spiele mit je mitspielendem Host an derselben Stationsbezeichnung, wenn beide Erstellungen gegen die echte Regel versucht werden, dann gelingen beide UND ihre jeweiligen belegteStationen bleiben vollständig unabhängig voneinander (Isolation, FEATURE-001)', async () => {
    const kontextEins = testEnv.authenticatedContext('host-bugfix-015-e1');
    const kontextZwei = testEnv.authenticatedContext('host-bugfix-015-e2');
    const dbEins = kontextEins.firestore();
    const dbZwei = kontextZwei.firestore();

    await assertSucceeds(versucheSpielErstellung(dbEins, {
      code: 'BF015E01',
      uid: 'host-bugfix-015-e1',
      belegteStationen: { wareneingang: 'host-bugfix-015-e1' },
      hostStation: 'wareneingang',
    }));
    await assertSucceeds(versucheSpielErstellung(dbZwei, {
      code: 'BF015E02',
      uid: 'host-bugfix-015-e2',
      belegteStationen: { wareneingang: 'host-bugfix-015-e2' },
      hostStation: 'wareneingang',
    }));

    const spielEinsSnap = await getDoc(doc(dbEins, 'spiele/BF015E01'));
    const spielZweiSnap = await getDoc(doc(dbZwei, 'spiele/BF015E02'));
    expect(spielEinsSnap.data().belegteStationen).toEqual({ wareneingang: 'host-bugfix-015-e1' });
    expect(spielZweiSnap.data().belegteStationen).toEqual({ wareneingang: 'host-bugfix-015-e2' });
  });

  test('[6 – bereits GRÜN, muss GRÜN bleiben] Gegeben ein klassischer, nicht mitspielender Host, wenn das Spiel gegen die echte Regel erstellt wird, dann bleibt belegteStationen exakt {} (Regressionstest, unverändertes Verhalten)', async () => {
    const kontext = testEnv.authenticatedContext('host-bugfix-015-f');
    const db = kontext.firestore();
    await assertSucceeds(versucheSpielErstellung(db, {
      code: 'BF015F01',
      uid: 'host-bugfix-015-f',
      belegteStationen: {},
    }));
    const spielSnap = await getDoc(doc(db, 'spiele/BF015F01'));
    expect(spielSnap.data().belegteStationen).toEqual({});
  });
});
