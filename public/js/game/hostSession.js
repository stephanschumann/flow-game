/**
 * FEATURE-001 – Browser-Version von src/game/hostSession.js. Siehe Hinweis in
 * public/js/game/createGame.js zur manuellen Synchronhaltung mit dem
 * Node-Modul (kein Bundler im Projekt).
 */
(function (global) {
  'use strict';

  async function restoreHostSession({ code, hostSessionKennung, uid }, db) {
    if (!code || typeof code !== 'string') {
      throw new Error('Ungültiger oder unbekannter Code.');
    }
    if (!uid) {
      throw new Error('Fehlende Auth-Sitzung (uid) – anonyme Anmeldung ist Voraussetzung.');
    }

    const spielRef = db.collection('spiele').doc(code);
    const spielSnap = await spielRef.get();
    if (!spielSnap.exists) {
      throw new Error(`Kein Spiel mit dem Code "${code}" gefunden.`);
    }
    const spiel = spielSnap.data();

    if (!hostSessionKennung || hostSessionKennung !== spiel.hostKennung) {
      throw new Error('Host-Session-Kennung ist ungültig.');
    }

    const teilnehmerRef = spielRef.collection('teilnehmende').doc(uid);
    await teilnehmerRef.set(
      {
        rolle: 'host',
        hostKennung: spiel.hostKennung,
        wiederhergestelltAm: Date.now(),
      },
      { merge: true }
    );

    return { rolle: 'host', spielCode: code };
  }

  global.FlowGame.restoreHostSession = restoreHostSession;
})(window);
