/**
 * BUGFIX-005 – Beitreten vergibt fälschlich Gastgeber-Rolle statt
 * Mitspieler-Rolle.
 * BDD-Tests (flow-game-bdd, 2026-07-28) für die freigegebene Spec in
 * Backlog.md ("### BUGFIX-005"), Freigabe-Entscheidung 1 (serverseitige
 * Härtung in firestore.rules, Option B): ein Host-Claim-Schreibvorgang darf
 * niemals ein bereits bestehendes, andersrolliges Teilnehmenden-Dokument
 * überschreiben.
 *
 * AUSFÜHRUNGSHINWEIS (Pflichtangabe laut flow-game-bdd-Skill Schritt 4a):
 * Diese Datei konnte in dieser Sandbox NICHT ausgeführt werden. Der
 * Firestore-Emulator-JAR-Download, den `firebase emulators:exec` benötigt,
 * ist durch die Organisations-Egress-Policy blockiert:
 *   `Error: download failed, status 403: request rejected: host not
 *   permitted` (verifiziert 2026-07-28, `npx firebase emulators:exec --only
 *   firestore "echo ok"`).
 * Das ist dieselbe, bereits im Testplan-Grundgerüst der freigegebenen Spec
 * vorab benannte Einschränkung ("Ausführung in dieser Sandbox bekannt
 * eingeschränkt ... von Stephan lokal zu bestätigen"). Diese Datei ist daher
 * geschrieben, aber NICHT selbst als "rot bestätigt" verifiziert – das muss
 * vor Abschluss von BUGFIX-005 lokal nachgeholt werden (`npm run
 * test:emulator:bugfix-005` – Skript ist unten als Vorschlag benannt, muss
 * ggf. noch in package.json ergänzt werden), analog zum bereits etablierten
 * Vorgehen bei allen anderen *.security.rules.test.js-Dateien in diesem
 * Projekt.
 *
 * WICHTIGER BEFUND aus der Root-Cause-Verifikation (siehe
 * tests/game-join-precedence.static.test.js für Details): Die bestehende
 * `allow update`-Regel für teilnehmende/{uid} (firestore.rules, Zeile
 * 542-545: `request.resource.data.rolle == resource.data.rolle`) verhindert
 * schon HEUTE, dass ein `.set(data, {merge:true})`-Schreibvorgang auf ein
 * BEREITS BESTEHENDES Dokument dessen Rolle ändert – ein merge-Update ist
 * für die Firestore-Regel-Auswertung ein "update", nicht ein "create", sobald
 * das Zieldokument schon existiert. Der erste Testfall unten prüft deshalb
 * ausdrücklich, OB diese bereits bestehende Regel den in Option B
 * beschriebenen Angriffsfall bereits abdeckt, oder ob eine Lücke bleibt
 * (z. B. wenn die Regel-Auswertung für merge-Writes anders funktioniert als
 * hier angenommen) – das Ergebnis dieses konkreten Testfalls entscheidet,
 * ob Freigabe-Entscheidung 1 eine echte Regeländerung erfordert oder nur
 * einen zusätzlichen, dokumentierenden Regressionstest.
 *
 * Framework: Jest + @firebase/rules-unit-testing (Firestore-Emulator),
 * gleiches Muster wie tests/game-rooms.security.rules.test.js.
 * Voraussetzung zum Ausführen: `firebase emulators:exec --only firestore
 * "jest tests/game-host-claim-overwrite.security.rules.test.js"`
 */

const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require('@firebase/rules-unit-testing');
const fs = require('fs');
const path = require('path');

let testEnv;

const PROJECT_ID = 'flow-game-19f01-test-bugfix-005';
const GAME_A = 'game-a';

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

beforeEach(async () => {
  await testEnv.clearFirestore();
});

/**
 * Legt Spiel A mit gültiger Host-Kennung sowie einer bereits beigetretenen
 * Spielenden ("spielerin-a") an – per Admin-Kontext, umgeht Regeln (reiner
 * Testaufbau, gleiches Muster wie seedGameA() in
 * tests/game-rooms.security.rules.test.js).
 *
 * Feldabgleich gegen firestore.rules (Pflichtschritt 3a des
 * flow-game-bdd-Skills): identisch zur bereits bestehenden, gegen die
 * echten Regeln verifizierten seedGameA()-Hilfsfunktion übernommen – spiele/
 * {id} braucht {code, erstelltAm, letzteAktivitaet, belegteStationen} für
 * istAktiv()/istTeilnehmer(), geheim/kennung braucht ausschließlich
 * {hostKennung} (hasOnly-Regel), teilnehmende/{uid} braucht {rolle,
 * anzeigename, ggf. station/hostKennung}.
 */
async function seedGameAMitBeigetretenerSpielerin() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.doc(`spiele/${GAME_A}`).set({
      code: 'AB3DE7GK',
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
}

async function seedGameAMitHost() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.doc(`spiele/${GAME_A}`).set({
      code: 'AB3DE7GK',
      erstelltAm: Date.now(),
      letzteAktivitaet: Date.now(),
      belegteStationen: {},
    });
    await db.doc(`spiele/${GAME_A}/geheim/kennung`).set({ hostKennung: 'host-secret-a' });
    await db.doc(`spiele/${GAME_A}/teilnehmende/host-a`).set({
      rolle: 'host',
      anzeigename: 'Host A',
      hostKennung: 'host-secret-a',
    });
  });
}

describe('Härtung (Freigabe-Entscheidung 1 / Option B): ein Host-Claim-Schreibvorgang darf ein bereits bestehendes, andersrolliges Teilnehmenden-Dokument nicht überschreiben', () => {
  test('Gegeben eine Spielende ist bereits Teil von Spiel A (eigenes Dokument mit rolle="spielende"), wenn sie (dieselbe uid) mit einer korrekten Host-Kennung per merge-Update versucht, ihr eigenes Dokument auf rolle="host" zu setzen, dann wird der Schreibversuch abgelehnt', async () => {
    await seedGameAMitBeigetretenerSpielerin();
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

describe('Regressionstest FEATURE-001 (AK3, Update-Pfad): der echte Host bekommt nach eigenem Neuladen weiterhin zuverlässig seine Moderationsrolle zurück, auch wenn das Dokument (anders als im bereits bestehenden Create-Pfad-Test) schon existiert', () => {
  test('Gegeben ein bestehendes Host-Dokument (rolle bereits "host") für dieselbe uid, wenn derselbe Host mit korrekter Kennung erneut per merge-Update schreibt (eigenes Neuladen), dann wird es weiterhin erlaubt', async () => {
    await seedGameAMitHost();
    const hostKontext = testEnv.authenticatedContext('host-a');
    await assertSucceeds(
      hostKontext
        .firestore()
        .doc(`spiele/${GAME_A}/teilnehmende/host-a`)
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

describe('Regressionstest FEATURE-001 (bereits bestehend, hier als Kontrollfall wiederholt): ein frischer Host-Claim auf ein NEUES, noch nicht existierendes Dokument bleibt möglich', () => {
  test('Gegeben Spiel A hat noch kein Teilnehmenden-Dokument für diese neue uid, wenn mit korrekter Host-Kennung ein neues Dokument mit rolle="host" angelegt wird, dann wird es erlaubt', async () => {
    await seedGameAMitHost();
    const neuesGeraetKontext = testEnv.authenticatedContext('host-a-neues-geraet');
    await assertSucceeds(
      neuesGeraetKontext
        .firestore()
        .doc(`spiele/${GAME_A}/teilnehmende/host-a-neues-geraet`)
        .set({
          rolle: 'host',
          hostKennung: 'host-secret-a',
          anzeigename: 'Host A',
        })
    );
  });
});
