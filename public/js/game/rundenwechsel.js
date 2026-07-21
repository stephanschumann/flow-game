/**
 * FEATURE-002/FEATURE-004 – Browser-Version von src/game/rundenwechsel.js.
 *
 * Der eigentliche Rundenwechsel ist technisch identisch zu einem
 * Rundenstart (siehe rundenStart.js: starteRunde() legt bereits generisch
 * JEDE Rundennummer inklusive Folgerunden an, mit denselben sechs Karten auf
 * Position 0 und demselben Beitritts-Code) – dieses Modul ist trotzdem ein
 * eigener, klar benannter Einstiegspunkt, weil (a) die Akzeptanzkriterien
 * einen ausdrücklich vom Host ausgelösten "nächste Runde starten"-Schritt
 * verlangen (kein automatischer Wechsel) und (b) src/game/rundenwechsel.js
 * als eigenständiges Modul in der Node-Referenz existiert.
 *
 * FEATURE-004-ERWEITERUNG: Runde 4 hat ein GRUNDVERSCHIEDENES Datenmodell
 * (zwölf "elemente" + "fortschritt"-Dokumente statt sechs "karten", siehe
 * rundeVier.js) - deshalb hier bewusst ein eigener Zweig für den Wechsel von
 * Runde 3 zu Runde 4, statt starteRunde() (das weiterhin ausschliesslich
 * "karten" anlegt) auch für Runde 4 wiederzuverwenden. Der bestehende Pfad
 * für Runde 1→2 und 2→3 bleibt dabei unverändert (kein Regressionsrisiko für
 * FEATURE-002/003).
 */
(function (global) {
  'use strict';

  async function wechsleZurNaechstenRunde({ code, vonRunde }, db) {
    if (typeof vonRunde !== 'number') {
      throw new Error('vonRunde ist erforderlich.');
    }
    if (vonRunde >= 4) {
      throw new Error('Runde 4 ist die letzte Runde - kein weiterer Wechsel möglich.');
    }
    if (vonRunde === 3) {
      return global.FlowGame.starteRundeVier({ code }, db);
    }
    return global.FlowGame.starteRunde({ code, rundenNummer: vonRunde + 1 }, db);
  }

  global.FlowGame = global.FlowGame || {};
  Object.assign(global.FlowGame, { wechsleZurNaechstenRunde });
})(window);
