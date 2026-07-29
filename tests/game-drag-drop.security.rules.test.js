/**
 * FEATURE-008 – Karten per Drag-and-Drop statt Klick-Button bewegen
 * BDD-Tests (flow-game-bdd, 2026-07-29) für den serverautoritativen Teil der
 * neuen Kennzahl "Fehlversuche" (finale Klärung Frage 8, Backlog.md
 * "### FEATURE-008"): Ein absichtlicher Fehlversuch erzeugt NIE eine
 * Firestore-Dokumentänderung auf der karten-Collection (AK14, bereits heute
 * architektonisch ausgeschlossen — siehe Code-Befund in der freigegebenen
 * Spec) und muss deshalb client-seitig lokal erfasst und EXPLIZIT an den
 * Server übermittelt werden (eigener, bewusster Schreibvorgang). Diese Datei
 * prüft genau diesen neuen, expliziten Schreibpfad gegen die echten
 * Firestore-Sicherheitsregeln.
 *
 * Gleiches Testmuster wie tests/game-round.security.rules.test.js
 * (FEATURE-002): Jest + @firebase/rules-unit-testing gegen den
 * Firestore-Emulator.
 *
 * WICHTIG, TRANSPARENT DOKUMENTIERT — AUSFÜHRUNG IN DIESER SANDBOX BEKANNT
 * EINGESCHRÄNKT (identischer Befund wie BUGFIX-005, siehe
 * tests/helpers/fakeFirestore.js-Kopfkommentar, 2026-07-28, hier am
 * 2026-07-29 erneut unabhängig reproduziert):
 * `firebase emulators:exec --only firestore ...` lädt beim ersten Start das
 * Firestore-Emulator-JAR (`cloud-firestore-emulator-v1.19.8.jar`) aus dem
 * Internet nach — dieser Download ist in dieser Sandbox durch die
 * Organisations-Egress-Policy blockiert:
 *   "Error: download failed, status 403: request rejected: host not permitted"
 * Diese Datei konnte in dieser Session deshalb NICHT tatsächlich ausgeführt
 * werden (weder rot noch grün beobachtet) — das wird hier bewusst nicht
 * verschwiegen oder als "getestet" behauptet. Stephan müsste sie lokal
 * ausführen (z. B. `npm run test:emulator:feature-008`, analog zu den
 * bestehenden `test:emulator:feature-00X`-Skripten), sobald ein Emulator zur
 * Verfügung steht.
 *
 * NAMENSGEBUNG / ANGENOMMENES DATENMODELL (eigene, begründete Festlegung,
 * siehe auch Kopfkommentar von tests/game-drag-drop.logic.test.js): ein
 * neues, live während der Runde inkrementierbares Zahlenfeld `fehlversuche`
 * auf `spiele/{code}/runden/{n}` (Rundendokument), analog zum bereits
 * bestehenden, ebenfalls flachen `fehlerzahl`-Feld aus Runde 4
 * (src/game/vergleichsansicht.js) — Stephans eigener Vergleich "wie bei den
 * anderen Spielen auch" legt diese flache, globale Zählung nahe. Falls
 * flow-game-impl stattdessen eine Aufschlüsselung je Station wählt (ebenfalls
 * in der finalen Klärung 8 als offene Detailfrage genannt), bitte mit diesen
 * Tests abgleichen statt sie stillschweigend zu ignorieren.
 *
 * WICHTIGER, REAL CODE-GEPRÜFTER BEFUND ZUR AKTUELLEN REGEL (Commit
 * aca124f, firestore.rules Zeile 597–619, `match /runden/{runde}` ->
 * `allow update`): Die heutige "Fall A"-Bedingung
 * (`request.resource.data.dorAbgeschlossen == true &&
 * request.resource.data.phase == 'dor_abgeschlossen'`) prüft AUSSCHLIESSLICH
 * diese zwei Feldwerte im Ergebnisdokument — anders als die sorgfältiger
 * eingegrenzte Freigabe-Regel auf `spiele/{spielId}`
 * (`nurFreigabeFelderGeaendert()`) gibt es HIER keine Prüfung, welche
 * weiteren Felder ein Update sonst noch verändert. Das bedeutet: solange
 * eine Runde bereits `dorAbgeschlossen: true` und `phase: 'dor_abgeschlossen'`
 * hat (der normale Zustand während der gesamten aktiven Spielzeit), könnte
 * ein `update()`, das per Merge NUR ein neues Feld wie `fehlversuche`
 * hinzufügt (ohne `dorAbgeschlossen`/`phase` zu verändern), nach dem
 * WORTLAUT der heutigen Regel bereits erfolgreich sein — unabhängig davon,
 * ob dieser neue Schreibpfad überhaupt bewusst vorgesehen ist. Diese
 * Einschätzung beruht ausschließlich auf einer Lektüre des Regeltexts, NICHT
 * auf einer tatsächlichen Ausführung (siehe Ausführungs-Einschränkung oben)
 * — sie wird hier bewusst als Hinweis für `flow-game-impl` festgehalten,
 * nicht als geprüfte Tatsache behauptet. Das erste Szenario unten
 * (assertSucceeds) könnte dadurch schon HEUTE fälschlich grün sein, obwohl
 * der Schreibpfad nicht bewusst entworfen wurde; das zweite Szenario
 * (Beobachtende dürfen keinen Fehlversuch zählen) bleibt davon unberührt ROT
 * relevant, weil `istTeilnehmer()` Beobachtende NICHT ausschließt (sie haben
 * ebenfalls ein teilnehmende-Dokument) und die heutige Fall-A-Bedingung
 * keine Rollenprüfung enthält.
 */

const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');
const { doc, setDoc, updateDoc } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'flow-game-feature-008-test';
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

/** Identisches Seed-Muster wie tests/game-round.security.rules.test.js (seedGame()). */
async function seedGame({
  code = 'ABCD1234',
  hostUid = 'host-1',
  runde = 1,
  dorAbgeschlossen = true,
} = {}) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, `spiele/${code}`), {
      hostUid,
      erstelltAm: new Date(),
      letzteAktivitaet: Date.now(),
      aktuelleRunde: runde,
    });
    await setDoc(doc(db, `spiele/${code}/geheim/kennung`), { hostKennung: 'geheimes-host-secret' });

    const teilnehmende = [
      { uid: hostUid, rolle: 'host' },
      { uid: 'spieler-station-1', rolle: 'spielende', station: 1 },
      { uid: 'spieler-station-2', rolle: 'spielende', station: 2 },
      { uid: 'beobachter-1', rolle: 'beobachtende' },
    ];
    for (const t of teilnehmende) {
      await setDoc(doc(db, `spiele/${code}/teilnehmende/${t.uid}`), t);
    }

    await setDoc(doc(db, `spiele/${code}/runden/${runde}`), {
      phase: dorAbgeschlossen ? 'dor_abgeschlossen' : 'aufgabe_vorgestellt',
      dorAbgeschlossen,
      durchlaufzeitStart: new Date(),
      bearbeitungszeitStart: null,
      durchlaufzeitEnde: null,
    });
  });
  return code;
}

describe('FEATURE-008 Sicherheitsregeln: Neue Kennzahl "Fehlversuche" (finale Klärung Frage 8)', () => {
  test('Szenario: Eine zuständige, teilnehmende Person kann einen erkannten Fehlversuch als neue Kennzahl zählen lassen', async () => {
    // Given: Runde 1 läuft, DoR bereits abgeschlossen (Fehlversuche können laut
    // darfIchDieseKarteBewegen() ohnehin nur nach DoR entstehen)
    const code = await seedGame({ runde: 1, dorAbgeschlossen: true });
    const stationZwei = testEnv.authenticatedContext('spieler-station-2');

    // When: Die Person an Station 2 meldet einen Fehlversuch (fehlversuche 0 -> 1),
    // OHNE andere Rundenfelder zu verändern
    const zug = updateDoc(doc(stationZwei.firestore(), `spiele/${code}/runden/1`), {
      fehlversuche: 1,
    });

    // Then: Der Schreibvorgang wird angenommen (erwünschtes ZIEL-Verhalten;
    // siehe Kopfkommentar zur Unsicherheit, ob dies bereits heute zufällig
    // erfüllt ist oder erst eine neue Regel braucht - in beiden Fällen ist
    // dieses Szenario die verbindliche Erwartung an flow-game-impl)
    await assertSucceeds(zug);
  });

  test('Szenario: Beobachtende dürfen keinen Fehlversuch zählen (sie haben keine eigene Station, können also selbst gar keinen Fehlversuch auslösen)', async () => {
    // Given: Runde 1 läuft, DoR abgeschlossen
    const code = await seedGame({ runde: 1, dorAbgeschlossen: true });
    const beobachter = testEnv.authenticatedContext('beobachter-1');

    // When: Eine beobachtende Person versucht dennoch, fehlversuche zu erhöhen
    const zug = updateDoc(doc(beobachter.firestore(), `spiele/${code}/runden/1`), {
      fehlversuche: 1,
    });

    // Then: Der Schreibvorgang wird abgelehnt
    await assertFails(zug);
  });

  test('Szenario: Der Fehlversuch-Zähler kann nicht in einem Rutsch um mehr als einen Schritt gleichzeitig erhöht werden (Manipulationsschutz, analog zum Ein-Schritt-Limit bei echten Kartenbewegungen)', async () => {
    // Given: Runde 1 läuft, DoR abgeschlossen, bisher 0 Fehlversuche
    const code = await seedGame({ runde: 1, dorAbgeschlossen: true });
    const stationEins = testEnv.authenticatedContext('spieler-station-1');

    // When: Ein einzelner Schreibvorgang versucht, den Zähler direkt auf 5 zu setzen
    const zug = updateDoc(doc(stationEins.firestore(), `spiele/${code}/runden/1`), {
      fehlversuche: 5,
    });

    // Then: Der Schreibvorgang wird abgelehnt (nur +1 pro Schreibvorgang erlaubt)
    await assertFails(zug);
  });
});

// Bewusst NICHT zusätzlich getestet: ein "Huckepack"-Schreibversuch, der
// fehlversuche UND phase in einem Rutsch ändert. Nach Lektüre der
// bestehenden Fall-A/Fall-B-Bedingungen (siehe Kopfkommentar) würde ein
// solcher Versuch schon HEUTE zuverlässig an der bestehenden phase-Prüfung
// scheitern, unabhängig vom neuen fehlversuche-Feld - ein solcher Test
// würde also vermutlich nichts Neues absichern und könnte fälschlich als
// "durch FEATURE-008 abgesichert" missverstanden werden, obwohl er nur
// bereits bestehenden FEATURE-002/003-Schutz erneut prüft (siehe
// flow-game-bdd, Regel 4a: ein Test, der schon vorher grün wäre, prüft
// nichts Sinnvolles Neues).
