/**
 * FEATURE-005 – Browser-Version von src/game/verbindungsStatus.js. Siehe
 * Hinweis in public/js/game/createGame.js zur manuellen Synchronhaltung mit
 * dem Node-Modul (kein Bundler im Projekt). Reine Funktionslogik, kein
 * eigener Firestore-Zugriff.
 */
(function (global) {
  'use strict';

  function ermittleVerbindungsStatus({ fromCache, hasPendingWrites }) {
    if (fromCache || hasPendingWrites) {
      return 'wird_wiederhergestellt';
    }
    return 'verbunden';
  }

  function verbindungsStatusText(status) {
    if (status === 'wird_wiederhergestellt') {
      return 'Verbindung wird wiederhergestellt …';
    }
    return '';
  }

  global.FlowGame = global.FlowGame || {};
  Object.assign(global.FlowGame, { ermittleVerbindungsStatus, verbindungsStatusText });
})(window);
