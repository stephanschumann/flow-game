/**
 * FEATURE-006 – Browser-Version von src/game/sprache.js. Siehe Hinweis in
 * public/js/game/createGame.js zur manuellen Synchronhaltung mit dem
 * Node-Modul (kein Bundler im Projekt). Muss VOR createGame.js als <script>
 * eingebunden sein (createGame.js liest window.FlowGame.SPRACHEN/
 * STANDARD_SPRACHE beim eigenen Aufruf).
 */
(function (global) {
  'use strict';

  const SPRACHEN = ['de', 'en'];
  const STANDARD_SPRACHE = 'en';

  async function setzeSpielSprache({ code, sprache }, db) {
    if (!code || typeof code !== 'string') {
      const fehler = new Error('Ungültiger oder unbekannter Code.');
      fehler.code = 'UNGUELTIGER_CODE';
      throw fehler;
    }
    if (!SPRACHEN.includes(sprache)) {
      const fehler = new Error(
        'Ungültiger Sprachwert: "' + sprache + '". Erlaubt sind ausschliesslich ' + SPRACHEN.join('/') + '.'
      );
      fehler.code = 'UNGUELTIGE_SPRACHE';
      throw fehler;
    }

    await db.collection('spiele').doc(code).update({ sprache: sprache });
    return { code: code, sprache: sprache };
  }

  global.FlowGame = global.FlowGame || {};
  Object.assign(global.FlowGame, { SPRACHEN, STANDARD_SPRACHE, setzeSpielSprache });
})(window);
