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
 *
 * BUGFIX-005 (2026-07-28, Freigabe-Entscheidung 1 / Option A zweiter Satz):
 * Der automatische Host-Wiederherstellungsversuch darf ein bereits bestehendes
 * teilnehmende/{uid}-Dokument mit einer ANDEREN Rolle (spielende/beobachtende)
 * nicht mehr stillschweigend überschreiben – ein solches Dokument kann nur
 * durch einen zwischenzeitlich bewusst abgeschlossenen Beitritt (joinGame())
 * entstanden sein, z. B. weil dieselbe anonyme Auth-uid origin-weit über
 * mehrere Tabs desselben Browsers geteilt wird (siehe
 * chrome-multi-identity-testing-conventions). Die bewusste Handlung gewinnt
 * (AK6): statt blind zu `.set(..., {merge:true})`, wird der aktuelle
 * Dokumentzustand zuerst gelesen; existiert bereits ein Dokument mit einer
 * anderen Rolle als 'host', wird der Wiederherstellungsversuch abgebrochen
 * (HOST_ROLLE_BEREITS_ANDERWEITIG_VERGEBEN), statt das Dokument zu
 * überschreiben. Ein bereits bestehendes Dokument MIT rolle='host' (der
 * reguläre FEATURE-001-Reload-Fall) bleibt davon unberührt und wird wie
 * bisher per merge aktualisiert.
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

  // BUGFIX-005: bereits bestehendes, andersrolliges Dokument nicht überschreiben.
  const bestehenderSnap = await teilnehmerRef.get();
  if (bestehenderSnap.exists && bestehenderSnap.data().rolle !== 'host') {
    const fehler = new Error(
      'Diese Person ist in diesem Spiel bereits mit einer anderen Rolle beigetreten – ' +
        'die automatische Host-Wiederherstellung wird deshalb nicht durchgeführt.'
    );
    fehler.code = 'HOST_ROLLE_BEREITS_ANDERWEITIG_VERGEBEN';
    throw fehler;
  }

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