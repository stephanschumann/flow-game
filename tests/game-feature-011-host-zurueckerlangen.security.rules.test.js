/**
 * FEATURE-011 – Gastgeber-Rolle zurückerlangen können.
 * Sicherheitsregel-Tests (Firestore Security Rules) über den Firebase
 * Emulator. BDD-Tests (flow-game-bdd, 2026-08-08) für die freigegebene Spec
 * in Backlog.md ("### FEATURE-011"), Akzeptanzkriterium 3 sowie
 * Pre-Mortem-Risiko 2 und den Regressionsrisiko-Eintrag zu BUGFIX-005.
 *
 * WICHTIGER HINWEIS ZUR DATEIZUORDNUNG (siehe auch
 * tests/game-feature-011-host-zurueckerlangen.logic.test.js): AK3 ("falscher
 * Code ODER falsches Kennzeichen liefert denselben Fehlercode") wird laut
 * Testplan-Grundgerüst der Logik-Datei zugeordnet – die eigentliche,
 * serverautoritative Ablehnung passiert aber ausschliesslich in
 * firestore.rules und ist nur hier, gegen den echten Regelsatz, sinnvoll
 * beobachtbar (tests/helpers/fakeFirestore.js hat keine Regel-Engine). Beide
 * AK3-Testfälle stehen deshalb in dieser Datei. OFFENER PUNKT FÜR STEPHAN:
 * bitte bestätigen, dass diese Umverteilung so gewollt ist.
 *
 * FUNDSTELLENBEZUG Pre-Mortem-Risiko 2 (Zeile 555 ff. firestore.rules, "allow
 * create" für teilnehmende/{uid}, Fall rolle=='host'): Die Bedingung prüft
 * ausschliesslich request.resource.data.hostKennung gegen die bestehende
 * Kennung – es gibt dort KEINE hasOnly()/hasAll()-Einschränkung, die ein
 * zusätzlich mitgesendetes station-Feld verbieten würde. Der erste Testfall
 * unten prüft deshalb ausdrücklich, ob das tatsächlich zutrifft. WICHTIG:
 * sollte dieser Testfall am echten Emulator GRÜN sein (Schreibversuch also
 * NICHT abgelehnt), ist das kein Testfehler, sondern die Bestätigung einer
 * echten, in der Spec bereits vorab benannten Sicherheitslücke – das Ticket
 * schliesst laut Scope AUSDRÜCKLICH jede Änderung an firestore.rules aus.
 * OFFENER PUNKT FÜR STEPHAN: falls dieser Testfall grün läuft (Schreiben
 * erlaubt), bitte entscheiden, ob der Scope-Ausschluss dennoch Bestand hat
 * oder ob firestore.rules doch angefasst werden muss.
 *
 * AUSFÜHRUNGSHINWEIS (Pflichtangabe laut flow-game-bdd-Skill Schritt 4a): wie
 * bei BUGFIX-005/FEATURE-018 lädt `firebase emulators:exec` den
 * Firestore-Emulator-JAR nach – das ist in dieser Cloud-Sandbox durch die
 * Organisations-Egress-Policy blockiert (`Error: download failed, status
 * 403: request rejected: host not permitted`). Diese Datei ist daher
 * geschrieben, aber in dieser Sandbox NICHT als real rot/grün bestätigt –
 * das muss Stephan lokal ausführen (analog `npm run test:emulator:bugfix-005`
 * / `npm run test:emulator:feature-018`).
 *
 * Feldabgleich gegen firestore.rules (Pflichtschritt 3a des
 * flow-game-bdd-Skills, identisch zu den bereits bestehenden, gegen die
 * echten Regeln verifizierten seedGameA()/seedGame()-Hilfsfunktionen in
 * tests/game-host-claim-overwrite.security.rules.test.js und
 * tests/game-feature-018-host-mitspielen.security.rules.test.js übernommen):
 *   - spiele/{code} braucht {erstelltAm, letzteAktivitaet, belegteStationen}
 *     für istAktiv()/istTeilnehmer().
 *   - spiele/{code}/geheim/kennung braucht AUSSCHLIESSLICH {hostKennung}
 *     (hasOnly-Regel beim create, siehe firestore.rules Zeile ~495).
 *   - spiele/{code}/teilnehmende/{uid} braucht {rolle, anzeigename, ggf.
 *     station/hostKennung}.
 *
 * Framework: Jest + @firebase/rules-unit-testing (Firestore-Emulator), exakt
 * dasselbe Testmuster wie tests/game-host-claim-overwrite.security.rules.test.js.
 * Voraussetzung zum Ausführen: `firebase emulators:exec --only firestore
 * "jest tests/game-feature-011-host-zurueckerlangen.security.rules.test.js"`.
 */

const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require('@firebase/rules-unit-testing');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'flow-game-19f01-test-feature-011';
const GAME_A = 'game-a';

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
 * Legt Spiel A mit gültiger Host-Kennung an (kein bestehendes
 * Teilnehmenden-Dokument für die reklamierende uid) – Feldabgleich siehe
 * Kopfkommentar.
 */
async function seedGameAMitGueltigerKennung() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.doc(`spiele/${GAME_A}`).set({
      erstelltAm: Date.now(),
      letzteAktivitaet: Date.now(),
      belegteStationen: {},
    });
    await db.doc(`spiele/${GAME_A}/geheim/kennung`).set({ hostKennung: 'host-secret-a' });
  });
}

describe('Pre-Mortem-Risiko 2: ein selbstgesetztes station-Feld beim Zurückerobern', () => {
  test('Gegeben ein Spiel mit gültiger Host-Kennung, wenn eine neue uid mit korrekter Kennung versucht, ihr eigenes teilnehmende-Dokument mit rolle="host" UND einem selbstgesetzten station-Feld anzulegen, dann wird der Schreibversuch abgelehnt (kein Selbst-Zuweisen einer Station beim Zurückerobern)', async () => {
    await seedGameAMitGueltigerKennung();
    const neuesGeraetKontext = testEnv.authenticatedContext('host-neues-geraet');
    await assertFails(
      neuesGeraetKontext
        .firestore()
        .doc(`spiele/${GAME_A}/teilnehmende/host-neues-geraet`)
        .set({
          rolle: 'host',
          hostKennung: 'host-secret-a',
          anzeigename: 'Host',
          station: 'wareneingang',
        })
    );
  });
});

describe('AK3 (Fehlermeldung bewusst nicht unterscheidend): ein falsches Host-Kennzeichen bei sonst korrektem Code wird abgelehnt', () => {
  test('Gegeben ein Spiel mit gültiger Host-Kennung, wenn eine neue uid versucht, mit einem FALSCHEN Kennzeichen ihr eigenes teilnehmende-Dokument mit rolle="host" anzulegen, dann wird der Schreibversuch abgelehnt', async () => {
    await seedGameAMitGueltigerKennung();
    const neuesGeraetKontext = testEnv.authenticatedContext('host-neues-geraet');
    await assertFails(
      neuesGeraetKontext
        .firestore()
        .doc(`spiele/${GAME_A}/teilnehmende/host-neues-geraet`)
        .set({
          rolle: 'host',
          hostKennung: 'falsches-kennzeichen',
          anzeigename: 'Host',
        })
    );
  });
});

describe('AK3 (Fehlermeldung bewusst nicht unterscheidend): ein Spiel-Code, der gar nicht existiert, wird ebenso abgelehnt wie ein falsches Kennzeichen (kein Rückschluss darauf möglich, ob der Code an sich existiert)', () => {
  test('Gegeben es existiert KEIN Spiel unter diesem Code (kein geheim/kennung-Dokument), wenn eine neue uid versucht, mit einem beliebigen Kennzeichen ihr eigenes teilnehmende-Dokument mit rolle="host" anzulegen, dann wird der Schreibversuch ebenfalls abgelehnt', async () => {
    const neuesGeraetKontext = testEnv.authenticatedContext('host-neues-geraet');
    await assertFails(
      neuesGeraetKontext
        .firestore()
        .doc('spiele/nicht-vorhandener-code/teilnehmende/host-neues-geraet')
        .set({
          rolle: 'host',
          hostKennung: 'irgendein-kennzeichen',
          anzeigename: 'Host',
        })
    );
  });
});

describe('Regressionstest (BUGFIX-005, über den für die manuelle Zurückeroberung genutzten Schreibpfad): ein bereits bestehendes, andersrolliges Dokument darf auch hier nicht überschrieben werden', () => {
  test('Gegeben eine Spielende ist bereits Teil von Spiel A (eigenes Dokument mit rolle="spielende"), wenn sie (dieselbe uid) mit einer korrekten Host-Kennung versucht, ihr eigenes Dokument per merge-Update auf rolle="host" zu setzen, dann wird der Schreibversuch abgelehnt', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.doc(`spiele/${GAME_A}`).set({
        erstelltAm: Date.now(),
        letzteAktivitaet: Date.now(),
        belegteStationen: { packstation: 'spielerin-a' },
      });
      await db.doc(`spiele/${GAME_A}/geheim/kennung`).set({ hostKennung: 'host-secret-a' });
      await db.doc(`spiele/${GAME_A}/teilnehmende/spielerin-a`).set({
        rolle: 'spielende',
        station: 'packstation',
        anzeigename: 'Spielerin A',
      });
    });

    const spielerKontext = testEnv.authenticatedContext('spielerin-a');
    await assertFails(
      spielerKontext
        .firestore()
        .doc(`spiele/${GAME_A}/teilnehmende/spielerin-a`)
        .set(
          {
            rolle: 'host',
            hostKennung: 'host-secret-a',
            wiederhergestelltAm: Date.now(),
          },
          { merge: true }
        )
    );
  });
});

describe('Regressionstest / Kontrollfall: eine korrekte Host-Zurückeroberung ohne station-Feld bleibt weiterhin erlaubt (FEATURE-001/Option A unverändert)', () => {
  test('Gegeben ein Spiel mit gültiger Host-Kennung, wenn eine neue uid mit korrektem Kennzeichen ihr eigenes teilnehmende-Dokument mit rolle="host" OHNE station-Feld anlegt, dann wird der Schreibversuch erlaubt', async () => {
    await seedGameAMitGueltigerKennung();
    const neuesGeraetKontext = testEnv.authenticatedContext('host-neues-geraet');
    await assertSucceeds(
      neuesGeraetKontext
        .firestore()
        .doc(`spiele/${GAME_A}/teilnehmende/host-neues-geraet`)
        .set({
          rolle: 'host',
          hostKennung: 'host-secret-a',
          anzeigename: 'Host',
        })
    );
  });
});
