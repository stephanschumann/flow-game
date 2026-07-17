/**
 * FEATURE-001 – Phase 1: Spiel-Räume
 * Sicherheitsregel-Tests (Firestore Security Rules) über den Firebase Emulator.
 *
 * Diese Datei prüft die spielraum-/rollenbasierten Regeln, die die aktuelle
 * Sperr-Regel aus TASK-002 (`allow read, write: if false;`) ablösen.
 *
 * ÄNDERUNG (flow-game-impl, 2026-07-17, mit Stephan abgestimmt): Ursprünglich
 * gingen diese Tests von Auth-Custom-Claims (spielId/rolle/hostKennung direkt
 * im Token) aus. Custom Claims lassen sich ohne Server/Cloud Function nicht
 * setzen – das widerspricht der getroffenen Entscheidung "keine Cloud
 * Functions" (Product.md §10). Stephan hat sich für Option B entschieden:
 * Zugehörigkeit zu einem Spiel wird stattdessen darüber geprüft, ob unter
 * spiele/{spielId}/teilnehmende/{eigene-Auth-UID} ein Dokument existiert.
 * Die Host-Session-Wiederherstellung läuft über einen "create"-Schreibvorgang
 * auf das eigene Teilnehmenden-Dokument, der die im Spieldokument hinterlegte
 * hostKennung als Nachweis verlangt (statt eines "update" mit Auth-Claim).
 * Die fachlichen Given/When/Then-Szenarien selbst sind unverändert, nur die
 * technische Simulation der Auth-Identität (jetzt: reine UID statt Claims-Objekt).
 *
 * KORREKTUR (2026-07-17, nach Stephans erstem echten Emulator-Lauf): Der
 * Test "Getrennte Spiele" nutzte ursprünglich zwei getrennte
 * withSecurityRulesDisabled-Aufrufe in einem Test (seedGameA() + ein
 * zweiter eigener Block für Spiel B) – das führte real im Emulator zu
 * "FirebaseError: Firestore has already been started and its settings can
 * no longer be changed." Jetzt: genau EIN withSecurityRulesDisabled-Aufruf,
 * der beide Spiele in einem Rutsch seedet.
 *
 * Framework: Jest + @firebase/rules-unit-testing (Firestore-Emulator).
 * Voraussetzung zum Ausführen: `firebase emulators:exec --only firestore "jest tests/game-rooms.security.rules.test.js"`
 */

const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require('@firebase/rules-unit-testing');
const fs = require('fs');
const path = require('path');

let testEnv;

const PROJECT_ID = 'flow-game-19f01-test';

// Feste Test-Spiel-IDs, um Szenarien reproduzierbar zu machen.
const GAME_A = 'game-a';
const GAME_B = 'game-b';

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync(
        path.resolve(__dirname, '../firestore.rules'),
        'utf8'
      ),
      host: 'localhost',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

/**
 * Hilfsfunktion: legt Spiel A mit einem Host, einem Spielenden (Station "packstation")
 * und einer Beobachterin an, per Admin-Kontext (umgeht Regeln, reiner Testaufbau).
 * Die Teilnehmenden-Dokument-IDs entsprechen den Auth-UIDs, mit denen die
 * jeweilige Person in den Tests unten auftritt (uid == Dokument-ID, wie es die
 * echten Regeln verlangen).
 */
async function seedGameA() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.doc(`spiele/${GAME_A}`).set({
      code: 'AB3DE7GK',
      hostKennung: 'host-secret-a',
      erstelltAm: Date.now(),
      letzteAktivitaet: Date.now(),
      belegteStationen: { packstation: 'spielerin-a' },
    });
    await db.doc(`spiele/${GAME_A}/teilnehmende/host-a`).set({
      rolle: 'host',
      anzeigename: 'Host A',
      hostKennung: 'host-secret-a',
    });
    await db.doc(`spiele/${GAME_A}/teilnehmende/spielerin-a`).set({
      rolle: 'spielende',
      station: 'packstation',
      anzeigename: 'Spielerin A',
    });
    await db.doc(`spiele/${GAME_A}/teilnehmende/beobachterin-a`).set({
      rolle: 'beobachtende',
      anzeigename: 'Beobachterin A',
    });
  });
}

/**
 * Seedet Spiel A UND Spiel B in einem einzigen withSecurityRulesDisabled-
 * Aufruf (siehe Korrektur-Hinweis oben) – ausschliesslich für den
 * "Getrennte Spiele"-Test unten, der Daten aus beiden Spielen braucht.
 */
async function seedGameAUndB() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.doc(`spiele/${GAME_A}`).set({
      code: 'AB3DE7GK',
      hostKennung: 'host-secret-a',
      erstelltAm: Date.now(),
      letzteAktivitaet: Date.now(),
      belegteStationen: { packstation: 'spielerin-a' },
    });
    await db.doc(`spiele/${GAME_A}/teilnehmende/host-a`).set({
      rolle: 'host',
      anzeigename: 'Host A',
      hostKennung: 'host-secret-a',
    });
    await db.doc(`spiele/${GAME_A}/teilnehmende/spielerin-a`).set({
      rolle: 'spielende',
      station: 'packstation',
      anzeigename: 'Spielerin A',
    });
    await db.doc(`spiele/${GAME_B}`).set({
      code: 'ZZ9YY8XX',
      hostKennung: 'host-secret-b',
      erstelltAm: Date.now(),
      letzteAktivitaet: Date.now(),
      belegteStationen: {},
    });
    await db.doc(`spiele/${GAME_B}/teilnehmende/spielerin-b`).set({
      rolle: 'spielende',
      anzeigename: 'Spielerin B',
    });
  });
}

describe('FEATURE-001 – Spielraum-Sicherheitsregeln', () => {
  describe('Szenario: Eigenes Spiel in eigener Rolle funktioniert', () => {
    test('Gegeben ein Spielender mit Rolle in Spiel A, wenn er sein eigenes Spieldokument liest, dann wird es erlaubt', async () => {
      await seedGameA();
      const spielerKontext = testEnv.authenticatedContext('spielerin-a');
      await assertSucceeds(
        spielerKontext.firestore().doc(`spiele/${GAME_A}`).get()
      );
    });

    test('Gegeben ein Spielender mit Rolle in Spiel A, wenn er einen eigenen gültigen Spielzug schreibt, dann wird es erlaubt', async () => {
      await seedGameA();
      const spielerKontext = testEnv.authenticatedContext('spielerin-a');
      await assertSucceeds(
        spielerKontext
          .firestore()
          .doc(`spiele/${GAME_A}/teilnehmende/spielerin-a`)
          .update({ letzteAktion: Date.now() })
      );
    });
  });

  describe('Szenario: Fremdes Spiel lesen/schreiben wird abgelehnt', () => {
    test('Gegeben Spiel A und Spiel B existieren, wenn eine Person ohne Rolle in Spiel A dessen Teilnehmendenliste liest, dann wird es abgelehnt', async () => {
      await seedGameA();
      const fremdeKontext = testEnv.authenticatedContext('unbeteiligt');
      await assertFails(
        fremdeKontext.firestore().collection(`spiele/${GAME_A}/teilnehmende`).get()
      );
    });

    test('Gegeben Spiel A existiert, wenn eine Person ohne Rolle in Spiel A versucht, dort einen Spielzug zu schreiben, dann wird es abgelehnt', async () => {
      await seedGameA();
      const fremdeKontext = testEnv.authenticatedContext('unbeteiligt');
      await assertFails(
        fremdeKontext
          .firestore()
          .doc(`spiele/${GAME_A}/teilnehmende/spielerin-a`)
          .update({ letzteAktion: Date.now() })
      );
    });

    test('Gegeben Spiel A und Spiel B, wenn Teilnehmende aus Spiel B versuchen, den Spielstand von Spiel A zu lesen, dann wird es abgelehnt (Spiele bleiben getrennt)', async () => {
      await seedGameAUndB();
      const spielBKontext = testEnv.authenticatedContext('spielerin-b');
      await assertFails(
        spielBKontext.firestore().doc(`spiele/${GAME_A}`).get()
      );
    });
  });

  describe('Szenario: Beobachterin hat keine Schreibrechte auf Spielzüge', () => {
    test('Gegeben eine Beobachterin ist Teil von Spiel A, wenn sie den Spielstand liest, dann wird es erlaubt', async () => {
      await seedGameA();
      const beobachterKontext = testEnv.authenticatedContext('beobachterin-a');
      await assertSucceeds(
        beobachterKontext.firestore().doc(`spiele/${GAME_A}`).get()
      );
    });

    test('Gegeben eine Beobachterin ist Teil von Spiel A, wenn sie versucht, einen Spielzug eines Spielenden zu schreiben, dann wird es abgelehnt', async () => {
      await seedGameA();
      const beobachterKontext = testEnv.authenticatedContext('beobachterin-a');
      await assertFails(
        beobachterKontext
          .firestore()
          .doc(`spiele/${GAME_A}/teilnehmende/spielerin-a`)
          .update({ letzteAktion: Date.now() })
      );
    });
  });

  describe('Szenario: Host bekommt nach eigenem Neuladen die Moderationsrechte zurück', () => {
    test('Gegeben ein Host mit gültiger Host-Kennung, wenn er (mit ggf. neuer Auth-Sitzung/UID) sein eigenes Teilnehmenden-Dokument als Host neu anlegt, dann wird es erlaubt', async () => {
      await seedGameA();
      const hostKontext = testEnv.authenticatedContext('host-a-neues-geraet');
      await assertSucceeds(
        hostKontext
          .firestore()
          .doc(`spiele/${GAME_A}/teilnehmende/host-a-neues-geraet`)
          .set({
            rolle: 'host',
            hostKennung: 'host-secret-a',
            anzeigename: 'Host A',
          })
      );
    });

    test('Gegeben eine ungültige/fremde Host-Kennung, wenn jemand versucht, sich damit als Host von Spiel A einzutragen, dann wird es abgelehnt', async () => {
      await seedGameA();
      const angreiferKontext = testEnv.authenticatedContext('angreifer');
      await assertFails(
        angreiferKontext
          .firestore()
          .doc(`spiele/${GAME_A}/teilnehmende/angreifer`)
          .set({
            rolle: 'host',
            hostKennung: 'falsches-geheimnis',
            anzeigename: 'Angreifer',
          })
      );
    });
  });

  describe('Regressionstest TASK-002: bereits geprüfte Zugriffsfälle bleiben abgelehnt', () => {
    test('Gegeben Spiel A existiert, wenn unauthentifiziert (kein Auth-Kontext) gelesen wird, dann wird es abgelehnt', async () => {
      await seedGameA();
      const anonymerKontext = testEnv.unauthenticatedContext();
      await assertFails(
        anonymerKontext.firestore().doc(`spiele/${GAME_A}`).get()
      );
    });

    test('Gegeben Spiel A existiert, wenn unauthentifiziert (kein Auth-Kontext) geschrieben wird, dann wird es abgelehnt', async () => {
      await seedGameA();
      const anonymerKontext = testEnv.unauthenticatedContext();
      await assertFails(
        anonymerKontext
          .firestore()
          .doc(`spiele/${GAME_A}`)
          .update({ letzteAktivitaet: Date.now() })
      );
    });

    test('Gegeben Spiel A existiert, wenn mit einer Auth-Sitzung ohne echte Rolle in diesem Spiel geschrieben wird, dann wird es abgelehnt', async () => {
      await seedGameA();
      const fingierterKontext = testEnv.authenticatedContext('fingierte-uid');
      await assertFails(
        fingierterKontext
          .firestore()
          .doc(`spiele/${GAME_A}`)
          .update({ letzteAktivitaet: Date.now() })
      );
    });
  });

  describe('Szenario: Ein Spiel ohne Aktivität seit 24 Stunden ist nicht mehr erreichbar', () => {
    test('Gegeben ein Spiel mit letzteAktivitaet älter als 24 Stunden und eine Person, die dort bereits Teilnehmende ist, wenn sie das Spieldokument liest, dann wird der Zugriff abgelehnt', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.doc(`spiele/${GAME_A}`).set({
          code: 'AB3DE7GK',
          hostKennung: 'host-secret-a',
          erstelltAm: Date.now() - 30 * 60 * 60 * 1000,
          letzteAktivitaet: Date.now() - 25 * 60 * 60 * 1000, // 25h inaktiv
          belegteStationen: {},
        });
        await db.doc(`spiele/${GAME_A}/teilnehmende/neue-person`).set({
          rolle: 'spielende',
          anzeigename: 'Neue Person',
          station: 'wareneingang',
        });
      });
      const beitretenKontext = testEnv.authenticatedContext('neue-person');
      await assertFails(
        beitretenKontext.firestore().doc(`spiele/${GAME_A}`).get()
      );
    });
  });
});
