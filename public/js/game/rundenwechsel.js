/**
 * FEATURE-002 – Browser-Version von src/game/rundenwechsel.js.
 *
 * Der eigentliche Rundenwechsel ist technisch identisch zu einem
 * Rundenstart (siehe rundenStart.js: starteRunde() legt bereits generisch
 * JEDE Rundennummer inklusive Folgerunden an, mit denselben sechs Karten auf
 * Position 0 und demselben Beitritts-Code) – dieses Modul ist trotzdem ein
 * eigener, klar benannter Einstiegspunkt, weil (a) die Akzeptanzkriterien
 * einen ausdrücklich vom Host ausgelösten "nächste Runde starten"-Schritt
 * verlangen (kein automatischer Wechsel) und (b) src/game/rundenwechsel.js
 * als eigenständiges Modul in der Node-Referenz existiert.
 */
(function (global) {
  'use strict';

  async function wechsleZurNaechstenRunde({ code, vonRunde }, db) {
    if (typeof vonRunde !== 'number') {
      throw new Error('vonRunde ist erforderlich.');
    }
    if (vonRunde >= 3) {
      throw new Error('Runde 3 ist die letzte Runde - kein weiterer Wechsel möglich.');
    }
    return global.FlowGame.starteRunde({ code, rundenNummer: vonRunde + 1 }, db);
  }

  global.FlowGame = global.FlowGame || {};
  Object.assign(global.FlowGame, { wechsleZurNaechstenRunde });
})(window);
