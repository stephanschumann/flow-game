/**
 * FEATURE-003 – Phase 3: Auswertung — Sicherheitsregeln (Firestore)
 *
 * Given/When/Then-Testfälle, umgesetzt mit Jest + @firebase/rules-unit-testing
 * gegen den Firestore-Emulator — gleiches Testmuster wie FEATURE-001/FEATURE-002
 * (tests/game-round.security.rules.test.js).
 *
 * Architektur (Option A, mit Stephan am 2026-07-18 bestätigt, siehe
 * FEATURE-003-Spec.md):
 *   - Kennzahlen liegen als zusätzliche Felder auf dem bereits aus FEATURE-002
 *     bestehenden Runden-Dokument spiele/{code}/runden/{n}: durchlaufzeit,
 *     bearbeitungszeit, zeitBisErsterLieferung, zeitBisLetzterLieferung,
 *     abstandErsteLetzteLieferung, proStation (Map je Station mit
 *     anzahlBewegungen + beteiligungsspanne). Es entsteht kein neues
 *     Unterdokument.
 *   - Eine einzige Gesamtfreigabe liegt als Flag auf dem Spiel-Dokument:
 *     spiele/{code}.ergebnisseFreigegeben (boolean) +
 *     spiele/{code}.ergebnisseFreigegebenAm (serverTimestamp()).
 *
 * WICHTIGER ARCHITEKTUR-HINWEIS (kein Widerspruch, sondern die Auflösung eines
 * scheinbaren): Firestore-Sicherheitsregeln können bei `get()` kein
 * Feld-Filtering vornehmen — eine Regel entscheidet immer über das GESAMTE
 * Dokument, nie über einzelne Felder. Da laut Option A die Kennzahlenfelder
 * erst NACH Rundenende (phase == 'beendet') überhaupt befüllt werden (Option
 * A, "Nachteil"-Abschnitt der Spec), reicht es aus, den Lesezugriff auf das
 * GESAMTE Runden-Dokument für Nicht-Host-Rollen zu sperren, sobald
 * phase == 'beendet' ist UND ergebnisseFreigegeben noch nicht true ist. Für
 * eine laufende Runde (phase != 'beendet') bleibt das Dokument unverändert
 * lesbar (kein Rückschritt gegenüber FEATURE-002s Live-Spielfeld-Anzeige).
 * Diese Tests gehen von genau dieser Auflösung aus; sollte flow-game-impl
 * einen anderen Weg wählen (z. B. Kennzahlen in einem separaten, host-only
 * lesbaren Unterdokument à la spiele/{code}/geheim/kennung), müssten diese
 * Tests entsprechend angepasst werden.
 *
 * WICHTIG: Diese Tests sind zum Zeitpunkt des Schreibens ERWARTUNGSGEMÄSS ROT.
 * `firestore.rules` deckt bisher nur FEATURE-001 (Spielräume) und FEATURE-002
 * (Kartenbewegung/DoR/Rundenwechsel) ab. Die für FEATURE-003 nötige Sperre der
 * Kennzahlenfelder vor der Freigabe UND die Beschränkung der Freigabe-Aktion
 * auf die Host-Rolle existieren in firestore.rules noch nicht — mehr noch: die
 * BESTEHENDE generische Update-Regel auf spiele/{code} (siehe Kommentar bei
 * "Nur Host darf freigeben" unten) erlaubt aktuell JEDER teilnehmenden Person
 * das Setzen beliebiger Felder (also auch ergebnisseFreigegeben). Einige der
 * unten erwarteten assertFails()-Aufrufe schlagen deshalb nicht wegen eines
 * fehlenden, sondern wegen eines zu weiten bestehenden Rechts fehl — das ist
 * ausdrücklich im jeweiligen Testfall kommentiert.
 */

const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');
const {
  doc, setDoc, updateDoc, serverTimestamp, getDoc, getDocs, collection,
} = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'flow-game-feature-003-test';
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
 * Legt ein Spiel mit fünf Stationen + einer Beobachterin an (Muster aus
 * FEATURE-001/002) und seedet drei gespielte, beendete Runden inklusive
 * serverseitig berechneter Kennzahlenfelder (Option A) sowie den
 * Freigabe-Zustand auf dem Spiel-Dokument.
 *
 * `letzteRundeBeendet = false` simuliert den Pre-Mortem-Fall, dass die
 * letzte gespielte Runde beim Freigabe-Versuch noch nicht abgeschlossen ist.
 */
async function seedAusgewertetesSpiel({
  code = 'EVAL0001',
  hostUid = 'host-1',
  ergebnisseFreigegeben = false,
  anzahlRunden = 3,
  letzteRundeBeendet = true,
} = {}) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, `spiele/${code}`), {
      code,
      hostUid,
      erstelltAm: new Date(),
      letzteAktivitaet: Date.now(),
      aktuelleRunde: anzahlRunden,
      ergebnisseFreigegeben,
      ...(ergebnisseFreigegeben ? { ergebnisseFreigegebenAm: new Date() } : {}),
    });
    await setDoc(doc(db, `spiele/${code}/geheim/kennung`), { hostKennung: 'geheimes-host-secret' });

    const teilnehmende = [
      { uid: hostUid, rolle: 'host' },
      { uid: 'spieler-station-1', rolle: 'spielende', station: 1 },
      { uid: 'spieler-station-2', rolle: 'spielende', station: 2 },
      { uid: 'spieler-station-3', rolle: 'spielende', station: 3 },
      { uid: 'spieler-station-4', rolle: 'spielende', station: 4 },
      { uid: 'spieler-station-5', rolle: 'spielende', station: 5 },
      { uid: 'beobachter-1', rolle: 'beobachtende' },
    ];
    for (const t of teilnehmende) {
      await setDoc(doc(db, `spiele/${code}/teilnehmende/${t.uid}`), t);
    }

    for (let runde = 1; runde <= anzahlRunden; runde += 1) {
      const istLetzteRunde = runde === anzahlRunden;
      const beendet = istLetzteRunde ? letzteRundeBeendet : true;

      const proStation = {};
      for (let station = 1; station <= 5; station += 1) {
        // Bewusst unterschiedliche Beteiligungsspannen je Station/Runde, um
        // sichtbar zu machen, dass nach der Freigabe wirklich ALLE fünf
        // Stationswerte für jede Person einsehbar sind (Entscheidung 3).
        proStation[station] = {
          anzahlBewegungen: 6,
          beteiligungsspanne: 500 * station * runde,
        };
      }

      await setDoc(doc(db, `spiele/${code}/runden/${runde}`), {
        phase: beendet ? 'beendet' : 'dor_abgeschlossen',
        dorAbgeschlossen: true,
        durchlaufzeitStart: new Date(),
        durchlaufzeitEnde: beendet ? new Date() : null,
        bearbeitungszeitStart: new Date(),
        bearbeitungszeitEnde: beendet ? new Date() : null,
        // Kennzahlenfelder (FEATURE-003, Option A) — nur befüllt, wenn die
        // Runde tatsächlich beendet ist, konsistent mit der Spielsequenz.
        ...(beendet ? {
          durchlaufzeit: 9000 - runde * 1000,
          bearbeitungszeit: 8000 - runde * 1000,
          zeitBisErsterLieferung: 3000 - runde * 500,
          zeitBisLetzterLieferung: 5000 - runde * 500,
          abstandErsteLetzteLieferung: 2000 - runde * 200,
          proStation,
        } : {}),
      });

      for (let i = 1; i <= 6; i += 1) {
        await setDoc(doc(db, `spiele/${code}/runden/${runde}/karten/karte-${i}`), {
          position: beendet ? 6 : 4,
          letzteBewegungVon: 'spieler-station-5',
          letzteBewegungAm: new Date(),
        });
      }
    }
  });
  return code;
}

describe('FEATURE-003 Sicherheitsregeln: Sichtbarkeit der Kennzahlen vor der Freigabe', () => {
  test('Szenario: Der Host kann die Kennzahlen einer beendeten Runde jederzeit lesen, auch vor der Gesamtfreigabe', async () => {
    // Given: Runde 1 ist beendet, Kennzahlen stehen serverseitig fest, noch keine Freigabe
    const code = await seedAusgewertetesSpiel({ ergebnisseFreigegeben: false });
    const host = testEnv.authenticatedContext('host-1');

    // When: Der Host liest das Runden-Dokument mit den Kennzahlenfeldern
    const lesevorgang = getDoc(doc(host.firestore(), `spiele/${code}/runden/1`));

    // Then: Der Zugriff wird angenommen
    await assertSucceeds(lesevorgang);
  });

  test('Szenario: Spielende können die Kennzahlen einer beendeten Runde vor der Freigabe NICHT lesen', async () => {
    // Given: Runde 1 ist beendet, Kennzahlen stehen fest, keine Freigabe durch den Host
    const code = await seedAusgewertetesSpiel({ ergebnisseFreigegeben: false });
    const spielender = testEnv.authenticatedContext('spieler-station-1');

    // When: Eine spielende Person versucht, das Runden-Dokument (inkl. Kennzahlen) zu lesen
    const lesevorgang = getDoc(doc(spielender.firestore(), `spiele/${code}/runden/1`));

    // Then: Der Zugriff wird abgelehnt
    await assertFails(lesevorgang);
  });

  test('Szenario: Beobachtende unterliegen vor der Freigabe derselben Sperre wie Spielende (keine Extra-Sichtbarkeit)', async () => {
    // Given: Runde 1 ist beendet, keine Freigabe
    const code = await seedAusgewertetesSpiel({ ergebnisseFreigegeben: false });
    const beobachterin = testEnv.authenticatedContext('beobachter-1');

    // When: Die Beobachterin fragt vor der Freigabe nach den Zwischenständen (Beispiel aus der Spec)
    const lesevorgang = getDoc(doc(beobachterin.firestore(), `spiele/${code}/runden/1`));

    // Then: Der Zugriff wird ebenso abgelehnt wie bei Spielenden — keine zusätzliche Einsicht
    await assertFails(lesevorgang);
  });

  test('Szenario: Eine noch laufende (nicht beendete) Runde bleibt für Spielende weiterhin lesbar (Regressionsschutz FEATURE-002 Live-Spielfeld)', async () => {
    // Given: Die letzte Runde läuft noch (phase != 'beendet'), keine Kennzahlen vorhanden, keine Freigabe
    const code = await seedAusgewertetesSpiel({ ergebnisseFreigegeben: false, letzteRundeBeendet: false });
    const spielender = testEnv.authenticatedContext('spieler-station-1');

    // When: Die spielende Person liest den laufenden Rundenzustand (Phase/DoR fürs Spielfeld)
    const lesevorgang = getDoc(doc(spielender.firestore(), `spiele/${code}/runden/3`));

    // Then: Der Zugriff bleibt angenommen — Sperre gilt ausschliesslich für bereits beendete,
    // aber noch nicht freigegebene Runden, nicht für aktives Gameplay
    await assertSucceeds(lesevorgang);
  });
});

describe('FEATURE-003 Sicherheitsregeln: Sichtbarkeit nach der Gesamtfreigabe', () => {
  test('Szenario: Nach der Gesamtfreigabe können Spielende alle drei gespielten Runden lesen', async () => {
    // Given: Der Host hat die Ergebnisse bereits gesamthaft freigegeben
    const code = await seedAusgewertetesSpiel({ ergebnisseFreigegeben: true });
    const spielender = testEnv.authenticatedContext('spieler-station-3');
    const db = spielender.firestore();

    // When: Die Person liest Runde 1, 2 und 3
    // Then: Alle drei Lesezugriffe werden angenommen — für jede gespielte Runde
    await assertSucceeds(getDoc(doc(db, `spiele/${code}/runden/1`)));
    await assertSucceeds(getDoc(doc(db, `spiele/${code}/runden/2`)));
    await assertSucceeds(getDoc(doc(db, `spiele/${code}/runden/3`)));
  });

  test('Szenario: Nach der Gesamtfreigabe können Beobachtende dieselben Runden lesen wie Spielende', async () => {
    // Given: Freigabe ist bereits erfolgt
    const code = await seedAusgewertetesSpiel({ ergebnisseFreigegeben: true });
    const beobachterin = testEnv.authenticatedContext('beobachter-1');
    const db = beobachterin.firestore();

    // When/Then: Auch die Beobachterin sieht alle drei Runden — inhaltlich identischer Umfang
    await assertSucceeds(getDoc(doc(db, `spiele/${code}/runden/1`)));
    await assertSucceeds(getDoc(doc(db, `spiele/${code}/runden/2`)));
    await assertSucceeds(getDoc(doc(db, `spiele/${code}/runden/3`)));
  });

  test('Szenario: Nach der Freigabe kann die Person an Station 3 auch die Kennzahlen aller anderen vier Stationen einsehen', async () => {
    // Given: Freigabe ist erfolgt — Beispiel direkt aus der Spec (Entscheidung 3)
    const code = await seedAusgewertetesSpiel({ ergebnisseFreigegeben: true });
    const stationDrei = testEnv.authenticatedContext('spieler-station-3');

    // When: Die Person liest das Runden-Dokument (enthält proStation für ALLE fünf Stationen)
    const snapshot = await assertSucceeds(getDoc(doc(stationDrei.firestore(), `spiele/${code}/runden/1`)));

    // Then: Alle fünf Stationswerte sind Teil der gelesenen Daten, nicht nur Station 3
    const daten = snapshot.data();
    expect(Object.keys(daten.proStation).sort()).toEqual(['1', '2', '3', '4', '5']);
  });
});

describe('FEATURE-003 Sicherheitsregeln: Auslösung der Gesamtfreigabe', () => {
  test('Szenario: Der Host löst die Gesamtfreigabe aus, wenn alle gespielten Runden beendet sind', async () => {
    // Given: Alle drei Runden sind beendet, noch keine Freigabe
    const code = await seedAusgewertetesSpiel({ ergebnisseFreigegeben: false, letzteRundeBeendet: true });
    const host = testEnv.authenticatedContext('host-1');

    // When: Der Host löst die eine, gesamthafte Freigabe aus
    const freigabe = updateDoc(doc(host.firestore(), `spiele/${code}`), {
      ergebnisseFreigegeben: true,
      ergebnisseFreigegebenAm: serverTimestamp(),
    });

    // Then: Die Aktion wird angenommen
    await assertSucceeds(freigabe);
  });

  test('Szenario: Freigabe-Versuch, während die letzte gespielte Runde noch nicht beendet ist, wird abgelehnt (Pre-Mortem Risiko 3)', async () => {
    // Given: Runde 3 (die letzte) läuft noch, ist nicht 'beendet'
    const code = await seedAusgewertetesSpiel({ ergebnisseFreigegeben: false, letzteRundeBeendet: false });
    const host = testEnv.authenticatedContext('host-1');

    // When: Der Host versucht dennoch, die Ergebnisse freizugeben
    const verfruehteFreigabe = updateDoc(doc(host.firestore(), `spiele/${code}`), {
      ergebnisseFreigegeben: true,
      ergebnisseFreigegebenAm: serverTimestamp(),
    });

    // Then: Die Aktion wird abgelehnt — verhindert unvollständige Kennzahlen in der Auswertung.
    // HINWEIS: Die aktuelle firestore.rules-Fassung prüft diese Vorbedingung noch nicht — dieser
    // Testfall ist erwartungsgemäß rot, bis flow-game-impl eine entsprechende Zustandsprüfung ergänzt.
    await assertFails(verfruehteFreigabe);
  });

  test('Szenario: Freigabe-Auslösung durch eine spielende Person (nicht Host) wird abgelehnt', async () => {
    // Given: Alle Runden beendet, keine Freigabe
    const code = await seedAusgewertetesSpiel({ ergebnisseFreigegeben: false });
    const spielender = testEnv.authenticatedContext('spieler-station-1');

    // When: Eine spielende Person versucht, selbst die Freigabe auszulösen
    const unerlaubteFreigabe = updateDoc(doc(spielender.firestore(), `spiele/${code}`), {
      ergebnisseFreigegeben: true,
      ergebnisseFreigegebenAm: serverTimestamp(),
    });

    // Then: Die Aktion wird abgelehnt.
    // HINWEIS: Die bestehende generische Update-Regel auf spiele/{code} (aus FEATURE-001,
    // "allow update: if istTeilnehmer(spielId) && istAktiv(...) && code unverändert...") erlaubt
    // aktuell JEDER teilnehmenden Person das Setzen beliebiger Felder — auch ergebnisseFreigegeben.
    // Dieser Testfall ist deshalb erwartungsgemäß rot, nicht weil eine Regel fehlt, sondern weil
    // die bestehende Regel zu weit gefasst ist und in flow-game-impl auf die Host-Rolle
    // eingeschränkt werden muss (siehe Bericht an Stephan).
    await assertFails(unerlaubteFreigabe);
  });

  test('Szenario: Freigabe-Auslösung durch eine Beobachterin (nicht Host) wird abgelehnt', async () => {
    // Given: Alle Runden beendet, keine Freigabe
    const code = await seedAusgewertetesSpiel({ ergebnisseFreigegeben: false });
    const beobachterin = testEnv.authenticatedContext('beobachter-1');

    // When: Die Beobachterin versucht, die Freigabe auszulösen
    const unerlaubteFreigabe = updateDoc(doc(beobachterin.firestore(), `spiele/${code}`), {
      ergebnisseFreigegeben: true,
      ergebnisseFreigegebenAm: serverTimestamp(),
    });

    // Then: Die Aktion wird abgelehnt (gleicher Grund wie beim vorherigen Testfall)
    await assertFails(unerlaubteFreigabe);
  });

  test('Szenario: Ein client-mitgesendeter Zeitstempel statt serverTimestamp() für ergebnisseFreigegebenAm wird abgelehnt', async () => {
    // Given: Alle Runden beendet, keine Freigabe
    const code = await seedAusgewertetesSpiel({ ergebnisseFreigegeben: false });
    const host = testEnv.authenticatedContext('host-1');

    // When: Der Host versucht, einen frei erfundenen Zeitstempel statt serverTimestamp() zu senden
    const manipulierteFreigabe = updateDoc(doc(host.firestore(), `spiele/${code}`), {
      ergebnisseFreigegeben: true,
      ergebnisseFreigegebenAm: new Date('2000-01-01T00:00:00Z'),
    });

    // Then: Die Aktion wird abgelehnt (Regel verlangt request.time / serverTimestamp(), analog FEATURE-002)
    await assertFails(manipulierteFreigabe);
  });

  test('Szenario: Doppelte/gleichzeitige Freigabe-Auslösung durch den Host bleibt wirkungslos-idempotent', async () => {
    // Given: Die Freigabe ist bereits erfolgt (erster Klick war erfolgreich)
    const code = await seedAusgewertetesSpiel({ ergebnisseFreigegeben: true });
    const host = testEnv.authenticatedContext('host-1');

    // When: Der Host löst (z. B. per Doppelklick) die Freigabe ein zweites Mal aus
    const zweiteFreigabe = updateDoc(doc(host.firestore(), `spiele/${code}`), {
      ergebnisseFreigegeben: true,
      ergebnisseFreigegebenAm: serverTimestamp(),
    });

    // Then: Der zweite Versuch darf keinen Fehler werfen (No-Op, kein widersprüchlicher Zustand)
    await assertSucceeds(zweiteFreigabe);
  });
});

describe('FEATURE-003 Regressionstests gegen FEATURE-001/FEATURE-002/TASK-002', () => {
  test('Regression TASK-002: unauthentifiziertes Lesen der Kennzahlen bleibt abgelehnt, auch nach Freigabe', async () => {
    const code = await seedAusgewertetesSpiel({ ergebnisseFreigegeben: true });
    const anonym = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(anonym.firestore(), `spiele/${code}/runden/1`)));
  });

  test('Regression TASK-002: unauthentifizierte Freigabe-Auslösung bleibt abgelehnt', async () => {
    const code = await seedAusgewertetesSpiel({ ergebnisseFreigegeben: false });
    const anonym = testEnv.unauthenticatedContext();
    await assertFails(updateDoc(doc(anonym.firestore(), `spiele/${code}`), {
      ergebnisseFreigegeben: true,
      ergebnisseFreigegebenAm: serverTimestamp(),
    }));
  });

  test('Regression: Kennzahlen eines fremden, freigegebenen Spiels bleiben für Personen aus einem anderen Spiel unerreichbar', async () => {
    // Given: Spiel A ist freigegeben, Spiel B existiert unabhängig davon
    const codeA = await seedAusgewertetesSpiel({ code: 'EVALAAAA', hostUid: 'host-a', ergebnisseFreigegeben: true });
    const codeB = await seedAusgewertetesSpiel({ code: 'EVALBBBB', hostUid: 'host-b', ergebnisseFreigegeben: false });
    // Eigene, garantiert nur in Spiel B vorhandene Person (gleiches Muster wie FEATURE-002-Regressionstest)
    const fremdeUid = 'person-nur-in-spiel-b-eval';
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), `spiele/${codeB}/teilnehmende/${fremdeUid}`), {
        rolle: 'spielende', station: 1,
      });
    });
    const dbNurInB = testEnv.authenticatedContext(fremdeUid).firestore();

    // When/Then: Trotz Freigabe in Spiel A bleibt der Zugriff für eine dort nicht teilnehmende Person abgelehnt
    await assertFails(getDoc(doc(dbNurInB, `spiele/${codeA}/runden/1`)));
  });
});
