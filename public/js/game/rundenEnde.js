/**
 * FEATURE-002 – Browser-Version von src/game/rundenEnde.js.
 *
 * Anders als das Node-Original (das rein den prozessinternen Speicher aus
 * _rundenStatus.js abfragt) SCHREIBT diese Version bei erkanntem
 * Rundenende tatsächlich das Rundendokument fort (phase:'beendet',
 * servergesetztes durchlaufzeitEnde) – siehe firestore.rules, Fall B der
 * runden-Update-Regel. Jeder verbundene Client, der die letzte Karte im Ziel
 * sieht, versucht das opportunistisch; der lokale phase-Check unten plus die
 * serverseitige Vorbedingung (dorAbgeschlossen bereits true) verhindern
 * unnötige Wiederholungen. Restrisiko (dokumentiert, siehe Abschlussbericht):
 * zwei Clients könnten im selben Sekundenbruchteil beide noch phase !==
 * 'beendet' sehen und je einen eigenen serverTimestamp() schreiben – der
 * zweite überschreibt dann durchlaufzeitEnde geringfügig später. Ohne Cloud
 * Functions/serverseitige Transaktion über mehrere Clients hinweg nicht
 * vollständig vermeidbar, praktisch aber vernachlässigbar (Millisekunden).
 */
(function (global) {
  'use strict';

  const ZIEL_POSITION = 6;

  async function pruefeUndSetzeRundenEnde({
    code, rundenNummer, karten, rundenPhase,
  }, db) {
    const alleImZiel = Array.isArray(karten) && karten.length === 6
      && karten.every((k) => k.position === ZIEL_POSITION);

    if (!alleImZiel || rundenPhase === 'beendet') {
      return false;
    }

    const rundenRef = db.collection('spiele').doc(code).collection('runden').doc(String(rundenNummer));
    try {
      await rundenRef.update({
        phase: 'beendet',
        durchlaufzeitEnde: firebase.firestore.FieldValue.serverTimestamp(),
        bearbeitungszeitEnde: firebase.firestore.FieldValue.serverTimestamp(),
      });
      return true;
    } catch (err) {
      // Ein anderer Client war schneller (oder dorAbgeschlossen war doch noch
      // nicht gesetzt) - kein Fehlerfall aus Nutzersicht, einfach ignorieren.
      return false;
    }
  }

  global.FlowGame = global.FlowGame || {};
  Object.assign(global.FlowGame, { pruefeUndSetzeRundenEnde });
})(window);
