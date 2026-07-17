/**
 * FEATURE-001 – Phase 1: Spiel-Räume
 * Host-Session-Kennung: stellt die Moderationsrechte des Hosts nach eigenem
 * Neuladen/kurzem Verbindungsverlust wieder her (geklärte Frage 5), OHNE
 * Cloud Function – siehe firestore.rules, match /teilnehmende/{uid} allow create.
 *
 * Ablauf: die lokal gespeicherte Kennung wird gegen die im Spieldokument
 * hinterlegte hostKennung geprüft. Bei Übereinstimmung legt/aktualisiert der
 * Host sein eigenes Teilnehmenden-Dokument (Doc-ID = eigene, ggf. neue
 * Auth-UID) erneut mit rolle "host" an. Die Sicherheitsregeln akzeptieren
 * genau diesen einen Schreibvorgang nur, wenn die mitgeschickte hostKennung
 * mit der im Spieldokument gespeicherten übereinstimmt.
 */

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

module.exports = { restoreHostSession };
