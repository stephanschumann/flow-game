/**
 * BUGFIX-016 – Sicherheitsregeln für die neue, unveränderliche
 * Bewegungshistorie (Option B, von Stephan am 2026-08-14 17:14 freigegeben:
 * "Änderung der Sicherheitsregeln damit ausdrücklich freigegeben").
 *
 * BDD-Tests (flow-game-bdd, 2026-08-14) zum Punkt "Sicherheitsregel-Tests
 * (nur bei Option B, Emulator nötig)" aus dem Testplan-Grundgerüst der
 * freigegebenen Spec in Backlog.md ("### BUGFIX-016"):
 *   "Anlegen eines Historieneintrags ist genau der Person erlaubt, die die
 *    zugehörige Bewegung ausführen darf; Beobachtende und Fremdstationen
 *    werden abgelehnt; Ändern und Löschen sind für alle verboten; ein
 *    Historieneintrag ohne servergesetzten Zeitstempel wird abgelehnt."
 *
 * Gleiches Testmuster wie tests/game-round.security.rules.test.js und
 * tests/game-drag-drop.security.rules.test.js: Jest +
 * @firebase/rules-unit-testing gegen den Firestore-Emulator.
 *
 * GEPRÜFTES DATENMODELL (identisch zu
 * tests/game-bugfix-016-bewegungshistorie-browser.integration.test.js, dort
 * ausführlich begründet):
 *   spiele/{code}/runden/{runde}/bewegungen/{bewegungId}
 *     station       Zahl 1–5 (Math.max(nachPosition - 1, 1), wie heute in
 *                   public/spiel.html und in bewegungErlaubt())
 *     kartenId      bewegte Karte
 *     uid           ausführende Person
 *     wann          servergesetzter Zeitstempel (Product.md §9)
 *     nachPosition  neue Position der Karte (1–6)
 *     stapel        Stapelkennung oder null
 *
 * ERWARTETE ZIELREGEL (heute noch NICHT vorhanden – Volltextsuche nach
 * "bewegungen" in firestore.rules: 0 Treffer, verifiziert am 2026-08-14):
 *   - create: nur wer die zugehörige Bewegung selbst ausführen darf, d. h.
 *     die eigene Stationsnummer stimmt mit `station` überein, `uid` ist die
 *     eigene, `wann` ist servergesetzt und die Runde hat dorAbgeschlossen.
 *   - update/delete: für ALLE verboten (unveränderliche Historie).
 *   - read: für Teilnehmende des Spiels, damit das Rundenende daraus rechnen
 *     kann; für Aussenstehende nicht.
 *
 * ERWARTETES ROT VOR DER IMPLEMENTIERUNG: Ohne passende Regel greift die
 * Grundregel `allow read, write: if false;` – die assertSucceeds-Szenarien
 * schlagen deshalb JETZT bewusst fehl. Die assertFails-Szenarien sind heute
 * bereits erfüllt und bleiben nach der Umsetzung die eigentliche Absicherung
 * (Polaritäts-Gegenproben); sie sind hier ausdrücklich als solche
 * gekennzeichnet und werden nicht als Nachweis einer erfolgten Umsetzung
 * missverstanden.
 *
 * MANIPULATIONSSCHUTZ IST LAUT STEPHANS ENTSCHEIDUNG NICHT ZIEL DIESES
 * TICKETS – die Regelprüfungen hier sichern deshalb die Datenintegrität der
 * Kennzahlen (Unveränderlichkeit, servergesetzte Zeit, richtige Zuordnung),
 * nicht die Abwehr eines gezielten Angriffs.
 *
 * AUSFÜHRUNGS-HINWEIS: Läuft nur mit gestartetem Firestore-Emulator, z. B.
 *   npm run test:emulator:bugfix-016
 */

const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');
const {
  doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs, serverTimestamp,
} = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'flow-game-bugfix-016-test';
const CODE = 'ABCD1234';
const RUNDE = 1;

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

/** Identisches Seed-Muster wie tests/game-drag-drop.security.rules.test.js. */
async function seedGame({ dorAbgeschlossen = true } = {}) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, `spiele/${CODE}`), {
      hostUid: 'host-1',
      erstelltAm: new Date(),
      letzteAktivitaet: Date.now(),
      aktuelleRunde: RUNDE,
    });
    await setDoc(doc(db, `spiele/${CODE}/geheim/kennung`), { hostKennung: 'geheimes-host-secret' });

    const teilnehmende = [
      { uid: 'host-1', rolle: 'host' },
      { uid: 'spieler-station-1', rolle: 'spielende', station: 1 },
      { uid: 'spieler-station-2', rolle: 'spielende', station: 2 },
      { uid: 'spieler-station-3', rolle: 'spielende', station: 3 },
      { uid: 'beobachter-1', rolle: 'beobachtende' },
    ];
    for (const t of teilnehmende) {
      await setDoc(doc(db, `spiele/${CODE}/teilnehmende/${t.uid}`), t);
    }

    await setDoc(doc(db, `spiele/${CODE}/runden/${RUNDE}`), {
      phase: dorAbgeschlossen ? 'dor_abgeschlossen' : 'aufgabe_vorgestellt',
      dorAbgeschlossen,
      durchlaufzeitStart: new Date(),
      bearbeitungszeitStart: null,
      durchlaufzeitEnde: null,
    });

    // Sechs Karten wie im echten Rundenstart; karte-0 steht im
    // Auftragseingang, karte-1 bereits an Station 2.
    for (let i = 0; i < 6; i += 1) {
      await setDoc(doc(db, `spiele/${CODE}/runden/${RUNDE}/karten/karte-${i}`), {
        position: i === 1 ? 2 : 0,
        stapel: null,
      });
    }
  });
}

/** Ein regelkonformer Historieneintrag – einzelne Felder je Testfall überschrieben. */
function historienEintrag(ueberschreibungen = {}) {
  return Object.assign({
    station: 2,
    kartenId: 'karte-1',
    uid: 'spieler-station-2',
    wann: serverTimestamp(),
    nachPosition: 3,
    stapel: null,
  }, ueberschreibungen);
}

/** Legt einen Historieneintrag unter Umgehung der Regeln an (für Update-/Delete-Fälle). */
async function seedeHistorienEintrag(id = 'bew-1') {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), `spiele/${CODE}/runden/${RUNDE}/bewegungen/${id}`), {
      station: 2,
      kartenId: 'karte-1',
      uid: 'spieler-station-2',
      wann: new Date(),
      nachPosition: 3,
      stapel: null,
    });
  });
  return id;
}

// HINWEIS zur Testhygiene (flow-game-bdd, Abschnitt 3d): kontext.firestore()
// wird pro Testkontext GENAU EINMAL aufgelöst und danach wiederverwendet.
// Ein zweiter Aufruf auf demselben Kontext scheitert sonst mit der
// irreführenden Meldung "Firestore has already been started and its settings
// can no longer be changed" – ein bekanntes SDK-Verhalten, kein Regelfehler.

describe('BUGFIX-016 Sicherheitsregeln: unveränderliche Bewegungshistorie', () => {
  test('Szenario: Die zuständige, abgebende Station darf zu ihrer eigenen Kartenweitergabe einen Historieneintrag anlegen', async () => {
    // Given: Runde 1 läuft, DoR abgeschlossen, karte-1 steht an Station 2
    await seedGame();
    const db = testEnv.authenticatedContext('spieler-station-2').firestore();

    // When: Station 2 hält ihre eigene Weitergabe (Position 2 -> 3) fest
    const versuch = setDoc(
      doc(db, `spiele/${CODE}/runden/${RUNDE}/bewegungen/bew-neu`),
      historienEintrag(),
    );

    // Then: angenommen
    await assertSucceeds(versuch);
  });

  test('Szenario: Station 1 darf auch das Abholen einer Karte aus dem Auftragseingang festhalten (derselbe Sonderfall, den die bestehende Bewegungsregel kennt)', async () => {
    // Given
    await seedGame();
    const db = testEnv.authenticatedContext('spieler-station-1').firestore();

    // When: Bewegung Position 0 -> 1, Zuständigkeit laut bestehender
    // Zuordnungsregel Math.max(nachPosition - 1, 1) = Station 1
    const versuch = setDoc(
      doc(db, `spiele/${CODE}/runden/${RUNDE}/bewegungen/bew-abholung`),
      historienEintrag({ station: 1, kartenId: 'karte-0', uid: 'spieler-station-1', nachPosition: 1 }),
    );

    // Then
    await assertSucceeds(versuch);
  });

  test('Szenario: Eine fremde Station darf keinen Historieneintrag für eine Bewegung anlegen, die ihr gar nicht zusteht (Polaritäts-Gegenprobe)', async () => {
    // Given
    await seedGame();
    const db = testEnv.authenticatedContext('spieler-station-3').firestore();

    // When: Station 3 schreibt einen Eintrag, der Station 2 zuzuordnen wäre
    const versuch = setDoc(
      doc(db, `spiele/${CODE}/runden/${RUNDE}/bewegungen/bew-fremd`),
      historienEintrag({ station: 2, uid: 'spieler-station-3' }),
    );

    // Then: abgelehnt
    await assertFails(versuch);
  });

  test('Szenario: Beobachtende dürfen keinen Historieneintrag anlegen – sie haben keine eigene Station und führen deshalb nie eine Bewegung aus (Polaritäts-Gegenprobe)', async () => {
    await seedGame();
    const db = testEnv.authenticatedContext('beobachter-1').firestore();

    const versuch = setDoc(
      doc(db, `spiele/${CODE}/runden/${RUNDE}/bewegungen/bew-beobachter`),
      historienEintrag({ uid: 'beobachter-1' }),
    );

    await assertFails(versuch);
  });

  test('Szenario: Ein Historieneintrag mit einer aus dem Browser mitgebrachten Uhrzeit statt eines servergesetzten Zeitpunkts wird abgelehnt (Product.md §9)', async () => {
    await seedGame();
    const db = testEnv.authenticatedContext('spieler-station-2').firestore();

    const versuch = setDoc(
      doc(db, `spiele/${CODE}/runden/${RUNDE}/bewegungen/bew-clientzeit`),
      historienEintrag({ wann: new Date(2020, 0, 1) }),
    );

    await assertFails(versuch);
  });

  test('Szenario: Ein Historieneintrag, der die Tätigkeit einer anderen Person zuschreibt, wird abgelehnt', async () => {
    await seedGame();
    const db = testEnv.authenticatedContext('spieler-station-2').firestore();

    const versuch = setDoc(
      doc(db, `spiele/${CODE}/runden/${RUNDE}/bewegungen/bew-fremde-uid`),
      historienEintrag({ uid: 'spieler-station-1' }),
    );

    await assertFails(versuch);
  });

  test('Szenario: Ein bereits festgehaltener Historieneintrag kann von niemandem nachträglich geändert werden – auch nicht von der Person, die ihn angelegt hat', async () => {
    // Given: ein bestehender Eintrag
    await seedGame();
    const id = await seedeHistorienEintrag();
    const db = testEnv.authenticatedContext('spieler-station-2').firestore();

    // When: dieselbe Person versucht, den Zeitpunkt nachträglich zu verschieben
    const versuch = updateDoc(
      doc(db, `spiele/${CODE}/runden/${RUNDE}/bewegungen/${id}`),
      { wann: serverTimestamp() },
    );

    // Then: abgelehnt – die Historie ist unveränderlich
    await assertFails(versuch);
  });

  test('Szenario: Ein bereits festgehaltener Historieneintrag kann von niemandem gelöscht werden', async () => {
    await seedGame();
    const id = await seedeHistorienEintrag('bew-loeschbar');
    const db = testEnv.authenticatedContext('spieler-station-2').firestore();

    const versuch = deleteDoc(doc(db, `spiele/${CODE}/runden/${RUNDE}/bewegungen/${id}`));

    await assertFails(versuch);
  });

  test('Szenario: Teilnehmende können die Bewegungshistorie lesen – sonst könnte das Rundenende gar nicht daraus rechnen', async () => {
    await seedGame();
    await seedeHistorienEintrag('bew-lesbar');
    const db = testEnv.authenticatedContext('spieler-station-3').firestore();

    const versuch = getDocs(collection(db, `spiele/${CODE}/runden/${RUNDE}/bewegungen`));

    await assertSucceeds(versuch);
  });

  test('Szenario: Wer gar nicht an diesem Spiel teilnimmt, kann die Bewegungshistorie nicht lesen (Polaritäts-Gegenprobe)', async () => {
    await seedGame();
    const id = await seedeHistorienEintrag('bew-fremdlesbar');
    const db = testEnv.authenticatedContext('voellig-fremde-person').firestore();

    const versuch = getDoc(doc(db, `spiele/${CODE}/runden/${RUNDE}/bewegungen/${id}`));

    await assertFails(versuch);
  });
});

// ===========================================================================
// NACHARBEIT ZUR ZWEITPRÜFUNG (2026-08-14): Würfelversuche in Runde 4 zählen
// mit und werden deshalb ebenfalls dauerhaft festgehalten (Stephans
// Entscheidung: "Alle Versuche müssen mitzählen"). Der neue Eintragstyp trägt
// `art: 'wuerfelversuch'` und bleibt bei derselben Person stehen – station und
// nachPosition sind deshalb identisch mit der eigenen Runde-4-Position, statt
// wie bei einer Weitergabe um eins auseinanderzuliegen. Dieselben
// Schutzzusagen wie bisher: nur die handelnde Person, eigene Kennung,
// servergesetzte Uhrzeit, nachträglich weder änderbar noch löschbar, lesbar
// für Teilnehmende desselben Spiels.
// ===========================================================================

const RUNDE_VIER = 4;

/** Runde-4-Kontext: eigene Position je Person + laufende Runde 4. */
async function seedeRundeVierKontext() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, `spiele/${CODE}/teilnehmende/spieler-station-2`), {
      uid: 'spieler-station-2', rolle: 'spielende', station: 2, rundeVierPosition: 2,
    });
    await setDoc(doc(db, `spiele/${CODE}/teilnehmende/spieler-station-3`), {
      uid: 'spieler-station-3', rolle: 'spielende', station: 3, rundeVierPosition: 3,
    });
    await setDoc(doc(db, `spiele/${CODE}/runden/${RUNDE_VIER}`), {
      phase: 'dor_abgeschlossen',
      dorAbgeschlossen: true,
      durchlaufzeitStart: new Date(),
      bearbeitungszeitStart: null,
      durchlaufzeitEnde: null,
    });
  });
}

/** Ein regelkonformer Würfelversuch-Eintrag – Felder je Testfall überschrieben. */
function wuerfelversuchEintrag(ueberschreibungen = {}) {
  return Object.assign({
    art: 'wuerfelversuch',
    station: 3,
    kartenId: 'wuerfel-2',
    uid: 'spieler-station-3',
    wann: serverTimestamp(),
    nachPosition: 3,
    stapel: null,
  }, ueberschreibungen);
}

describe('BUGFIX-016 Sicherheitsregeln: Würfelversuche in Runde 4 (Nacharbeit Zweitprüfung)', () => {
  test('Szenario: Die Person, bei der der Würfel gerade liegt, darf ihren misslungenen Würfelversuch als Historieneintrag festhalten', async () => {
    await seedGame();
    await seedeRundeVierKontext();
    const db = testEnv.authenticatedContext('spieler-station-3').firestore();

    const versuch = setDoc(
      doc(db, `spiele/${CODE}/runden/${RUNDE_VIER}/bewegungen/wv-neu`),
      wuerfelversuchEintrag(),
    );

    await assertSucceeds(versuch);
  });

  test('Szenario: Eine andere Person darf keinen Würfelversuch für eine fremde Position festhalten (Polaritäts-Gegenprobe)', async () => {
    await seedGame();
    await seedeRundeVierKontext();
    const db = testEnv.authenticatedContext('spieler-station-2').firestore();

    const versuch = setDoc(
      doc(db, `spiele/${CODE}/runden/${RUNDE_VIER}/bewegungen/wv-fremd`),
      wuerfelversuchEintrag({ uid: 'spieler-station-2' }),
    );

    await assertFails(versuch);
  });

  test('Szenario: Ein Würfelversuch mit einer aus dem Browser mitgebrachten Uhrzeit statt eines servergesetzten Zeitpunkts wird abgelehnt (Product.md §9)', async () => {
    await seedGame();
    await seedeRundeVierKontext();
    const db = testEnv.authenticatedContext('spieler-station-3').firestore();

    const versuch = setDoc(
      doc(db, `spiele/${CODE}/runden/${RUNDE_VIER}/bewegungen/wv-clientzeit`),
      wuerfelversuchEintrag({ wann: new Date(2020, 0, 1) }),
    );

    await assertFails(versuch);
  });

  test('Szenario: Ein als Würfelversuch gekennzeichneter Eintrag, der sich wie eine Weitergabe an die nächste Position ausgibt, wird abgelehnt – beim Würfelversuch bleibt das Element bei derselben Person', async () => {
    await seedGame();
    await seedeRundeVierKontext();
    const db = testEnv.authenticatedContext('spieler-station-3').firestore();

    const versuch = setDoc(
      doc(db, `spiele/${CODE}/runden/${RUNDE_VIER}/bewegungen/wv-getarnt`),
      wuerfelversuchEintrag({ nachPosition: 4 }),
    );

    await assertFails(versuch);
  });

  test('Szenario: Ein festgehaltener Würfelversuch kann nachträglich weder geändert noch gelöscht werden – auch nicht von der Person, die ihn angelegt hat', async () => {
    await seedGame();
    await seedeRundeVierKontext();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), `spiele/${CODE}/runden/${RUNDE_VIER}/bewegungen/wv-bestehend`), {
        art: 'wuerfelversuch',
        station: 3,
        kartenId: 'wuerfel-2',
        uid: 'spieler-station-3',
        wann: new Date(),
        nachPosition: 3,
        stapel: null,
      });
    });
    const db = testEnv.authenticatedContext('spieler-station-3').firestore();

    await assertFails(updateDoc(
      doc(db, `spiele/${CODE}/runden/${RUNDE_VIER}/bewegungen/wv-bestehend`),
      { wann: serverTimestamp() },
    ));
    await assertFails(deleteDoc(
      doc(db, `spiele/${CODE}/runden/${RUNDE_VIER}/bewegungen/wv-bestehend`),
    ));
  });

  test('Szenario: Teilnehmende desselben Spiels können die Würfelversuche mitlesen – sonst könnte das Rundenende sie nicht mitzählen', async () => {
    await seedGame();
    await seedeRundeVierKontext();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), `spiele/${CODE}/runden/${RUNDE_VIER}/bewegungen/wv-lesbar`), {
        art: 'wuerfelversuch',
        station: 3,
        kartenId: 'wuerfel-2',
        uid: 'spieler-station-3',
        wann: new Date(),
        nachPosition: 3,
        stapel: null,
      });
    });
    const db = testEnv.authenticatedContext('spieler-station-2').firestore();

    await assertSucceeds(getDocs(collection(db, `spiele/${CODE}/runden/${RUNDE_VIER}/bewegungen`)));
  });
});
