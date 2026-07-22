/**
 * FEATURE-001 – Browser-Version von src/game/createGame.js.
 * Identische Logik wie das Node-Modul, hier als klassisches <script> (kein
 * Bundler im Projekt) über window.FlowGame verfügbar gemacht. Läuft gegen
 * die Firebase COMPAT-SDK (firebase.firestore()).
 *
 * KORREKTUR (2026-07-17): erzeugt jetzt zusätzlich spiele/{code}/geheim/kennung
 * (hostKennung liegt dort, nie client-lesbar) statt hostKennung direkt im
 * spiele-Dokument zu speichern – siehe firestore.rules für die Begründung
 * (Vertraulichkeit: das oberste Spiel-Dokument muss für den Beitritts-Fluss
 * breit lesbar sein und darf deshalb keine Geheimnisse mehr enthalten).
 *
 * WICHTIG: Bei Änderungen an src/game/createGame.js muss diese Datei
 * inhaltlich synchron gehalten werden (kein Build-Schritt im Projekt).
 *
 * BUGFIX-001 (2026-07-21): Der Transaktions-Lesevorgang (tx.get(spielRef))
 * unten trägt auf einem frischen Gerät dasselbe "client is offline"-Risiko
 * wie in joinGame.js beschrieben – deshalb ebenfalls mit
 * mitVerbindungsRetry() (aus verbindungsRetry.js) abgesichert. Die
 * CODE_KOLLISION-Retry-Schleife bleibt davon unberührt.
 */
(function (global) {
  'use strict';

  const { mitVerbindungsRetry } = global.FlowGame;

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

  async function createGame({ hostAnzeigename, uid, sprache }, db) {
    if (!hostAnzeigename || !hostAnzeigename.trim()) {
      const fehler = new Error('Anzeigename ist erforderlich.');
      fehler.code = 'ANZEIGENAME_ERFORDERLICH';
      throw fehler;
    }
    if (!uid) {
      const fehler = new Error('Fehlende Auth-Sitzung (uid) – anonyme Anmeldung ist Voraussetzung.');
      fehler.code = 'FEHLENDE_AUTH_SITZUNG';
      throw fehler;
    }
    // FEATURE-006 (AK 1, AK 9): Default STANDARD_SPRACHE ("en") von
    // window.FlowGame.SPRACHEN/STANDARD_SPRACHE (js/game/sprache.js, muss vor
    // dieser Datei als <script> eingebunden sein), wenn keine eigene, gültige
    // Sprache übergeben wurde.
    const spracheListe = global.FlowGame.SPRACHEN || ['de', 'en'];
    const standardSprache = global.FlowGame.STANDARD_SPRACHE || 'en';
    const spielSprache = spracheListe.includes(sprache) ? sprache : standardSprache;

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
            erstelltAm: jetzt,
            letzteAktivitaet: jetzt,
            belegteStationen: {},
            sprache: spielSprache,
          });
          tx.set(spielRef.collection('geheim').doc('kennung'), { hostKennung });
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