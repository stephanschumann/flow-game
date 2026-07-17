/**
 * FEATURE-001 – Phase 1: Spiel-Räume
 * Host-Session-Kennung: stellt die Moderationsrechte des Hosts nach eigenem
 * Neuladen/kurzem Verbindungsverlust wieder her (geklärte Frage 5), OHNE
 * Cloud Function.
 *
 * KORREKTUR (2026-07-17): hostKennung liegt jetzt in spiele/{code}/geheim/kennung
 * und ist NIE client-lesbar (siehe firestore.rules). Diese Funktion prüft die
 * Kennung deshalb nicht mehr selbst per Lesevergleich, sondern versucht direkt
 * den Schreibvorgang – die Sicherheitsregel entscheidet serverseitig, ob die
 * mitgeschickte Kennung korrekt ist (getAfter()-Vergleich gegen geheim/kennung).
 * Schlägt der Schreibvorgang fehl (PERMISSION_DENIED), war die Kennung falsch.
 */

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

module.exports = { restoreHostSession };