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

module.exports = { restoreHostSession };