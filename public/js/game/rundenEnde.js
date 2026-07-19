/**
 * FEATURE-002/FEATURE-003 – Browser-Version von src/game/rundenEnde.js.
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
 *
 * FEATURE-003-ERWEITERUNG (2026-07-19, siehe Abschlussbericht an Stephan):
 * Berechnet und schreibt jetzt IM SELBEN update()-Aufruf zusätzlich alle
 * Kennzahlenfelder, die firestore.rules und tests/game-evaluation.*.test.js
 * auf spiele/{code}/runden/{n} erwarten (durchlaufzeit, bearbeitungszeit,
 * zeitBisErsterLieferung, zeitBisLetzterLieferung,
 * abstandErsteLetzteLieferung, proStation). Das MUSS im selben Schreibvorgang
 * passieren wie phase:'beendet', weil firestore.rules (Fall B, unverändert)
 * für JEDEN Update-Versuch, der die Kennzahlenfelder ergänzen will, erneut
 * verlangt, dass phase=='beendet' UND durchlaufzeitEnde==request.time in
 * genau diesem einen Schreibvorgang gesetzt werden – ein zweiter,
 * nachgelagerter Schreibvorgang (z. B. nachdem der aufgelöste
 * Server-Zeitstempel per Snapshot zurückkommt) würde von der Regel
 * abgelehnt, da durchlaufzeitEnde dann unverändert bliebe und nicht mehr
 * request.time entspräche.
 *
 * Daraus folgt eine bewusste, dokumentierte Einschränkung: `durchlaufzeit`
 * und `bearbeitungszeit` können zum Zeitpunkt dieses Schreibvorgangs noch
 * nicht exakt aus dem aufgelösten Server-Zeitstempel berechnet werden (der
 * ist erst NACH dem Commit bekannt) und werden deshalb mit dem lokalen
 * Date.now() als Näherung für das Rundenende gebildet - siehe
 * kennzahlen.js-Kopfkommentar für die vollständige Begründung. Alle übrigen
 * Kennzahlen (Lieferzeiten, Pro-Station-Beteiligung) beruhen dagegen
 * ausschließlich auf bereits echten, aufgelösten Server-Zeitstempeln
 * (Kartenbewegungen) und sind NICHT von dieser Näherung betroffen.
 */
(function (global) {
  'use strict';

  const ZIEL_POSITION = 6;

  async function pruefeUndSetzeRundenEnde({
    code, rundenNummer, karten, rundenPhase,
    durchlaufzeitStart, bearbeitungszeitStart, bewegungsLog,
  }, db) {
    const alleImZiel = Array.isArray(karten) && karten.length === 6
      && karten.every((k) => k.position === ZIEL_POSITION);

    if (!alleImZiel || rundenPhase === 'beendet') {
      return false;
    }

    const jetzt = Date.now();
    const kennzahlen = window.FlowGame.berechneKennzahlen({
      durchlaufzeitStart,
      durchlaufzeitEnde: jetzt,
      bearbeitungszeitStart,
      bearbeitungszeitEnde: jetzt,
      karten,
      bewegungsLog,
    });

    const rundenRef = db.collection('spiele').doc(code).collection('runden').doc(String(rundenNummer));
    try {
      await rundenRef.update(Object.assign({
        phase: 'beendet',
        durchlaufzeitEnde: firebase.firestore.FieldValue.serverTimestamp(),
        bearbeitungszeitEnde: firebase.firestore.FieldValue.serverTimestamp(),
      }, kennzahlen));
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
