/**
 * FEATURE-003 – Browser-only: Host-Aktion "Ergebnisse freigeben".
 *
 * Kein Node-Pendant nötig (reiner Zwei-Felder-Update auf spiele/{code}). Die
 * eigentliche Durchsetzung - nur Host, nur wenn die letzte gespielte Runde
 * bereits phase=='beendet' ist, nur mit echtem request.time - liegt
 * vollständig in firestore.rules (Kommentar dort: "FEATURE-003: Auswertung").
 * Die `letzteRundePhase`-Vorprüfung unten ist ausschließlich UX-Komfort
 * (vermeidet einen sichtbar sinnlosen Versuch samt Fehlermeldung für den
 * Host), keine Sicherheitsgrenze - ein Client, der diese Prüfung umgeht,
 * scheitert trotzdem an der Sicherheitsregel.
 *
 * Idempotenz (Pre-Mortem Risiko 1, Doppelklick): kein Vorab-Lesecheck nötig -
 * ein zweiter/gleichzeitiger Aufruf landet serverseitig im selben,
 * bereits als No-Op geprüften Zweig der Regel (siehe
 * tests/game-evaluation.security.rules.test.js, Szenario "Doppelte/
 * gleichzeitige Freigabe-Auslösung").
 */
(function (global) {
  'use strict';

  async function gibErgebnisseFrei({ code, letzteRundePhase }, db) {
    if (letzteRundePhase !== 'beendet') {
      throw new Error('Die letzte Runde ist noch nicht beendet - Freigabe noch nicht möglich.');
    }
    const spielRef = db.collection('spiele').doc(code);
    await spielRef.update({
      ergebnisseFreigegeben: true,
      ergebnisseFreigegebenAm: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  global.FlowGame = global.FlowGame || {};
  Object.assign(global.FlowGame, { gibErgebnisseFrei });
})(window);
