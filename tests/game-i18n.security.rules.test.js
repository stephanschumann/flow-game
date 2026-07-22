/**
 * FEATURE-006 – Mehrsprachigkeit (Deutsch/Englisch)
 * Sicherheitsregel-Tests (Firestore Security Rules) über den Firebase Emulator.
 *
 * Grundlage: Analyse-Spec in Backlog.md, Abschnitt "FEATURE-006", freigegeben
 * am 2026-07-21 (Option A: rein clientseitiges Übersetzungssystem, ABER ein
 * neues, spielweites Sprachfeld auf dem Spiel-Dokument, das ausschliesslich
 * der Host setzen/ändern darf – auch während das Spiel bereits läuft, siehe
 * AK 8/9 und Pre-Mortem-Risiko 3).
 *
 * NAMENSGEBUNG (eigene, begründete Festlegung dieser BDD-Phase, da die Spec
 * bewusst nur beobachtbares Verhalten beschreibt): Das neue Feld heisst
 * `sprache` (Werte ausschliesslich 'de' | 'en') und liegt DIREKT auf
 * `spiele/{spielId}` (nicht in einer Unterkollektion) – analog zu den
 * bestehenden Feldern `code`/`aktuelleRunde`/`ergebnisseFreigegeben` auf
 * demselben Dokument. Falls flow-game-impl einen anderen Feldnamen oder
 * Speicherort wählt, bitte diese Tests entsprechend anpassen statt sie
 * stillschweigend zu ignorieren (gleiches Vorgehen wie beim NAMENSGEBUNG-
 * Hinweis in tests/game-round4.security.rules.test.js).
 *
 * WICHTIG: Diese Tests sind zum Zeitpunkt des Schreibens ERWARTUNGSGEMÄSS ROT.
 * `firestore.rules` kennt das Feld `sprache` bisher überhaupt nicht – die
 * bestehende generische Update-Regel für `spiele/{spielId}` (siehe Kommentar
 * "Ändern (z. B. letzteAktivitaet, belegteStationen beim Beitritt,
 * aktuelleRunde beim Rundenwechsel): nur wer bereits ein eigenes
 * Teilnehmenden-Dokument in diesem aktiven Spiel hat.") erlaubt aktuell JEDER
 * teilnehmenden Person (Host, Spielende, Beobachtende gleichermassen), auch
 * ein neues `sprache`-Feld frei zu setzen – die einzige bestehende Ausnahme
 * betrifft die FEATURE-003-Freigabe-Felder. Ein `assertFails()` unten, der
 * einen Nicht-Host-Schreibversuch auf `sprache` prüft, schlägt deshalb aktuell
 * als TEST fehl (die Regel erlaubt den Schreibversuch fälschlich), NICHT weil
 * das Vorhaben falsch wäre – das ist der gewünschte "Red"-Zustand vor
 * `flow-game-impl` (siehe Pre-Mortem-Risiko 3).
 */

const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');
const {
  doc, setDoc, updateDoc, serverTimestamp,
} = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'flow-game-feature-006-test';
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
 * Legt ein Spiel mit Host + einer Person je Rolle an (Muster aus
 * tests/game-round.security.rules.test.js), inklusive einer BEREITS
 * LAUFENDEN Runde 1 (DoR abgeschlossen, Durchlaufzeit bereits gestartet) –
 * nötig, um AK 9 ("Host kann die Sprache auch noch ändern, während das Spiel
 * bereits läuft") realistisch abzubilden, statt nur den Zustand direkt nach
 * dem Erstellen zu prüfen.
 */
async function seedLaufendesSpiel({
  code = 'ABCD6006',
  hostUid = 'host-1',
  sprache = 'en',
} = {}) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, `spiele/${code}`), {
      code,
      erstelltAm: Date.now(),
      letzteAktivitaet: Date.now(),
      belegteStationen: { wareneingang: 'spieler-station-1' },
      aktuelleRunde: 1,
      sprache,
    });
    await setDoc(doc(db, `spiele/${code}/geheim/kennung`), { hostKennung: 'geheimes-host-secret' });
    await setDoc(doc(db, `spiele/${code}/teilnehmende/${hostUid}`), { rolle: 'host' });
    await setDoc(doc(db, `spiele/${code}/teilnehmende/spieler-station-1`), {
      rolle: 'spielende', station: 1,
    });
    await setDoc(doc(db, `spiele/${code}/teilnehmende/beobachter-1`), { rolle: 'beobachtende' });
    // Runde läuft bereits (DoR abgeschlossen, Durchlaufzeit gestartet) – Beleg
    // dafür, dass ein Sprachwechsel mitten im Spiel geprüft wird, nicht nur
    // direkt nach dem Erstellen.
    await setDoc(doc(db, `spiele/${code}/runden/1`), {
      phase: 'dor_abgeschlossen',
      dorAbgeschlossen: true,
      durchlaufzeitStart: new Date(),
      bearbeitungszeitStart: new Date(),
      durchlaufzeitEnde: null,
    });
    await setDoc(doc(db, `spiele/${code}/runden/1/karten/karte-1`), {
      position: 1, letzteBewegungVon: null, letzteBewegungAm: null,
    });
  });
  return code;
}

describe('FEATURE-006 Sicherheitsregeln: Spielweites Sprachfeld auf spiele/{spielId} (AK 8, 9 / Pre-Mortem-Risiko 3)', () => {
  test('Szenario: Der Host darf die Spielsprache setzen, auch während eine Runde bereits läuft', async () => {
    // Given: Ein laufendes Spiel mit sprache: 'en', Runde 1 bereits gestartet
    const code = await seedLaufendesSpiel({ sprache: 'en' });
    const host = testEnv.authenticatedContext('host-1');

    // When: Der Host wechselt die Sprache auf Deutsch
    const aenderung = updateDoc(doc(host.firestore(), `spiele/${code}`), { sprache: 'de' });

    // Then: Die Änderung wird angenommen
    await assertSucceeds(aenderung);
  });

  test('Szenario: Eine mitspielende Person (nicht Host) darf die Spielsprache NICHT ändern', async () => {
    // Given: Ein laufendes Spiel mit sprache: 'en'
    const code = await seedLaufendesSpiel({ sprache: 'en' });
    const spielerNichtHost = testEnv.authenticatedContext('spieler-station-1');

    // When: Die spielende Person versucht, die Sprache selbst auf Deutsch zu ändern
    const aenderung = updateDoc(doc(spielerNichtHost.firestore(), `spiele/${code}`), { sprache: 'de' });

    // Then: Der Schreibversuch wird abgelehnt
    await assertFails(aenderung);
  });

  test('Szenario: Eine beobachtende Person darf die Spielsprache ebenfalls NICHT ändern', async () => {
    // Given: Ein laufendes Spiel mit sprache: 'en'
    const code = await seedLaufendesSpiel({ sprache: 'en' });
    const beobachterKontext = testEnv.authenticatedContext('beobachter-1');

    // When: Die beobachtende Person versucht, die Sprache zu ändern
    const aenderung = updateDoc(doc(beobachterKontext.firestore(), `spiele/${code}`), { sprache: 'de' });

    // Then: Der Schreibversuch wird abgelehnt
    await assertFails(aenderung);
  });

  test('Szenario: Ein huckepack-Versuch (Sprachfeld gebündelt mit einer sonst erlaubten Aktualisierung) durch eine Nicht-Host-Person wird ebenfalls abgelehnt', async () => {
    // Given: Ein laufendes Spiel; letzteAktivitaet darf eine mitspielende
    // Person laut FEATURE-001/002 grundsätzlich weiterhin aktualisieren.
    const code = await seedLaufendesSpiel({ sprache: 'en' });
    const spielerNichtHost = testEnv.authenticatedContext('spieler-station-1');

    // When: Sie versucht, das Sprachfeld huckepack mit letzteAktivitaet zu ändern
    const aenderung = updateDoc(doc(spielerNichtHost.firestore(), `spiele/${code}`), {
      letzteAktivitaet: Date.now(),
      sprache: 'de',
    });

    // Then: Der GESAMTE Schreibversuch wird abgelehnt, weil er das Host-only-Feld berührt
    await assertFails(aenderung);
  });

  test('Szenario: Nur die beiden zulässigen Sprachwerte ("de"/"en") werden akzeptiert – auch wenn der Host schreibt', async () => {
    // Given: Ein laufendes Spiel mit sprache: 'en'
    const code = await seedLaufendesSpiel({ sprache: 'en' });
    const host = testEnv.authenticatedContext('host-1');

    // When: Der Host versucht, einen nicht unterstützten Sprachwert zu setzen
    const aenderung = updateDoc(doc(host.firestore(), `spiele/${code}`), { sprache: 'fr' });

    // Then: Der Schreibversuch wird abgelehnt (Datenintegrität, nur 'de'/'en' zulässig)
    await assertFails(aenderung);
  });

  test('Regression TASK-002: Unauthentifizierter Schreibversuch auf die Spielsprache bleibt abgelehnt', async () => {
    // Given: Ein laufendes Spiel mit sprache: 'en'
    const code = await seedLaufendesSpiel({ sprache: 'en' });
    const anonym = testEnv.unauthenticatedContext();

    // When: Ohne Auth-Sitzung wird versucht, die Sprache zu ändern
    const aenderung = updateDoc(doc(anonym.firestore(), `spiele/${code}`), { sprache: 'de' });

    // Then: Der Schreibversuch bleibt abgelehnt
    await assertFails(aenderung);
  });

  test('Regressionsschutz FEATURE-002: Der bestehende Host-only-Rundenwechsel bleibt von der neuen Sprachregel unberührt', async () => {
    // Given: Runde 1 ist beendet (gleicher Aufbau wie in
    // tests/game-round.security.rules.test.js, "Rundenwechsel-Auslösung durch
    // den Host wird angenommen") – dieser Test stellt sicher, dass das
    // Hinzufügen der neuen sprache-Regel die bestehende Rundenwechsel-Logik
    // nicht versehentlich mit sperrt oder öffnet.
    const code = await seedLaufendesSpiel({ sprache: 'en' });
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await updateDoc(doc(context.firestore(), `spiele/${code}/runden/1`), {
        phase: 'beendet',
        durchlaufzeitEnde: new Date(),
      });
    });
    const host = testEnv.authenticatedContext('host-1');
    const spielerNichtHost = testEnv.authenticatedContext('spieler-station-1');

    // When/Then: Host darf weiterhin die nächste Runde starten
    await assertSucceeds(setDoc(doc(host.firestore(), `spiele/${code}/runden/2`), {
      phase: 'aufgabe_vorgestellt',
      dorAbgeschlossen: false,
      durchlaufzeitStart: serverTimestamp(),
      bearbeitungszeitStart: null,
      durchlaufzeitEnde: null,
    }));

    // When/Then: Eine Nicht-Host-Person darf das weiterhin NICHT
    await assertFails(setDoc(doc(spielerNichtHost.firestore(), `spiele/${code}/runden/3`), {
      phase: 'aufgabe_vorgestellt',
      dorAbgeschlossen: false,
      durchlaufzeitStart: serverTimestamp(),
      bearbeitungszeitStart: null,
      durchlaufzeitEnde: null,
    }));
  });
});
