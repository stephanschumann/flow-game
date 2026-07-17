/**
 * FEATURE-001 – Browser-Version von src/game/createGame.js.
 * Identische Logik wie das Node-Modul (getestet in tests/game-rooms.logic.test.js
 * und tests/_manual-smoke/), hier als klassisches <script> (kein Bundler im
 * Projekt) über window.FlowGame verfügbar gemacht. Läuft gegen die Firebase
 * COMPAT-SDK (firebase.firestore()), die dieselbe .collection()/.doc()-API
 * wie im Node-Modul bereitstellt.
 *
 * WICHTIG: Bei Änderungen an src/game/createGame.js muss diese Datei
 * inhaltlich synchron gehalten werden (kein Build-Schritt im Projekt).
 */
(function (global) {
  'use strict';

  const STATIONEN = [
    'wareneingang',
    'kommissionierung',
    'packstation',
    'versand',
    'qualitaetskontrolle',
  ];

  const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const CODE_LAENGE = 8;

  function zufallsCode() {
    let ergebnis = '';
    for (let i = 0; i < CODE_LAENGE; i += 1) {
      ergebnis += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    return ergebnis;
  }

  function zufallsGeheimnis() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '');
    }
    let ergebnis = '';
    for (let i = 0; i < 48; i += 1) {
      ergebnis += Math.floor(Math.random() * 16).toString(16);
    }
    return ergebnis;
  }

  async function createGame({ hostAnzeigename, uid }, db) {
    if (!hostAnzeigename || !hostAnzeigename.trim()) {
      throw new Error('Anzeigename ist erforderlich.');
    }
    if (!uid) {
      throw new Error('Fehlende Auth-Sitzung (uid) – anonyme Anmeldung ist Voraussetzung.');
    }

    const hostKennung = zufallsGeheimnis();
    const maxVersuche = 10;

    for (let versuch = 0; versuch < maxVersuche; versuch += 1) {
      const code = zufallsCode();
      const spielRef = db.collection('spiele').doc(code);

      try {
        await db.runTransaction(async (tx) => {
          const bestehend = await tx.get(spielRef);
          if (bestehend.exists) {
            throw new Error('CODE_KOLLISION');
          }
          const jetzt = Date.now();
          tx.set(spielRef, {
            code,
            hostKennung,
            erstelltAm: jetzt,
            letzteAktivitaet: jetzt,
            belegteStationen: {},
          });
          tx.set(spielRef.collection('teilnehmende').doc(uid), {
            rolle: 'host',
            anzeigename: hostAnzeigename.trim(),
            hostKennung,
          });
        });
        return { code, hostSessionKennung: hostKennung };
      } catch (err) {
        if (err.message === 'CODE_KOLLISION') {
          continue;
        }
        throw err;
      }
    }
    throw new Error('Konnte keinen eindeutigen Beitritts-Code erzeugen. Bitte erneut versuchen.');
  }

  global.FlowGame = global.FlowGame || {};
  Object.assign(global.FlowGame, { createGame, STATIONEN, CODE_ALPHABET });
})(window);
