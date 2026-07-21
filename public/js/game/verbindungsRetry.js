/**
 * BUGFIX-001 – Browser-Version von src/game/verbindungsRetry.js. Siehe
 * Hinweis in public/js/game/createGame.js zur manuellen Synchronhaltung mit
 * dem Node-Modul (kein Bundler im Projekt). Reine Funktionslogik, kein
 * eigener Firestore-Zugriff. Muss VOR joinGame.js/createGame.js/
 * teilnehmerSession.js als <script> eingebunden sein (siehe public/spiel.html).
 */
(function (global) {
  'use strict';

  const TRANSIENTE_FEHLERCODES = ['unavailable', 'deadline-exceeded'];
  const TRANSIENTER_FEHLERTEXT_MUSTER = /client is offline/i;

  const STANDARD_MAX_VERSUCHE = 4;
  const STANDARD_BASIS_WARTEZEIT_MS = 400;

  function istTransienterVerbindungsFehler(err) {
    if (!err) return false;
    if (err.code && TRANSIENTE_FEHLERCODES.includes(err.code)) {
      return true;
    }
    return typeof err.message === 'string' && TRANSIENTER_FEHLERTEXT_MUSTER.test(err.message);
  }

  function warte(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  async function mitVerbindungsRetry(aufgabe, optionen = {}) {
    const maxVersuche = optionen.maxVersuche || STANDARD_MAX_VERSUCHE;
    const basisWartezeitMs = optionen.basisWartezeitMs != null
      ? optionen.basisWartezeitMs
      : STANDARD_BASIS_WARTEZEIT_MS;
    const onRetry = typeof optionen.onRetry === 'function' ? optionen.onRetry : null;

    let versuch = 0;
    for (;;) {
      versuch += 1;
      try {
        return await aufgabe();
      } catch (err) {
        if (!istTransienterVerbindungsFehler(err) || versuch >= maxVersuche) {
          throw err;
        }
        if (onRetry) {
          onRetry(versuch + 1);
        }
        await warte(basisWartezeitMs * versuch);
      }
    }
  }

  global.FlowGame = global.FlowGame || {};
  Object.assign(global.FlowGame, { mitVerbindungsRetry, istTransienterVerbindungsFehler });
})(window);
