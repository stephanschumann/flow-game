/**
 * FEATURE-003 – Browser-Version von src/game/vergleichsansicht.js.
 *
 * Identische, triviale Logik wie das Node-Original (sortiert eine Liste
 * bereits serverseitig berechneter Runden-Kennzahlen nach Rundennummer) -
 * hier als klassisches <script> über window.FlowGame verfügbar gemacht,
 * damit spiel.html dieselbe, bereits gegen tests/game-evaluation.logic.test.js
 * geprüfte Sortier-/Iterationslogik verwendet statt einer eigenen,
 * abweichenden Variante.
 *
 * WICHTIG: Bei Änderungen an src/game/vergleichsansicht.js muss diese Datei
 * inhaltlich synchron gehalten werden (kein Build-Schritt im Projekt).
 */
(function (global) {
  'use strict';

  async function erstelleVergleichsansicht({ runden } = {}) {
    const liste = Array.isArray(runden) ? runden.slice() : [];
    liste.sort((a, b) => a.rundenNummer - b.rundenNummer);
    return liste;
  }

  global.FlowGame = global.FlowGame || {};
  Object.assign(global.FlowGame, { erstelleVergleichsansicht });
})(window);
