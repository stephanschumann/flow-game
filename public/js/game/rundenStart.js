/**
 * FEATURE-002 – Browser-Version von src/game/rundenStart.js.
 *
 * Legt in EINER Transaktion sowohl das Rundendokument als auch alle sechs
 * Karten (Position 0) an und setzt zusätzlich spiele/{code}.aktuelleRunde als
 * gemeinsamen Zeiger, welche Runde gerade aktiv ist – jeder Client abonniert
 * darüber, in welche runden/{n}-Unter-Sammlung er wechseln muss. Dieses Feld
 * ist kein Bestandteil der Sicherheitsregel-Prüfung für runden/{n}, aber
 * bereits im Testfixture vorgesehen (siehe tests/game-round.security.rules.test.js,
 * seedGame() setzt exakt `aktuelleRunde`) und über die normale
 * spiele/{code}-Update-Regel aus FEATURE-001 gedeckt (jede/r Teilnehmende darf
 * das oberste Spiel-Dokument aktualisieren, solange `code` unverändert bleibt).
 *
 * WICHTIG: Bei Änderungen an src/game/rundenStart.js muss diese Datei
 * inhaltlich synchron gehalten werden (kein Build-Schritt im Projekt).
 */
(function (global) {
  'use strict';

  function stapelFuerKarte(rundenNummer, kartenIndex) {
    // Nur Runde 2 kennt getrennte Stapel (Entscheidung 2026-07-18): karte-1..3
    // = Stapel A, karte-4..6 = Stapel B, je drei Karten. Runde 1/3 kennen kein
    // Stapel-Tor je Teilmenge, deshalb null.
    if (rundenNummer !== 2) return null;
    return kartenIndex <= 3 ? 'A' : 'B';
  }

  async function starteRunde({ code, rundenNummer }, db) {
    const spielRef = db.collection('spiele').doc(code);
    const rundenRef = spielRef.collection('runden').doc(String(rundenNummer));

    await db.runTransaction(async (tx) => {
      tx.set(rundenRef, {
        phase: 'aufgabe_vorgestellt',
        dorAbgeschlossen: false,
        dorAbgeschlossenAm: null,
        durchlaufzeitStart: firebase.firestore.FieldValue.serverTimestamp(),
        durchlaufzeitEnde: null,
        bearbeitungszeitStart: null,
        bearbeitungszeitEnde: null,
      });
      for (let i = 1; i <= 6; i += 1) {
        tx.set(rundenRef.collection('karten').doc(`karte-${i}`), {
          position: 0,
          stapel: stapelFuerKarte(rundenNummer, i),
          letzteBewegungVon: null,
          letzteBewegungAm: null,
        });
      }
      tx.update(spielRef, {
        aktuelleRunde: rundenNummer,
        letzteAktivitaet: Date.now(),
      });
    });

    return { rundenNummer };
  }

  async function loeseDefinitionOfReadyAus({ code, rundenNummer }, db) {
    const rundenRef = db.collection('spiele').doc(code).collection('runden').doc(String(rundenNummer));
    // Bewusst ohne Vorab-Lesecheck ("ist DoR schon abgeschlossen?") - die Regel
    // selbst ist idempotent für einen zweiten/gleichzeitigen Auslöser (Host
    // ODER Team, siehe firestore.rules Fall A). Ein zusätzlicher Client-Check
    // würde nur ein Race-Fenster vortäuschen, ohne echten Nutzen.
    await rundenRef.update({
      dorAbgeschlossen: true,
      phase: 'dor_abgeschlossen',
      dorAbgeschlossenAm: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  // WICHTIGER FUND (beim Bau der Spielbrett-Oberfläche, 2026-07-18, siehe
  // Abschlussbericht an Stephan): firestore.rules kennt für runden/{n}-Updates
  // NUR Fall A (DoR abschliessen: dorAbgeschlossen:true, phase:'dor_abgeschlossen')
  // und Fall B (Rundenende). Es gibt KEINEN eigenen dritten Fall für "setze
  // bearbeitungszeitStart, wenn die erste Karte bewegt wird" - ohne diese
  // Funktion würde bearbeitungszeitStart in der echten Anwendung NIE gesetzt.
  // Fix: Fall A prüft laut Kommentar in firestore.rules bewusst NUR das
  // Resultat, nicht den Vorzustand ("ein zweiter/gleichzeitiger Auslöseversuch
  // landet in genau demselben Zweig") - ein erneuter Schreibvorgang mit
  // denselben, bereits gültigen Werten (dorAbgeschlossen:true,
  // phase:'dor_abgeschlossen') ist deshalb jederzeit zulässig, auch lange nach
  // dem eigentlichen DoR-Abschluss. Das wird hier genutzt, um
  // bearbeitungszeitStart als zusätzliches, von der Regel nicht geprüftes Feld
  // huckepack mitzuschreiben, sobald irgendjemand die erste Karte bewegt.
  async function starteBearbeitungszeitFallsNoetig({ code, rundenNummer, bearbeitungszeitBereitsGesetzt }, db) {
    if (bearbeitungszeitBereitsGesetzt) return false;
    const rundenRef = db.collection('spiele').doc(code).collection('runden').doc(String(rundenNummer));
    try {
      await rundenRef.update({
        dorAbgeschlossen: true,
        phase: 'dor_abgeschlossen',
        bearbeitungszeitStart: firebase.firestore.FieldValue.serverTimestamp(),
      });
      return true;
    } catch (err) {
      // Jemand anderes war schneller, oder DoR war (theoretisch) doch noch
      // nicht abgeschlossen - kein Fehlerfall aus Nutzersicht.
      return false;
    }
  }

  global.FlowGame = global.FlowGame || {};
  Object.assign(global.FlowGame, {
    starteRunde, loeseDefinitionOfReadyAus, starteBearbeitungszeitFallsNoetig,
  });
})(window);
