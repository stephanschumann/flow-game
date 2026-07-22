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
      const fehler = new Error('Ungültiger oder unbekannter Code.');
      fehler.code = 'UNGUELTIGER_CODE';
      throw fehler;
    }
    if (!uid) {
      const fehler = new Error('Fehlende Auth-Sitzung (uid) – anonyme Anmeldung ist Voraussetzung.');
      fehler.code = 'FEHLENDE_AUTH_SITZUNG';
      throw fehler;
    }
    if (!hostSessionKennung) {
      const fehler = new Error('Host-Session-Kennung ist ungültig.');
      fehler.code = 'HOST_KENNUNG_UNGUELTIG';
      throw fehler;
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
      const fehler = new Error('Host-Session-Kennung ist ungültig.');
      fehler.code = 'HOST_KENNUNG_UNGUELTIG';
      throw fehler;
    }

    return { rolle: 'host', spielCode: code };
  }

  global.FlowGame.restoreHostSession = restoreHostSession;
})(window);