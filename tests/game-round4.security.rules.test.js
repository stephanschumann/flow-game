/**
 * FEATURE-004 – Phase 4: Runde 4 (Kontextwechsel) — Sicherheitsregeln (Firestore)
 *
 * Given/When/Then-Testfälle, umgesetzt mit Jest + @firebase/rules-unit-testing
 * gegen den Firestore-Emulator — gleiches Testmuster wie FEATURE-002
 * (tests/game-round.security.rules.test.js) und FEATURE-003
 * (tests/game-evaluation.security.rules.test.js).
 *
 * Grundlage: Analyse-Spec in Backlog.md, Abschnitt "FEATURE-004", freigegeben
 * am 2026-07-20 (12-Elemente-Staffel-Modell, NICHT das frühere, verworfene
 * 6-Ergebnisse-Pool-Modell).
 *
 * NAMENSGEBUNG (eigene, begründete Festlegung für diese Tests, da die Spec
 * bewusst nur beobachtbares Verhalten + grobe Architektur beschreibt, siehe
 * "Betroffene Architektur": "vermutlich zwei Unterkollektionen oder eine
 * gemeinsame mit Typ-Feld"). Für diese Tests wird EINE gemeinsame
 * Unterkollektion mit Typ-Feld angenommen. Falls flow-game-impl sich für
 * zwei getrennte Unterkollektionen entscheidet, bitte diese Tests entsprechend
 * anpassen statt sie stillschweigend zu ignorieren (gleiches Vorgehen wie beim
 * NAMENSGEBUNG-Hinweis in tests/game-evaluation.logic.test.js):
 *
 *   spiele/{code}/runden/4                       – wiederverwendet die
 *                                                    BESTEHENDE runden/{runde}
 *                                                    Struktur aus FEATURE-002/003
 *                                                    unverändert (phase,
 *                                                    dorAbgeschlossen,
 *                                                    durchlaufzeitStart/-Ende,
 *                                                    bearbeitungszeitStart/-Ende).
 *                                                    Reine Wildcard-Wiederverwendung,
 *                                                    kein Round-4-eigener Regelblock
 *                                                    nötig — siehe Regressions-
 *                                                    /Wiederverwendungs-Nachweis
 *                                                    unten (erwartungsgemäß
 *                                                    bereits GRÜN).
 *   spiele/{code}/runden/4/elemente/{elementId}   – NEU, existiert in
 *                                                    firestore.rules noch nicht.
 *       typ: 'wuerfel' | 'laenderkarte'
 *       reihenfolge: 1..12 (feste Start-/Ankunftsreihenfolge, geklärte Frage 7)
 *       position: 1..5 (aktuell zuständige Person in der festen Reihenfolge
 *                 1→2→3→4→5) | 6 ("fertig bei Spieler 5")
 *       angekommenAm: servergesetzter Zeitstempel der Ankunft an der aktuellen
 *                 Position (Grundlage der FIFO-Regel, AK 8)
 *       land: nur bei typ == 'laenderkarte' (fest zugeordnet bei Rundenstart)
 *       staedte: MAP mit String-Schlüsseln "0".."4" (Einfüge-Reihenfolge =
 *                 Schlüssel-Reihenfolge) von { stadt, von (uid), am
 *                 (Server-Zeitstempel) }, append-only, nie überschreibend
 *                 (AK 11, AK 14). BEWUSST kein Array (Korrektur 2026-07-20,
 *                 siehe firestore.rules-Kommentar bei rundeVierStaedteAngehaengt():
 *                 Firestore lehnt serverTimestamp() innerhalb von Arrays ab,
 *                 innerhalb von Maps ist es uneingeschränkt erlaubt).
 *       wurfAnzahl / letzterWurf: nur bei typ == 'wuerfel', rein clientseitig
 *                 erzeugt und geschrieben, OHNE serverseitige Prüfung des
 *                 konkreten Wertes (AK 10, Pre-Mortem-Risiko 9 — bewusst
 *                 akzeptiertes Restrisiko, analog CatTube)
 *   spiele/{code}/runden/4/fortschritt/{uid}      – NEU: letzterAbgeschlossenerTyp
 *                 je Person (Grundlage der Wechselzwang-Regel, AK 9)
 *   spiele/{code}/runden/4/reihenfolge (Feld auf spiele/{code} ODER auf
 *                 runden/4) – Zuordnung "Position 1..5 in der Staffel" → uid.
 *                 BEWUSST NICHT identisch mit dem `station`-Feld aus
 *                 FEATURE-002 (Pre-Mortem-Risiko 10: Zuständigkeit muss über
 *                 die Person/uid laufen, nicht über einen Stations-Index) —
 *                 hier als eigenes Feld `rundeVierPosition` auf
 *                 teilnehmende/{uid} angenommen, das vom `station`-Feld
 *                 unabhängig sein kann.
 *
 * WICHTIG (Doppel-Hinweis, siehe auch FEATURE-002-Testdatei-Kopf für die
 * gleiche Beobachtung): Für den `elemente`-Pfad existiert in `firestore.rules`
 * aktuell noch KEINERLEI Regel — d. h. jeder Zugriff (lesend wie schreibend)
 * wird durch das generelle "kein Pfad = kein Zugriff"-Verhalten von Firestore-
 * Regeln abgelehnt. Das bedeutet: JEDER `assertSucceeds()`-Testfall unten ist
 * aktuell ECHT rot (fehlende Funktionalität). Ein Teil der `assertFails()`-
 * Testfälle ist dagegen NUR TRIVIAL grün, weil der gesamte Pfad ohnehin
 * gesperrt ist — nicht, weil die jeweilige fachliche Regel (Wechselzwang,
 * FIFO, Kettenreihenfolge, Append-only) bereits gezielt durchgesetzt wird.
 * `flow-game-impl` darf sich davon NICHT täuschen lassen: eine echte
 * Umsetzung muss die einzelnen Regeln gezielt prüfen, nicht den Pfad einfach
 * dauerhaft für alle außer dem Host sperren. Jeder betroffene Testfall ist
 * unten einzeln so kommentiert.
 *
 * Die Wiederverwendung der bestehenden runden/{runde}-Regeln (DoR, Host-
 * Rundenstart, servergesetzte Zeitstempel) für Runde 4 wird in einem eigenen
 * Abschnitt unten separat nachgewiesen — diese Tests sind erwartungsgemäß
 * bereits GRÜN, weil {runde} in firestore.rules ein Wildcard-Pfadsegment ist
 * und keine Regel nach der konkreten Rundennummer unterscheidet.
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

const PROJECT_ID = 'flow-game-feature-004-test';
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
 * FEATURE-001/002/003) und startet Runde 4 mit den zwölf Elementen aus der
 * festen, alternierenden Startreihenfolge (geklärte Frage 7):
 *   Würfel 1, Karte 1, Würfel 2, Karte 2, ..., Würfel 6, Karte 6
 * Alle starten mit position = 1 (bei Spieler 1) und einem aufsteigenden
 * `angekommenAm`-Zeitstempel entsprechend ihrer Reihenfolge, damit FIFO-Tests
 * einen deterministischen Ausgangszustand haben.
 *
 * `rundeVierReihenfolge` bildet die fünf Spieler-Positionen 1..5 auf uids ab
 * — bewusst getrennt vom `station`-Feld aus FEATURE-002 (Pre-Mortem-Risiko 10).
 */
async function seedRundeVier({
  code = 'RV4C0001',
  hostUid = 'host-1',
  dorAbgeschlossen = false,
  elementeUeberschreibungen = {},
} = {}) {
  const spielerUids = ['spieler-p1', 'spieler-p2', 'spieler-p3', 'spieler-p4', 'spieler-p5'];

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, `spiele/${code}`), {
      code,
      hostUid,
      erstelltAm: new Date(),
      letzteAktivitaet: Date.now(),
      aktuelleRunde: 4,
    });
    await setDoc(doc(db, `spiele/${code}/geheim/kennung`), { hostKennung: 'geheimes-host-secret' });

    const teilnehmende = [
      { uid: hostUid, rolle: 'host' },
      // rundeVierPosition bewusst NICHT identisch mit einer evtl. aus
      // Runde 1-3 übernommenen `station` — deckt Pre-Mortem-Risiko 10 ab.
      {
        uid: spielerUids[0], rolle: 'spielende', station: 3, rundeVierPosition: 1,
      },
      {
        uid: spielerUids[1], rolle: 'spielende', station: 1, rundeVierPosition: 2,
      },
      {
        uid: spielerUids[2], rolle: 'spielende', station: 5, rundeVierPosition: 3,
      },
      {
        uid: spielerUids[3], rolle: 'spielende', station: 2, rundeVierPosition: 4,
      },
      {
        uid: spielerUids[4], rolle: 'spielende', station: 4, rundeVierPosition: 5,
      },
      { uid: 'beobachter-1', rolle: 'beobachtende' },
    ];
    for (const t of teilnehmende) {
      await setDoc(doc(db, `spiele/${code}/teilnehmende/${t.uid}`), t);
    }

    await setDoc(doc(db, `spiele/${code}/runden/4`), {
      phase: dorAbgeschlossen ? 'dor_abgeschlossen' : 'aufgabe_vorgestellt',
      dorAbgeschlossen,
      durchlaufzeitStart: new Date(),
      bearbeitungszeitStart: null,
      durchlaufzeitEnde: null,
    });

    const laender = ['USA', 'UK', 'Germany', 'India', 'Spain', 'France', 'Italy', 'Canada'];
    let reihenfolge = 1;
    for (let i = 1; i <= 6; i += 1) {
      const wuerfelId = `wuerfel-${i}`;
      const karteId = `karte-${i}`;
      const basisWuerfel = {
        typ: 'wuerfel',
        reihenfolge,
        position: 1,
        angekommenAm: new Date(1000 * reihenfolge),
        wurfAnzahl: 0,
        letzterWurf: null,
        ...(elementeUeberschreibungen[wuerfelId] || {}),
      };
      await setDoc(doc(db, `spiele/${code}/runden/4/elemente/${wuerfelId}`), basisWuerfel);
      reihenfolge += 1;

      const basisKarte = {
        typ: 'laenderkarte',
        reihenfolge,
        position: 1,
        angekommenAm: new Date(1000 * reihenfolge),
        land: laender[i - 1],
        staedte: {},
        ...(elementeUeberschreibungen[karteId] || {}),
      };
      await setDoc(doc(db, `spiele/${code}/runden/4/elemente/${karteId}`), basisKarte);
      reihenfolge += 1;
    }

    // fortschritt/{uid}: letzter abgeschlossener Typ je Person (Wechselzwang)
    for (const uid of spielerUids) {
      await setDoc(doc(db, `spiele/${code}/runden/4/fortschritt/${uid}`), {
        letzterAbgeschlossenerTyp: null,
      });
    }
  });

  return { code, spielerUids };
}

async function setzeFortschritt(code, uid, letzterAbgeschlossenerTyp) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), `spiele/${code}/runden/4/fortschritt/${uid}`), {
      letzterAbgeschlossenerTyp,
    });
  });
}

async function setzeElement(code, elementId, felder) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await updateDoc(doc(context.firestore(), `spiele/${code}/runden/4/elemente/${elementId}`), felder);
  });
}

describe('FEATURE-004 Sicherheitsregeln: Rundenstart mit 12 Elementen (AK 6)', () => {
  test('Szenario: Alle zwölf Elemente stehen zu Rundenbeginn vollständig bei Spieler 1 bereit, sechs Würfel + sechs Länderkarten mit Land', async () => {
    // Given: Runde 4 wurde gerade gestartet (seedRundeVier legt den Zielzustand an)
    const { code, spielerUids } = await seedRundeVier({ dorAbgeschlossen: true });
    const spielerEins = testEnv.authenticatedContext(spielerUids[0]);

    // When: Spieler 1 liest alle Elemente der Runde 4
    const elemente = getDocs(collection(spielerEins.firestore(), `spiele/${code}/runden/4/elemente`));

    // Then: Der Lesezugriff wird angenommen (aktuell ROT: keine Regel erlaubt das Lesen von "elemente" bisher)
    const snapshot = await assertSucceeds(elemente);
    expect(snapshot.size).toBe(12);
    const typen = snapshot.docs.map((d) => d.data().typ);
    expect(typen.filter((t) => t === 'wuerfel')).toHaveLength(6);
    expect(typen.filter((t) => t === 'laenderkarte')).toHaveLength(6);
    expect(snapshot.docs.every((d) => d.data().position === 1)).toBe(true);
  });
});

describe('FEATURE-004 Sicherheitsregeln: Vor Definition of Ready keine Bearbeitung (AK 2)', () => {
  test('Szenario: Bearbeitung eines Würfel-Elements vor DoR wird abgelehnt', async () => {
    // Given: Runde 4 läuft, DoR NICHT abgeschlossen
    const { code, spielerUids } = await seedRundeVier({ dorAbgeschlossen: false });
    const spielerEins = testEnv.authenticatedContext(spielerUids[0]);

    // When: Spieler 1 versucht dennoch, Würfel 1 weiterzugeben (Wurf > 3 erzielt)
    const versuch = updateDoc(doc(spielerEins.firestore(), `spiele/${code}/runden/4/elemente/wuerfel-1`), {
      position: 2,
      wurfAnzahl: 1,
      letzterWurf: 5,
      angekommenAm: serverTimestamp(),
    });

    // Then: Die Aktion wird abgelehnt (aktuell trivial rot/grün zugleich: der gesamte
    // Pfad ist ohnehin gesperrt — flow-game-impl muss die ECHTE DoR-Prüfung ergänzen)
    await assertFails(versuch);
  });

  test('Szenario: Stadt-Eintrag auf einer Länderkarte vor DoR wird abgelehnt', async () => {
    const { code, spielerUids } = await seedRundeVier({ dorAbgeschlossen: false });
    const spielerEins = testEnv.authenticatedContext(spielerUids[0]);

    const versuch = updateDoc(doc(spielerEins.firestore(), `spiele/${code}/runden/4/elemente/karte-1`), {
      position: 2,
      staedte: { '0': { stadt: 'New York', von: spielerUids[0], am: serverTimestamp() } },
    });

    await assertFails(versuch);
  });
});

describe('FEATURE-004 Sicherheitsregeln: Staffel-Fluss / Kettenfortschritt (AK 7)', () => {
  test('Szenario: Die zuständige Person darf ihr Element um genau einen Schritt an die nächste Person weitergeben', async () => {
    // Given: Würfel 1 ist bei Spieler-Position 1, DoR abgeschlossen, Spieler 1 hat gerade
    // eine Länderkarte abgegeben (Wechselzwang erlaubt jetzt einen Würfel)
    const { code, spielerUids } = await seedRundeVier({ dorAbgeschlossen: true });
    await setzeFortschritt(code, spielerUids[0], 'laenderkarte');
    const spielerEins = testEnv.authenticatedContext(spielerUids[0]);

    // When: Spieler 1 würfelt erfolgreich (>3) und gibt Würfel 1 an Spieler-Position 2 weiter
    const zug = updateDoc(doc(spielerEins.firestore(), `spiele/${code}/runden/4/elemente/wuerfel-1`), {
      position: 2,
      wurfAnzahl: 1,
      letzterWurf: 5,
      angekommenAm: serverTimestamp(),
    });

    // Then: Der Zug wird angenommen
    await assertSucceeds(zug);
  });

  test('Szenario: Eine Person, bei der das Element noch nicht angekommen ist, darf es nicht bearbeiten', async () => {
    // Given: Würfel 1 ist bei Spieler-Position 1 (spieler-p1), NICHT bei Spieler-Position 2
    const { code, spielerUids } = await seedRundeVier({ dorAbgeschlossen: true });
    const spielerZwei = testEnv.authenticatedContext(spielerUids[1]);

    // When: Spieler-Position 2 versucht dennoch, Würfel 1 zu bearbeiten
    const versuch = updateDoc(doc(spielerZwei.firestore(), `spiele/${code}/runden/4/elemente/wuerfel-1`), {
      position: 2,
      wurfAnzahl: 1,
      letzterWurf: 4,
      angekommenAm: serverTimestamp(),
    });

    // Then: Der Zug wird abgelehnt
    await assertFails(versuch);
  });

  test('Szenario: Ein Element darf niemals rückwärts weitergegeben werden', async () => {
    // Given: Würfel 1 ist bereits bei Spieler-Position 3
    const { code, spielerUids } = await seedRundeVier({ dorAbgeschlossen: true });
    await setzeElement(code, 'wuerfel-1', { position: 3 });
    const spielerZwei = testEnv.authenticatedContext(spielerUids[1]);

    // When: Spieler-Position 2 versucht, es "zurück" zu sich zu holen
    const versuch = updateDoc(doc(spielerZwei.firestore(), `spiele/${code}/runden/4/elemente/wuerfel-1`), {
      position: 2,
      angekommenAm: serverTimestamp(),
    });

    // Then: Der Zug wird abgelehnt
    await assertFails(versuch);
  });

  test('Szenario: Ein Element darf niemals eine Person überspringen (Konsolen-Umgehungsversuch, Pre-Mortem-Risiko 2)', async () => {
    // Given: Würfel 1 ist bei Spieler-Position 1, DoR abgeschlossen
    const { code, spielerUids } = await seedRundeVier({ dorAbgeschlossen: true });
    const spielerEins = testEnv.authenticatedContext(spielerUids[0]);

    // When: Jemand versucht, Würfel 1 direkt auf Position 4 zu setzen (Spieler 2 und 3 überspringen)
    const versuch = updateDoc(doc(spielerEins.firestore(), `spiele/${code}/runden/4/elemente/wuerfel-1`), {
      position: 4,
      angekommenAm: serverTimestamp(),
    });

    // Then: Der Zug wird abgelehnt
    await assertFails(versuch);
  });

  test('Szenario: Ein Element direkt auf "fertig" (Position 6) zu setzen, ohne die Kette zu durchlaufen, wird abgelehnt', async () => {
    const { code, spielerUids } = await seedRundeVier({ dorAbgeschlossen: true });
    const spielerEins = testEnv.authenticatedContext(spielerUids[0]);

    const versuch = updateDoc(doc(spielerEins.firestore(), `spiele/${code}/runden/4/elemente/wuerfel-1`), {
      position: 6,
      angekommenAm: serverTimestamp(),
    });

    await assertFails(versuch);
  });
});

describe('FEATURE-004 Sicherheitsregeln: Wechselzwang (AK 9, Testplan-Szenario)', () => {
  test('Szenario: Nach Weitergabe eines Würfel-Elements ist ein weiteres Würfel-Element für dieselbe Person gesperrt', async () => {
    // Given: Spieler 1 hat soeben ein Würfel-Element weitergegeben (letzterAbgeschlossenerTyp = 'wuerfel'),
    // ein zweites Würfel-Element wartet ebenfalls bei ihr
    const { code, spielerUids } = await seedRundeVier({ dorAbgeschlossen: true });
    await setzeFortschritt(code, spielerUids[0], 'wuerfel');
    const spielerEins = testEnv.authenticatedContext(spielerUids[0]);

    // When: Spieler 1 versucht, direkt ein weiteres Würfel-Element zu bearbeiten
    const versuch = updateDoc(doc(spielerEins.firestore(), `spiele/${code}/runden/4/elemente/wuerfel-2`), {
      position: 2,
      wurfAnzahl: 1,
      letzterWurf: 6,
      angekommenAm: serverTimestamp(),
    });

    // Then: Die Aktion wird abgelehnt
    await assertFails(versuch);
  });

  test('Szenario: Nach Weitergabe eines Würfel-Elements ist ein wartendes Länderkarten-Element für dieselbe Person erlaubt', async () => {
    // Given: Spieler 1 hat soeben ein Würfel-Element weitergegeben
    const { code, spielerUids } = await seedRundeVier({ dorAbgeschlossen: true });
    await setzeFortschritt(code, spielerUids[0], 'wuerfel');
    const spielerEins = testEnv.authenticatedContext(spielerUids[0]);

    // When: Spieler 1 bearbeitet stattdessen die wartende Länderkarte 1
    const zug = updateDoc(doc(spielerEins.firestore(), `spiele/${code}/runden/4/elemente/karte-1`), {
      position: 2,
      staedte: { '0': { stadt: 'Berlin', von: spielerUids[0], am: serverTimestamp() } },
    });

    // Then: Die Aktion wird angenommen
    await assertSucceeds(zug);
  });

  test('Szenario: Zu Rundenbeginn (noch kein abgeschlossener Typ) ist sowohl Würfel als auch Länderkarte erlaubt', async () => {
    const { code, spielerUids } = await seedRundeVier({ dorAbgeschlossen: true });
    const spielerEins = testEnv.authenticatedContext(spielerUids[0]);

    const wuerfelZug = updateDoc(doc(spielerEins.firestore(), `spiele/${code}/runden/4/elemente/wuerfel-1`), {
      position: 2, wurfAnzahl: 1, letzterWurf: 5, angekommenAm: serverTimestamp(),
    });
    await assertSucceeds(wuerfelZug);
  });
});

describe('FEATURE-004 Sicherheitsregeln: FIFO bei mehreren wartenden Elementen desselben Typs (AK 8, Testplan-Szenario)', () => {
  test('Szenario: Bei zwei wartenden Würfel-Elementen (X vor Y angekommen) ist nur das zuerst angekommene bearbeitbar', async () => {
    // Given: Bei Spieler-Position 4 (spieler-p4) sind Würfel X (früher) und Würfel Y (später) angekommen,
    // dazwischen liegt eine Länderkarte A laut alternierender Ankunft (Pre-Mortem-Risiko 3 / geklärte Frage 2)
    const { code, spielerUids } = await seedRundeVier({ dorAbgeschlossen: true });
    const spielerVier = spielerUids[3];
    await setzeElement(code, 'wuerfel-3', { position: 4, angekommenAm: new Date(1000) }); // X, zuerst
    await setzeElement(code, 'karte-3', { position: 4, angekommenAm: new Date(2000) }); // A, dazwischen
    await setzeElement(code, 'wuerfel-4', { position: 4, angekommenAm: new Date(3000) }); // Y, zuletzt
    await setzeFortschritt(code, spielerVier, 'laenderkarte'); // ein Würfel ist laut Wechselzwang jetzt dran
    const kontextVier = testEnv.authenticatedContext(spielerVier);
    // WICHTIG: .firestore() genau EINMAL pro Kontext aufrufen und die Instanz
    // wiederverwenden (gleiches, bereits dokumentiertes Muster wie in
    // tests/game-round.security.rules.test.js, Kommentar bei dbStationZwei) –
    // dieser Testfall rief sie ursprünglich zweimal auf (einmal je Zug), was
    // NICHT der zu testende Fachfehler ist, sondern ein reiner Testaufbau-
    // Fehler: der zweite .firestore()-Aufruf löste erneut useEmulator() auf
    // einer bereits aktiven Firestore-Instanz aus und warf "Firestore has
    // already been started and its settings can no longer be changed."
    const dbVier = kontextVier.firestore();

    // When: Spieler 4 versucht, das SPÄTER angekommene Würfel-Element Y zu bearbeiten
    const versuchY = updateDoc(doc(dbVier, `spiele/${code}/runden/4/elemente/wuerfel-4`), {
      position: 5, wurfAnzahl: 1, letzterWurf: 6, angekommenAm: serverTimestamp(),
    });
    // Then: Wird abgelehnt — X ist noch nicht bearbeitet
    await assertFails(versuchY);

    // When: Spieler 4 bearbeitet stattdessen das ZUERST angekommene Würfel-Element X
    const versuchX = updateDoc(doc(dbVier, `spiele/${code}/runden/4/elemente/wuerfel-3`), {
      position: 5, wurfAnzahl: 1, letzterWurf: 6, angekommenAm: serverTimestamp(),
    });
    // Then: Wird angenommen
    await assertSucceeds(versuchX);
  });

  test('Szenario: Freie Auswahl unter mehreren wartenden Elementen desselben Typs wird abgelehnt (keine Bearbeitung außer Reihenfolge)', async () => {
    const { code, spielerUids } = await seedRundeVier({ dorAbgeschlossen: true });
    const spielerVier = spielerUids[3];
    await setzeElement(code, 'wuerfel-3', { position: 4, angekommenAm: new Date(1000) });
    await setzeElement(code, 'wuerfel-4', { position: 4, angekommenAm: new Date(3000) });
    await setzeFortschritt(code, spielerVier, 'laenderkarte');
    const kontextVier = testEnv.authenticatedContext(spielerVier);

    const versuch = updateDoc(doc(kontextVier.firestore(), `spiele/${code}/runden/4/elemente/wuerfel-4`), {
      position: 5, wurfAnzahl: 1, letzterWurf: 6, angekommenAm: serverTimestamp(),
    });
    await assertFails(versuch);
  });
});

describe('FEATURE-004 Sicherheitsregeln: Würfel-Element (AK 10)', () => {
  test('Szenario: Ein Wurf ≤3 wird angenommen, ohne dass das Element weitergegeben wird ("noch nicht erledigt", kein Fehler)', async () => {
    const { code, spielerUids } = await seedRundeVier({ dorAbgeschlossen: true });
    const spielerEins = testEnv.authenticatedContext(spielerUids[0]);

    const wurf = updateDoc(doc(spielerEins.firestore(), `spiele/${code}/runden/4/elemente/wuerfel-1`), {
      wurfAnzahl: 1,
      letzterWurf: 2, // <=3, bleibt bei derselben Person
    });
    await assertSucceeds(wurf);
  });

  test('Szenario: Der konkrete Würfelwert wird serverseitig NICHT geprüft (bewusst akzeptiertes Restrisiko, Pre-Mortem-Risiko 9)', async () => {
    // Given/When: Ein offensichtlich unplausibler, aber clientseitig erzeugter Wert wird geschrieben
    const { code, spielerUids } = await seedRundeVier({ dorAbgeschlossen: true });
    const spielerEins = testEnv.authenticatedContext(spielerUids[0]);

    const manipulierterWurf = updateDoc(doc(spielerEins.firestore(), `spiele/${code}/runden/4/elemente/wuerfel-1`), {
      wurfAnzahl: 1,
      letzterWurf: 999, // kein gültiger Würfelwert, wird aber nicht serverseitig geprüft
    });

    // Then: Wird angenommen (analog CatTube, siehe geklärte Frage 5) —
    // WICHTIG: dieser Test soll auch NACH flow-game-impl weiterhin grün bleiben,
    // er dokumentiert eine bewusste Nicht-Prüfung, kein zu behebendes Defizit.
    await assertSucceeds(manipulierterWurf);
  });
});

describe('FEATURE-004 Sicherheitsregeln: Länderkarte — Städte-Eintrag (AK 11, 12, 13)', () => {
  test('Szenario: Eine falsche Stadt wird ohne Blockade angenommen (AK 11)', async () => {
    const { code, spielerUids } = await seedRundeVier({ dorAbgeschlossen: true });
    const spielerEins = testEnv.authenticatedContext(spielerUids[0]);

    const eintrag = updateDoc(doc(spielerEins.firestore(), `spiele/${code}/runden/4/elemente/karte-1`), {
      position: 2,
      staedte: { '0': { stadt: 'DefinitivKeineEchteStadt', von: spielerUids[0], am: serverTimestamp() } },
    });
    await assertSucceeds(eintrag);
  });

  test('Szenario: Eine Stadt außerhalb des zugeordneten Landes wird ohne Fehlermarkierung angenommen (AK 12)', async () => {
    // Given: Karte 1 ist "France" zugeordnet
    const { code, spielerUids } = await seedRundeVier({ dorAbgeschlossen: true });
    const spielerEins = testEnv.authenticatedContext(spielerUids[0]);

    // When: Spieler 1 trägt "Rom" ein (liegt in Italy, nicht in France)
    const eintrag = updateDoc(doc(spielerEins.firestore(), `spiele/${code}/runden/4/elemente/karte-1`), {
      position: 2,
      staedte: { '0': { stadt: 'Rom', von: spielerUids[0], am: serverTimestamp() } },
    });
    await assertSucceeds(eintrag);
  });

  test('Szenario: Eine bereits im Spiel verwendete Stadt (Dublette) wird ohne Fehlermarkierung angenommen (AK 13)', async () => {
    const { code, spielerUids } = await seedRundeVier({
      dorAbgeschlossen: true,
      elementeUeberschreibungen: {
        'karte-2': { position: 2, staedte: { '0': { stadt: 'Berlin', von: 'irgendwer', am: new Date() } } },
      },
    });
    const spielerZwei = testEnv.authenticatedContext(spielerUids[1]);

    const eintrag = updateDoc(doc(spielerZwei.firestore(), `spiele/${code}/runden/4/elemente/karte-2`), {
      position: 3,
      staedte: {
        '0': { stadt: 'Berlin', von: 'irgendwer', am: new Date() },
        '1': { stadt: 'Berlin', von: spielerUids[1], am: serverTimestamp() },
      },
    });
    await assertSucceeds(eintrag);
  });
});

describe('FEATURE-004 Sicherheitsregeln: Keine Live-Korrektur — Append-only (AK 14)', () => {
  test('Szenario: Ein bereits eingetragener Städte-Eintrag darf nachträglich nicht verändert werden', async () => {
    // Given: Karte 1 trägt bereits einen Eintrag von Spieler 1 ("Rom", fälschlich für "France")
    const { code, spielerUids } = await seedRundeVier({
      dorAbgeschlossen: true,
      elementeUeberschreibungen: {
        'karte-1': { position: 2, staedte: { '0': { stadt: 'Rom', von: 'spieler-p1', am: new Date() } } },
      },
    });
    const spielerEins = testEnv.authenticatedContext(spielerUids[0]);

    // When: Spieler 1 versucht, den eigenen (falschen) Eintrag nachträglich zu korrigieren
    const korrekturversuch = updateDoc(doc(spielerEins.firestore(), `spiele/${code}/runden/4/elemente/karte-1`), {
      staedte: { '0': { stadt: 'Paris', von: 'spieler-p1', am: serverTimestamp() } },
    });

    // Then: Die Aktion wird abgelehnt — bestehende Einträge dürfen nur ergänzt, nie ersetzt werden
    await assertFails(korrekturversuch);
  });

  test('Szenario: Es gibt keinen Sonderzustand "muss korrigiert werden", der die Weitergabe blockiert', async () => {
    // Given: Karte 1 trägt einen falschen Eintrag, ist aber sonst normal in der Kette
    const { code, spielerUids } = await seedRundeVier({
      dorAbgeschlossen: true,
      elementeUeberschreibungen: {
        'karte-1': { position: 2, staedte: { '0': { stadt: 'Rom', von: 'spieler-p1', am: new Date() } } },
      },
    });
    const spielerZwei = testEnv.authenticatedContext(spielerUids[1]);

    // When: Spieler 2 ergänzt normal weiter, trotz des vorherigen Fehlers
    const weitergabe = updateDoc(doc(spielerZwei.firestore(), `spiele/${code}/runden/4/elemente/karte-1`), {
      position: 3,
      staedte: {
        '0': { stadt: 'Rom', von: 'spieler-p1', am: new Date() },
        '1': { stadt: 'Lyon', von: spielerUids[1], am: serverTimestamp() },
      },
    });

    // Then: Wird angenommen, keine Blockade durch den vorherigen Fehler
    await assertSucceeds(weitergabe);
  });
});

describe('FEATURE-004 Sicherheitsregeln: Zuständigkeit über Person/uid, nicht über Stations-Index (Pre-Mortem-Risiko 10)', () => {
  test('Szenario: Eine Person mit Runde-1-3-Station 3, aber Runde-4-Position 1, ist an Runde-4-Position 1 zuständig', async () => {
    // Given: spieler-p1 hat station=3 (aus Runde 1-3), aber rundeVierPosition=1 — bewusst
    // unterschiedliche Werte, um zu prüfen, dass Runde 4 NICHT versehentlich das
    // `station`-Feld aus FEATURE-002 wiederverwendet.
    const { code, spielerUids } = await seedRundeVier({ dorAbgeschlossen: true });
    const spielerEins = testEnv.authenticatedContext(spielerUids[0]); // rundeVierPosition 1, station 3

    // When: spieler-p1 bearbeitet ein Element, das an Runde-4-Position 1 wartet
    const zug = updateDoc(doc(spielerEins.firestore(), `spiele/${code}/runden/4/elemente/wuerfel-1`), {
      position: 2, wurfAnzahl: 1, letzterWurf: 5, angekommenAm: serverTimestamp(),
    });

    // Then: Wird angenommen — Zuständigkeit folgt rundeVierPosition, nicht station
    await assertSucceeds(zug);
  });

  test('Szenario: Eine Person, deren Runde-1-3-Station zufällig mit der Zielposition übereinstimmt, deren Runde-4-Position aber nicht, bleibt unzuständig', async () => {
    // Given: spieler-p4 hat station=2 (aus Runde 1-3) — würde nach einem fälschlich
    // wiederverwendeten Stations-Check für Position 2 zuständig erscheinen, hat aber
    // tatsächlich rundeVierPosition=4 und ist für Position 2 NICHT zuständig.
    const { code, spielerUids } = await seedRundeVier({ dorAbgeschlossen: true });
    const spielerVier = testEnv.authenticatedContext(spielerUids[3]); // station 2, rundeVierPosition 4
    await setzeElement(code, 'wuerfel-1', { position: 2 });

    // When: spieler-p4 versucht, das an Runde-4-Position 2 wartende Element zu bearbeiten
    const versuch = updateDoc(doc(spielerVier.firestore(), `spiele/${code}/runden/4/elemente/wuerfel-1`), {
      position: 3, wurfAnzahl: 1, letzterWurf: 5, angekommenAm: serverTimestamp(),
    });

    // Then: Wird abgelehnt
    await assertFails(versuch);
  });
});

describe('FEATURE-004 Sicherheitsregeln: Nur Teilnehmende der Runde dürfen Elemente lesen/schreiben (Regression FEATURE-001)', () => {
  test('Regression: Beobachtende dürfen weiterhin keine Elemente bearbeiten', async () => {
    const { code } = await seedRundeVier({ dorAbgeschlossen: true });
    const beobachter = testEnv.authenticatedContext('beobachter-1');
    const versuch = updateDoc(doc(beobachter.firestore(), `spiele/${code}/runden/4/elemente/wuerfel-1`), {
      position: 2, wurfAnzahl: 1, letzterWurf: 5, angekommenAm: serverTimestamp(),
    });
    await assertFails(versuch);
  });

  test('Regression TASK-002: unauthentifiziertes Lesen der Elemente bleibt abgelehnt', async () => {
    const { code } = await seedRundeVier({ dorAbgeschlossen: true });
    const anonym = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(anonym.firestore(), `spiele/${code}/runden/4/elemente/wuerfel-1`)));
  });

  test('Regression TASK-002: unauthentifiziertes Schreiben bleibt abgelehnt', async () => {
    const { code } = await seedRundeVier({ dorAbgeschlossen: true });
    const anonym = testEnv.unauthenticatedContext();
    await assertFails(updateDoc(doc(anonym.firestore(), `spiele/${code}/runden/4/elemente/wuerfel-1`), {
      position: 2,
    }));
  });
});

describe('FEATURE-004 Wiederverwendungs-/Regressionsnachweis: bestehende runden/{runde}-Regeln gelten unverändert auch für Runde 4 (erwartungsgemäß bereits GRÜN)', () => {
  // Diese Tests prüfen bewusst KEINE neue Funktionalität, sondern beweisen die in
  // der Spec behauptete Wiederverwendbarkeit ("Chance statt Risiko", Abschnitt
  // "Ausgangslage"): {runde} ist in firestore.rules ein Wildcard-Pfadsegment, die
  // bestehenden DoR-/Host-/Zeitstempel-Regeln aus FEATURE-002 unterscheiden nicht
  // nach Rundennummer. Anders als alle Tests oben sind diese hier schon VOR
  // flow-game-impl grün — das ist beabsichtigt und kein Fehler in dieser Datei.

  test('Szenario: DoR-Auslösung durch den Host funktioniert für Runde 4 bereits mit den bestehenden Regeln', async () => {
    const { code } = await seedRundeVier({ dorAbgeschlossen: false }); // seedRundeVier() setzt hostUid standardmäßig auf 'host-1'
    const host = testEnv.authenticatedContext('host-1');

    const aktion = updateDoc(doc(host.firestore(), `spiele/${code}/runden/4`), {
      dorAbgeschlossen: true,
      phase: 'dor_abgeschlossen',
    });
    await assertSucceeds(aktion);
  });

  test('Szenario: Servergesetzter Zeitstempel bleibt auch für Runde 4 Pflicht (kein Client-Zeitwert)', async () => {
    const { code } = await seedRundeVier({ dorAbgeschlossen: true });
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await updateDoc(doc(context.firestore(), `spiele/${code}/runden/4`), { dorAbgeschlossen: true });
    });
    const host = testEnv.authenticatedContext('host-1');

    const manipuliert = updateDoc(doc(host.firestore(), `spiele/${code}/runden/4`), {
      phase: 'beendet',
      durchlaufzeitEnde: new Date('2000-01-01T00:00:00Z'),
    });
    await assertFails(manipuliert);
  });

  test('Regression FEATURE-002: Kartenbewegung in Runde 1 bleibt von den (noch fehlenden) Runde-4-Element-Regeln unberührt', async () => {
    // Given: Ein unabhängiges Spiel mit Runde 1 (klassisches karten-Modell, nicht elemente)
    const code = 'RV4REG01';
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, `spiele/${code}`), {
        code, hostUid: 'host-reg', erstelltAm: new Date(), letzteAktivitaet: Date.now(), aktuelleRunde: 1,
      });
      await setDoc(doc(db, `spiele/${code}/geheim/kennung`), { hostKennung: 'geheim' });
      await setDoc(doc(db, `spiele/${code}/teilnehmende/host-reg`), { uid: 'host-reg', rolle: 'host' });
      await setDoc(doc(db, `spiele/${code}/teilnehmende/spieler-reg-1`), { uid: 'spieler-reg-1', rolle: 'spielende', station: 1 });
      await setDoc(doc(db, `spiele/${code}/runden/1`), {
        phase: 'dor_abgeschlossen', dorAbgeschlossen: true, durchlaufzeitStart: new Date(), bearbeitungszeitStart: null, durchlaufzeitEnde: null,
      });
      for (let i = 1; i <= 6; i += 1) {
        await setDoc(doc(db, `spiele/${code}/runden/1/karten/karte-${i}`), { position: 0 });
      }
    });
    const spieler = testEnv.authenticatedContext('spieler-reg-1');

    // When: Die Person an Station 1 holt Karte 1 aus dem Auftragseingang — unverändertes FEATURE-002-Verhalten
    const zug = updateDoc(doc(spieler.firestore(), `spiele/${code}/runden/1/karten/karte-1`), {
      position: 1,
      letzteBewegungVon: 'spieler-reg-1',
      letzteBewegungAm: serverTimestamp(),
    });

    // Then: Weiterhin angenommen — die neuen Runde-4-Testfälle oben dürfen dieses bestehende Verhalten nicht brechen
    await assertSucceeds(zug);
  });
});
