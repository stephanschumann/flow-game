/**
 * FEATURE-001 – Browser-Version von src/game/hostSession.js.
 *
 * KORREKTUR (2026-07-17): hostKennung liegt jetzt in spiele/{code}/geheim/kennung
 * und ist NIE client-lesbar (siehe firestore.rules). Diese Funktion prüft die
 * Kennung deshalb nicht mehr selbst per Lesevergleich, sondern versucht direkt
 * den Schreibvorgang – die Sicherheitsregel entscheidet serverseitig, ob die
 * mitgeschickte Kennung korrekt ist. Schlägt der Schreibvorgang fehl
 * (PERMISSION_DENIED), war die Kennung falsch.
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
    if (!hostSessionKennung) {
      throw new Error('Host-Session-Kennung ist ungültig.');
    }

    const teilnehmerRef = db.collection('spiele').doc(code).collection('teilnehmende').doc(uid);
    try {
      await teilnehmerRef.set(
        {
          rolle: 'host',
          hostKennung: hostSessionKennung,
          wiederhergestelltAm: Date.now(),
        },
        { merge: true }
      );
    } catch (err) {
      throw new Error('Host-Session-Kennung ist ungültig.');
    }

    return { rolle: 'host', spielCode: code };
  }

  global.FlowGame.restoreHostSession = restoreHostSession;
})(window);