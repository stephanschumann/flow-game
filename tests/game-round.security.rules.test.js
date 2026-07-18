/**
 * FEATURE-002 – Sicherheitsregeln (Firestore) für "Spielfeld + Runden 1–3"
 *
 * Given/When/Then-Testfälle, umgesetzt mit Jest + @firebase/rules-unit-testing
 * gegen den Firestore-Emulator — gleiches Testmuster wie in FEATURE-001
 * (tests/game-rooms.security.rules.test.js).
 *
 * Datenmodell (Option B, freigegeben 2026-07-18):
 *   spiele/{code}                                  – Metadaten, aktuelle Runde
 *   spiele/{code}/geheim/kennung                   – Host-Passwort (aus FEATURE-001)
 *   spiele/{code}/teilnehmende/{uid}                – Rolle + Station (aus FEATURE-001)
 *   spiele/{code}/runden/{n}                        – Rundenzustand (Phase, DoR, Zeitstempel)
 *   spiele/{code}/runden/{n}/karten/{kartenId}       – eine Karte (Position 0–6, in Runde 2
 *                                                       zusätzlich stapel: "A" | "B")
 *
 * KORREKTUR (flow-game-impl, 2026-07-18): Der ursprünglich in der BDD-Phase
 * geschriebene Testfall "Regression FEATURE-001: Fremdes Spiel lesen bleibt
 * abgelehnt" prüfte das Lesen des OBERSTEN spiele/{code}-Dokuments eines
 * fremden Spiels. Das widerspricht FEATURE-001s eigenem, bereits geprüftem
 * und freigegebenem Verhalten: das oberste spiele/{code}-Dokument ist
 * BEWUSST für jede angemeldete Person lesbar (Grundlage des Beitritts-
 * Flusses – Code-Prüfung/Stationsverfügbarkeit VOR dem Beitritt), siehe
 * tests/game-rooms.security.rules.test.js, Szenario "Minimale Spiel-
 * Metadaten sind bewusst codebasiert lesbar, Teilnehmendendaten bleiben
 * getrennt". Was tatsächlich getrennt bleiben MUSS, ist die
 * Teilnehmendenliste (bereits in FEATURE-001 so geprüft und freigegeben).
 * Dieser Testfall wurde deshalb korrigiert, damit er die tatsächliche,
 * bereits zugesicherte Grenze prüft, statt eine Regression an einer Stelle
 * zu behaupten, an der FEATURE-001 nie eine Abgrenzung zugesagt hatte.
 * Zusätzlich wurde die ursprüngliche uid ('spieler-station-1') ersetzt, weil
 * seedGame() dieselbe feste Namensliste in JEDEM geseedeten Spiel anlegt –
 * eine Person mit diesem Namen wäre also fälschlich auch in Spiel A
 * Teilnehmende gewesen (im Originaltest bereits als Einschränkung
 * kommentiert: "in echt bräuchte man getrennte uids je Spiel; hier als
 * Platzhalter für den Regressionsfall"). Siehe Rückmeldung an Stephan im
 * Abschlussbericht zu FEATURE-002.
 *
 * WICHTIG: Diese Tests sind zum Zeitpunkt des Schreibens ERWARTUNGSGEMÄSS ROT.
 * `firestore.rules` deckt bisher nur FEATURE-001 ab (Spielräume/Beitritt); die Regeln
 * für Kartenbewegung, DoR-Auslösung, Stapel-Tor und Rundenwechsel aus diesem Ticket
 * existieren noch nicht. Das ist der gewünschte "Red"-Zustand vor `flow-game-impl`.
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

const PROJECT_ID = 'flow-game-feature-002-test';
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
 * Legt ein Spiel mit fünf Stationen + einer Beobachterin an (Muster aus FEATURE-001)
 * und startet Runde `runde` mit sechs Karten im Auftragseingang (Position 0).
 * `stapelZuordnung` erlaubt es, in Runde 2 jeder Karte gezielt Stapel A/B mitzugeben.
 */
async function seedGame({
  code = 'ABCD1234',
  hostUid = 'host-1',
  runde = 1,
  dorAbgeschlossen = false,
  stapelZuordnung = null, // z. B. { 'karte-1': 'A', 'karte-2': 'A', 'karte-3': 'A', 'karte-4': 'B', 'karte-5': 'B', 'karte-6': 'B' }
} = {}) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, `spiele/${code}`), {
      hostUid,
      erstelltAm: new Date(),
      // letzteAktivitaet ist Pflichtfeld für istAktiv() in firestore.rules
      // (siehe FEATURE-001) – jedes echte, per createGame.js erzeugte
      // Spiel-Dokument hat es immer. Ohne dieses Feld würde istAktiv() auf
      // einem fehlenden Map-Schlüssel scheitern (Fehler = serverseitige
      // Ablehnung) und JEDEN Testfall in dieser Datei fälschlich verweigern.
      letzteAktivitaet: Date.now(),
      aktuelleRunde: runde,
    });
    await setDoc(doc(db, `spiele/${code}/geheim/kennung`), { hostKennung: 'geheimes-host-secret' });

    const teilnehmende = [
      // KORREKTUR (nach echtem Testlauf mit Stephan, 2026-07-18): seedGame()
      // legte bisher NIE ein eigenes teilnehmende/{hostUid}-Dokument an - nur
      // das hostUid-Feld auf dem obersten spiele/{code}-Dokument. istHost()
      // in firestore.rules prueft aber genau dieses teilnehmende-Dokument
      // (rolle == 'host'), nicht das hostUid-Feld. Ohne dieses Dokument
      // konnte KEIN Host-Testfall je erfolgreich sein - konsistent mit den
      // beobachteten "wird angenommen"-Fehlschlaegen bei DoR-Ausloesung und
      // Rundenwechsel durch den Host.
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

    await setDoc(doc(db, `spiele/${code}/runden/${runde}`), {
      phase: dorAbgeschlossen ? 'dor_abgeschlossen' : 'aufgabe_vorgestellt',
      dorAbgeschlossen,
      durchlaufzeitStart: new Date(),
      bearbeitungszeitStart: null,
      durchlaufzeitEnde: null,
    });

    for (let i = 1; i <= 6; i++) {
      const karte = { position: 0, letzteBewegungVon: null, letzteBewegungAm: null };
      if (runde === 2 && stapelZuordnung) {
        karte.stapel = stapelZuordnung[`karte-${i}`];
      }
      await setDoc(doc(db, `spiele/${code}/runden/${runde}/karten/karte-${i}`), karte);
    }
  });
  return code;
}

/** Setzt per Admin-Kontext gezielt Kartenpositionen, um einen Zwischenzustand vorzubereiten. */
async function setzeKartenPosition(code, runde, kartenId, position, zusatz = {}) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await updateDoc(doc(context.firestore(), `spiele/${code}/runden/${runde}/karten/${kartenId}`), {
      position,
      ...zusatz,
    });
  });
}

describe('FEATURE-002 Sicherheitsregeln: Kartenbewegung (Grundregeln, alle Runden)', () => {
  test('Szenario: Erlaubte Kartenbewegung wird angenommen (eigene Station, ein Schritt, DoR erfüllt, Tor offen)', async () => {
    // Given: Runde 1 läuft, DoR abgeschlossen, Karte 1 liegt bereits an Station 1
    const code = await seedGame({ runde: 1, dorAbgeschlossen: true });
    await setzeKartenPosition(code, 1, 'karte-1', 1);
    // ... und alle sechs Karten sind bereits an Station 1 (Stapel-Tor 6 für Runde 1 offen)
    for (let i = 2; i <= 6; i++) {
      await setzeKartenPosition(code, 1, `karte-${i}`, 1);
    }
    const stationEins = testEnv.authenticatedContext('spieler-station-1');

    // When: Die Person an Station 1 bewegt Karte 1 von Station 1 (1) zu Station 2 (2)
    const zug = updateDoc(doc(stationEins.firestore(), `spiele/${code}/runden/1/karten/karte-1`), {
      position: 2,
      letzteBewegungVon: 'spieler-station-1',
      letzteBewegungAm: serverTimestamp(),
    });

    // Then: Der Zug wird angenommen
    await assertSucceeds(zug);
  });

  test('Szenario: Bewegung fremder Karte wird abgelehnt', async () => {
    // Given: Karte 1 liegt an Station 3, DoR abgeschlossen
    const code = await seedGame({ runde: 1, dorAbgeschlossen: true });
    await setzeKartenPosition(code, 1, 'karte-1', 3);
    const stationEins = testEnv.authenticatedContext('spieler-station-1');

    // When: Die Person an Station 1 versucht, die Karte an Station 3 zu bewegen
    const zug = updateDoc(doc(stationEins.firestore(), `spiele/${code}/runden/1/karten/karte-1`), {
      position: 4,
      letzteBewegungVon: 'spieler-station-1',
      letzteBewegungAm: serverTimestamp(),
    });

    // Then: Der Zug wird abgelehnt
    await assertFails(zug);
  });

  test('Szenario: Bewegung um mehr als einen Schritt wird abgelehnt (Station überspringen)', async () => {
    // Given: Karte 1 liegt an Station 1, DoR abgeschlossen, Stapel-Tor Runde 1 offen (alle 6 an Station 1)
    const code = await seedGame({ runde: 1, dorAbgeschlossen: true });
    for (let i = 1; i <= 6; i++) await setzeKartenPosition(code, 1, `karte-${i}`, 1);
    const stationEins = testEnv.authenticatedContext('spieler-station-1');

    // When: Die Person an Station 1 versucht, Karte 1 direkt zu Station 3 zu bewegen (Station 2 überspringen)
    const zug = updateDoc(doc(stationEins.firestore(), `spiele/${code}/runden/1/karten/karte-1`), {
      position: 3,
      letzteBewegungVon: 'spieler-station-1',
      letzteBewegungAm: serverTimestamp(),
    });

    // Then: Der Zug wird abgelehnt
    await assertFails(zug);
  });

  test('Szenario: Bewegung vor "Definition of Ready" wird abgelehnt', async () => {
    // Given: Runde 1 läuft, DoR NICHT abgeschlossen
    const code = await seedGame({ runde: 1, dorAbgeschlossen: false });
    const stationEins = testEnv.authenticatedContext('spieler-station-1');

    // When: Die Person an Station 1 versucht dennoch, Karte 1 vom Auftragseingang zu bewegen
    const zug = updateDoc(doc(stationEins.firestore(), `spiele/${code}/runden/1/karten/karte-1`), {
      position: 1,
      letzteBewegungVon: 'spieler-station-1',
      letzteBewegungAm: serverTimestamp(),
    });

    // Then: Der Zug wird abgelehnt
    await assertFails(zug);
  });

  test('Szenario: Übergang Auftragseingang → Station 1 ist immer offen, unabhängig vom Stapel-Tor', async () => {
    // Given: Runde 1 läuft, DoR abgeschlossen, aber noch keine einzige Karte an Station 1 (Tor für 1→2 wäre zu)
    const code = await seedGame({ runde: 1, dorAbgeschlossen: true });
    const stationEins = testEnv.authenticatedContext('spieler-station-1');

    // When: Die Person an Station 1 holt Karte 1 aus dem Auftragseingang (Position 0 → 1)
    const zug = updateDoc(doc(stationEins.firestore(), `spiele/${code}/runden/1/karten/karte-1`), {
      position: 1,
      letzteBewegungVon: 'spieler-station-1',
      letzteBewegungAm: serverTimestamp(),
    });

    // Then: Der Zug wird angenommen, ohne dass ein Stapel-Tor geprüft wird
    await assertSucceeds(zug);
  });

  test('Szenario: Direkter Sprung auf Zielposition ohne Zwischenschritte wird abgelehnt (Konsolen-Umgehungsversuch)', async () => {
    // Given: Karte 1 liegt im Auftragseingang, DoR abgeschlossen
    const code = await seedGame({ runde: 1, dorAbgeschlossen: true });
    const stationEins = testEnv.authenticatedContext('spieler-station-1');

    // When: Jemand versucht, Karte 1 über die Konsole direkt auf Position 6 ("Ziel") zu setzen
    const zug = updateDoc(doc(stationEins.firestore(), `spiele/${code}/runden/1/karten/karte-1`), {
      position: 6,
      letzteBewegungVon: 'spieler-station-1',
      letzteBewegungAm: serverTimestamp(),
    });

    // Then: Der Zug wird abgelehnt
    await assertFails(zug);
  });
});

describe('FEATURE-002 Sicherheitsregeln: Stapel-Tor je Runde', () => {
  test('Szenario Runde 1: Bewegung bei noch geschlossenem Stapel-Tor (weniger als 6 an Station 1) wird abgelehnt', async () => {
    // Given: Fünf der sechs Karten sind an Station 1, die sechste noch im Auftragseingang, DoR abgeschlossen
    const code = await seedGame({ runde: 1, dorAbgeschlossen: true });
    for (let i = 1; i <= 5; i++) await setzeKartenPosition(code, 1, `karte-${i}`, 1);
    // karte-6 bleibt auf Position 0
    const stationZwei = testEnv.authenticatedContext('spieler-station-2');

    // When: Die Person an Station 2 versucht, Karte 1 (bereits an Station 1) zu Station 2 weiterzubewegen
    const zug = updateDoc(doc(stationZwei.firestore(), `spiele/${code}/runden/1/karten/karte-1`), {
      position: 2,
      letzteBewegungVon: 'spieler-station-2',
      letzteBewegungAm: serverTimestamp(),
    });

    // Then: Der Zug wird abgelehnt (Stapel-Tor Runde 1 = 6, noch nicht erreicht)
    await assertFails(zug);
  });

  test('Szenario Runde 1: Bewegung bei geöffnetem Stapel-Tor (alle 6 an Station 1) wird angenommen', async () => {
    // Given: Alle sechs Karten sind an Station 1 angekommen, DoR abgeschlossen
    const code = await seedGame({ runde: 1, dorAbgeschlossen: true });
    for (let i = 1; i <= 6; i++) await setzeKartenPosition(code, 1, `karte-${i}`, 1);
    const stationZwei = testEnv.authenticatedContext('spieler-station-2');

    // When: Die Person an Station 2 bewegt Karte 1 weiter
    const zug = updateDoc(doc(stationZwei.firestore(), `spiele/${code}/runden/1/karten/karte-1`), {
      position: 2,
      letzteBewegungVon: 'spieler-station-2',
      letzteBewegungAm: serverTimestamp(),
    });

    // Then: Der Zug wird angenommen
    await assertSucceeds(zug);
  });

  test('Szenario Runde 2: Stapel A vollständig (3) an Station 1, Stapel B unvollständig → Stapel-A-Karte darf weiter, Stapel-B-Karte nicht', async () => {
    // Given: Runde 2, karte-1/2/3 = Stapel A (alle an Station 1), karte-4/5/6 = Stapel B (im Auftragseingang), DoR abgeschlossen
    const code = await seedGame({
      runde: 2,
      dorAbgeschlossen: true,
      stapelZuordnung: {
        'karte-1': 'A', 'karte-2': 'A', 'karte-3': 'A',
        'karte-4': 'B', 'karte-5': 'B', 'karte-6': 'B',
      },
    });
    for (let i = 1; i <= 3; i++) await setzeKartenPosition(code, 2, `karte-${i}`, 1);
    // Eine Karte aus Stapel B ist ebenfalls schon an Station 1, aber noch nicht alle drei
    await setzeKartenPosition(code, 2, 'karte-4', 1);
    const stationZwei = testEnv.authenticatedContext('spieler-station-2');
    // WICHTIG: .firestore() genau EINMAL pro Kontext aufrufen und die Instanz
    // wiederverwenden (siehe Kommentar beim Regressionstest weiter unten) -
    // dieser Testfall rief sie bisher zweimal auf (einmal je Zug) und loeste
    // dadurch denselben "Firestore has already been started"-Fehler aus.
    const dbStationZwei = stationZwei.firestore();

    // When: Die Person an Station 2 bewegt eine Stapel-A-Karte weiter
    const zugA = updateDoc(doc(dbStationZwei, `spiele/${code}/runden/2/karten/karte-1`), {
      position: 2,
      letzteBewegungVon: 'spieler-station-2',
      letzteBewegungAm: serverTimestamp(),
    });
    // Then: Der Zug für Stapel A wird angenommen
    await assertSucceeds(zugA);

    // When: Die Person an Station 2 versucht, die einzelne angekommene Stapel-B-Karte weiterzubewegen
    const zugB = updateDoc(doc(dbStationZwei, `spiele/${code}/runden/2/karten/karte-4`), {
      position: 2,
      letzteBewegungVon: 'spieler-station-2',
      letzteBewegungAm: serverTimestamp(),
    });
    // Then: Der Zug für Stapel B wird abgelehnt (nur 1 von 3 Stapel-B-Karten angekommen)
    await assertFails(zugB);
  });

  test('Szenario Runde 3: Eine einzelne angekommene Karte genügt, damit die nächste Station sie weiterbewegen darf', async () => {
    // Given: Runde 3, DoR abgeschlossen, genau eine Karte ist an Station 1 angekommen
    const code = await seedGame({ runde: 3, dorAbgeschlossen: true });
    await setzeKartenPosition(code, 3, 'karte-1', 1);
    const stationZwei = testEnv.authenticatedContext('spieler-station-2');

    // When: Die Person an Station 2 bewegt diese einzelne Karte weiter
    const zug = updateDoc(doc(stationZwei.firestore(), `spiele/${code}/runden/3/karten/karte-1`), {
      position: 2,
      letzteBewegungVon: 'spieler-station-2',
      letzteBewegungAm: serverTimestamp(),
    });

    // Then: Der Zug wird angenommen (Stapel-Tor Runde 3 = 1)
    await assertSucceeds(zug);
  });
});

describe('FEATURE-002 Sicherheitsregeln: Definition of Ready (DoR)', () => {
  test('Szenario: DoR-Auslösung durch den Host wird angenommen', async () => {
    // Given: Runde 1, DoR noch nicht abgeschlossen
    const code = await seedGame({ runde: 1, dorAbgeschlossen: false });
    const host = testEnv.authenticatedContext('host-1');

    // When: Der Host löst "Definition of Ready abgeschlossen" aus
    const aktion = updateDoc(doc(host.firestore(), `spiele/${code}/runden/1`), {
      dorAbgeschlossen: true,
      phase: 'dor_abgeschlossen',
    });

    // Then: Die Aktion wird angenommen
    await assertSucceeds(aktion);
  });

  test('Szenario: DoR-Auslösung durch ein Team-Mitglied (nicht Host) wird angenommen', async () => {
    // Given: Runde 1, DoR noch nicht abgeschlossen
    const code = await seedGame({ runde: 1, dorAbgeschlossen: false });
    const teamMitglied = testEnv.authenticatedContext('spieler-station-1');

    // When: Ein Team-Mitglied löst "Definition of Ready abgeschlossen" aus
    const aktion = updateDoc(doc(teamMitglied.firestore(), `spiele/${code}/runden/1`), {
      dorAbgeschlossen: true,
      phase: 'dor_abgeschlossen',
    });

    // Then: Die Aktion wird angenommen (Host ODER Team, laut Entscheidung 2026-07-17)
    await assertSucceeds(aktion);
  });

  test('Szenario: Doppelte/gleichzeitige DoR-Auslösung bleibt wirkungslos-idempotent', async () => {
    // Given: DoR ist bereits abgeschlossen (erster Auslöser war erfolgreich)
    const code = await seedGame({ runde: 1, dorAbgeschlossen: true });
    const zweiterAusloeser = testEnv.authenticatedContext('spieler-station-2');

    // When: Ein zweites Mitglied versucht ebenfalls, DoR auszulösen
    const zweiteAktion = updateDoc(doc(zweiterAusloeser.firestore(), `spiele/${code}/runden/1`), {
      dorAbgeschlossen: true,
      phase: 'dor_abgeschlossen',
    });

    // Then: Der zweite Versuch darf keinen Fehler werfen und keine zusätzliche Wirkung haben
    // (kein doppelter Start der Bearbeitungszeit) — Regel muss No-Op erlauben, aber keinen
    // neuen bearbeitungszeitStart setzen.
    await assertSucceeds(zweiteAktion);
  });
});

describe('FEATURE-002 Sicherheitsregeln: Rundenwechsel', () => {
  test('Szenario: Rundenwechsel-Auslösung durch den Host wird angenommen', async () => {
    // Given: Runde 1 ist beendet (letzte Karte im Ziel), alle Kennzahlen stehen fest
    const code = await seedGame({ runde: 1, dorAbgeschlossen: true });
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await updateDoc(doc(context.firestore(), `spiele/${code}/runden/1`), {
        phase: 'beendet',
        durchlaufzeitEnde: new Date(),
      });
    });
    const host = testEnv.authenticatedContext('host-1');

    // When: Der Host löst aktiv "nächste Runde starten" aus
    const aktion = setDoc(doc(host.firestore(), `spiele/${code}/runden/2`), {
      phase: 'aufgabe_vorgestellt',
      dorAbgeschlossen: false,
      durchlaufzeitStart: serverTimestamp(),
      bearbeitungszeitStart: null,
      durchlaufzeitEnde: null,
    });

    // Then: Die Aktion wird angenommen
    await assertSucceeds(aktion);
  });

  test('Szenario: Rundenwechsel-Auslösung durch eine Nicht-Host-Person wird abgelehnt', async () => {
    // Given: Runde 1 ist beendet
    const code = await seedGame({ runde: 1, dorAbgeschlossen: true });
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await updateDoc(doc(context.firestore(), `spiele/${code}/runden/1`), {
        phase: 'beendet',
        durchlaufzeitEnde: new Date(),
      });
    });
    const spielerNichtHost = testEnv.authenticatedContext('spieler-station-1');

    // When: Ein Spielender (nicht Host) versucht, die nächste Runde zu starten
    const aktion = setDoc(doc(spielerNichtHost.firestore(), `spiele/${code}/runden/2`), {
      phase: 'aufgabe_vorgestellt',
      dorAbgeschlossen: false,
      durchlaufzeitStart: serverTimestamp(),
      bearbeitungszeitStart: null,
      durchlaufzeitEnde: null,
    });

    // Then: Die Aktion wird abgelehnt
    await assertFails(aktion);
  });
});

describe('FEATURE-002 Sicherheitsregeln: Servergesetzte Zeit', () => {
  test('Szenario: Ein client-mitgesendeter Zeitstempel wird ignoriert, nur serverTimestamp() zählt', async () => {
    // Given: Karte 1 im Auftragseingang, DoR abgeschlossen
    const code = await seedGame({ runde: 1, dorAbgeschlossen: true });
    const stationEins = testEnv.authenticatedContext('spieler-station-1');

    // When: Die Person versucht, einen frei erfundenen (in der Vergangenheit liegenden) Client-Zeitstempel
    // statt serverTimestamp() zu übermitteln, um z. B. eine kürzere Bearbeitungszeit vorzutäuschen
    const manipulierterZug = updateDoc(doc(stationEins.firestore(), `spiele/${code}/runden/1/karten/karte-1`), {
      position: 1,
      letzteBewegungVon: 'spieler-station-1',
      letzteBewegungAm: new Date('2000-01-01T00:00:00Z'), // kein serverTimestamp()
    });

    // Then: Der Zug wird abgelehnt (Regel verlangt request.time / serverTimestamp())
    await assertFails(manipulierterZug);
  });
});

describe('FEATURE-002 Regressionstests gegen FEATURE-001 / TASK-002', () => {
  test('Regression FEATURE-001: Fremde Teilnehmendenliste bleibt abgelehnt (nur die Metadaten-Ebene ist bewusst codebasiert lesbar)', async () => {
    // Given: Zwei getrennte Spiele. WICHTIG: die feste Namensliste aus
    // seedGame() legt dieselben teilnehmende-uids in JEDEM Spiel an – eine
    // Person mit z. B. 'spieler-station-1' wäre also fälschlich auch in
    // Spiel A Teilnehmende. Für diesen Regressionsfall braucht es deshalb
    // eine eigene, garantiert nur in Spiel B vorhandene Person.
    const codeA = await seedGame({ code: 'AAAA1111', hostUid: 'host-a' });
    const codeB = await seedGame({ code: 'BBBB2222', hostUid: 'host-b' });
    const fremdeUid = 'person-nur-in-spiel-b';
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), `spiele/${codeB}/teilnehmende/${fremdeUid}`), {
        rolle: 'spielende', station: 1, anzeigename: 'Nur in Spiel B',
      });
    });
    // WICHTIG: .firestore() genau EINMAL pro Kontext aufrufen und die Instanz
    // wiederverwenden – ein zweiter Aufruf auf demselben Kontext löst bei
    // @firebase/rules-unit-testing "Firestore has already been started and
    // its settings can no longer be changed" aus (echter Fehler, der beim
    // ersten Testlauf so aufgetreten ist).
    const dbNurInB = testEnv.authenticatedContext(fremdeUid).firestore();

    // When/Then: Das oberste spiele/{code}-Dokument von Spiel A bleibt für sie
    // lesbar (FEATURE-001, bewusst codebasiert – Grundlage des Beitritts-
    // Flusses, siehe tests/game-rooms.security.rules.test.js). Was getrennt
    // bleiben MUSS, ist die Teilnehmendenliste von Spiel A.
    await assertSucceeds(getDoc(doc(dbNurInB, `spiele/${codeA}`)));
    await assertFails(getDocs(collection(dbNurInB, `spiele/${codeA}/teilnehmende`)));
  });

  test('Regression FEATURE-001: Beobachtende dürfen weiterhin keine Karte bewegen', async () => {
    const code = await seedGame({ runde: 1, dorAbgeschlossen: true });
    const beobachter = testEnv.authenticatedContext('beobachter-1');
    const zug = updateDoc(doc(beobachter.firestore(), `spiele/${code}/runden/1/karten/karte-1`), {
      position: 1,
      letzteBewegungVon: 'beobachter-1',
      letzteBewegungAm: serverTimestamp(),
    });
    await assertFails(zug);
  });

  test('Regression TASK-002: unauthentifiziertes Lesen bleibt abgelehnt', async () => {
    const code = await seedGame();
    const anonym = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(anonym.firestore(), `spiele/${code}/runden/1/karten/karte-1`)));
  });

  test('Regression TASK-002: unauthentifiziertes Schreiben bleibt abgelehnt', async () => {
    const code = await seedGame();
    const anonym = testEnv.unauthenticatedContext();
    await assertFails(
      updateDoc(doc(anonym.firestore(), `spiele/${code}/runden/1/karten/karte-1`), { position: 1 })
    );
  });
});
