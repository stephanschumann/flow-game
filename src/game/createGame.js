/**
 * FEATURE-001 – Phase 1: Spiel-Räume
 * Erstellt ein neues Spiel mit eindeutigem Beitritts-Code und legt den Host
 * als ersten Teilnehmenden an.
 *
 * Datenmodell (Option B, von Stephan freigegeben):
 *  - spiele/{code}                       Spiel-Metadaten (keine Geheimnisse)
 *  - spiele/{code}/geheim/kennung        NUR { hostKennung }, nie client-lesbar
 *  - spiele/{code}/teilnehmende/{uid}    ein Dokument pro Teilnehmendem
 *
 * uid kommt von firebase.auth().currentUser.uid nach anonymer Anmeldung.
 *
 * BUGFIX-001 (2026-07-21): Der Transaktions-Lesevorgang (tx.get(spielRef))
 * unten läuft auf einem frischen Gerät unmittelbar nach signInAnonymously()
 * und trägt strukturell dasselbe "client is offline"-Risiko wie in
 * joinGame.js beschrieben (siehe Backlog.md "### BUGFIX-001") – deshalb
 * ebenfalls mit mitVerbindungsRetry() abgesichert. Die CODE_KOLLISION-Retry-
 * Schleife bleibt davon unberührt: mitVerbindungsRetry() erkennt
 * CODE_KOLLISION nicht als transienten Verbindungsfehler und wirft ihn sofort
 * unverändert weiter, sodass der äußere try/catch wie bisher greift.
 */

const { mitVerbindungsRetry } = require('./verbindungsRetry');

const STATIONEN = [
  'wareneingang',
  'kommissionierung',
  'packstation',
  'versand',
  'qualitaetskontrolle',
];

// 8 Zeichen, ohne leicht verwechselbare Zeichen (0/O, 1/I/l) – geklärte Frage 4.
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

async function createGame({ hostAnzeigename, uid }, db, retryOptionen = {}) {
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
      // eslint-disable-next-line no-await-in-loop
      await mitVerbindungsRetry(() => db.runTransaction(async (tx) => {
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
        });
        tx.set(spielRef.collection('geheim').doc('kennung'), { hostKennung });
        tx.set(spielRef.collection('teilnehmende').doc(uid), {
          rolle: 'host',
          anzeigename: hostAnzeigename.trim(),
          hostKennung,
        });
      }), retryOptionen);
      return { code, hostSessionKennung: hostKennung };
    } catch (err) {
      if (err.message === 'CODE_KOLLISION') {
        // eslint-disable-next-line no-continue
        continue;
      }
      throw err;
    }
  }
  throw new Error('Konnte keinen eindeutigen Beitritts-Code erzeugen. Bitte erneut versuchen.');
}

module.exports = { createGame, STATIONEN, CODE_ALPHABET };