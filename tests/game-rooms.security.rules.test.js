/**
 * FEATURE-001 – Phase 1: Spiel-Räume
 * Sicherheitsregel-Tests (Firestore Security Rules) über den Firebase Emulator.
 *
 * Diese Datei prüft die spielraum-/rollenbasierten Regeln, die die aktuelle
 * Sperr-Regel aus TASK-002 (`allow read, write: if false;`) ablösen.
 *
 * ÄNDERUNG (flow-game-impl, 2026-07-17, mit Stephan abgestimmt): Ursprünglich
 * gingen diese Tests von Auth-Custom-Claims aus. Jetzt: Zugehörigkeit zu einem
 * Spiel wird darüber geprüft, ob unter spiele/{spielId}/teilnehmende/{eigene-
 * Auth-UID} ein Dokument existiert.
 *
 * ÄNDERUNG 2 (2026-07-17, nach echtem Browser-Test durch Stephan):
 *  - hostKennung liegt jetzt in einem eigenen, nie client-lesbaren
 *    Unterdokument spiele/{spielId}/geheim/kennung statt direkt im
 *    spiele-Dokument (Vertraulichkeit: das oberste Spiel-Dokument muss für
 *    den Beitritts-Fluss breit lesbar sein).
 *  - Das oberste spiele/{spielId}-Dokument ist jetzt für jede angemeldete
 *    Person lesbar (nötig für Code-Prüfung/Stationsverfügbarkeit vor dem
 *    Beitritt) – nur die Teilnehmendenliste (mit echten Namen/Rollen/Status)
 *    bleibt strikt auf die eigenen Mitspielenden beschränkt. Das
 *    "Getrennte Spiele"-Szenario wurde entsprechend in zwei Tests
 *    aufgeteilt, die diese beiden unterschiedlichen Sichtbarkeitsstufen
 *    einzeln abbilden.
 *  - Host-Zurückeroberung: die Host-Kennung wird jetzt per getAfter() gegen
 *    spiele/{spielId}/geheim/kennung geprüft statt gegen ein Feld im
 *    spiele-Dokument.
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
 */
async function seedGameA() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.doc(`spiele/${GAME_A}`).set({
      code: 'AB3DE7GK',
      erstelltAm: Date.now(),
      letzteAktivitaet: Date.now(),
      belegteStationen: { packstation: 'spielerin-a' },
    });
    await db.doc(`spiele/${GAME_A}/geheim/kennung`).set({ hostKennung: 'host-secret-a' });
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
 * Aufruf (mehrere getrennte Aufrufe in einem Test führten real im Emulator
 * zu "Firestore has already been started..." – siehe frühere Korrektur).
 */
async function seedGameAUndB() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.doc(`spiele/${GAME_A}`).set({
      code: 'AB3DE7GK',
      erstelltAm: Date.now(),
      letzteAktivitaet: Date.now(),
      belegteStationen: { packstation: 'spielerin-a' },
    });
    await db.doc(`spiele/${GAME_A}/geheim/kennung`).set({ hostKennung: 'host-secret-a' });
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
      erstelltAm: Date.now(),
      letzteAktivitaet: Date.now(),
      belegteStationen: {},
    });
    await db.doc(`spiele/${GAME_B}/geheim/kennung`).set({ hostKennung: 'host-secret-b' });
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

  describe('Szenario: Minimale Spiel-Metadaten sind bewusst codebasiert lesbar, Teilnehmendendaten bleiben getrennt', () => {
    test('Gegeben Spiel A und Spiel B, wenn eine Person aus Spiel B die minimalen Metadaten von Spiel A liest (Code-Prüfung/Stationsverfügbarkeit vor dem Beitritt), dann wird das erlaubt', async () => {
      await seedGameAUndB();
      const spielBKontext = testEnv.authenticatedContext('spielerin-b');
      await assertSucceeds(
        spielBKontext.firestore().doc(`spiele/${GAME_A}`).get()
      );
    });

    test('Gegeben Spiel A und Spiel B, wenn eine Person aus Spiel B versucht, die Teilnehmendenliste von Spiel A zu lesen, dann wird es abgelehnt (Spielstand/Teilnehmende bleiben getrennt)', async () => {
      await seedGameAUndB();
      const spielBKontext = testEnv.authenticatedContext('spielerin-b');
      await assertFails(
        spielBKontext.firestore().collection(`spiele/${GAME_A}/teilnehmende`).get()
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

  describe('Szenario: Niemand ausser dem Host selbst kann das Host-Teilnehmenden-Dokument lesen (Vertraulichkeit der Host-Kennung)', () => {
    test('Gegeben eine Spielende ist Teil von Spiel A, wenn sie versucht, das Teilnehmenden-Dokument des Hosts zu lesen, dann wird es abgelehnt', async () => {
      await seedGameA();
      const spielerKontext = testEnv.authenticatedContext('spielerin-a');
      await assertFails(
        spielerKontext.firestore().doc(`spiele/${GAME_A}/teilnehmende/host-a`).get()
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
          erstelltAm: Date.now() - 30 * 60 * 60 * 1000,
          letzteAktivitaet: Date.now() - 25 * 60 * 60 * 1000, // 25h inaktiv
          belegteStationen: {},
        });
        await db.doc(`spiele/${GAME_A}/geheim/kennung`).set({ hostKennung: 'host-secret-a' });
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