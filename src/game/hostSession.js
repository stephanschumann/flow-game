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
 *
 * FEATURE-018 (2026-08-04, Befund 3/4, Option A): hostKennung wird jetzt NUR
 * NOCH dann mitgeschrieben, wenn für diese uid noch KEIN Dokument existiert
 * (neues Gerät/neue uid beansprucht die Host-Rolle für ein bereits
 * bestehendes Spiel neu – der einzige Fall, in dem firestore.rules
 * überhaupt noch einen hostKennung-Nachweis verlangt, siehe "allow create"
 * dort). Existiert das Dokument bereits (der weitaus häufigere Fall:
 * dieselbe Person lädt ihre eigene Sitzung neu), ist kein Nachweis mehr
 * nötig – die Update-Regel prüft ohnehin nur, dass `rolle` unverändert
 * bleibt. Wichtig: ein bereits bestehendes Dokument darf hostKennung NICHT
 * erneut bekommen, weil ein mitspielender Host (mit station-Feld) sonst
 * über die jetzt gelockerte Leseregel für andere Teilnehmende sichtbar
 * würde UND dabei versehentlich die Kennung mit offenlegen würde.
 *
 * FEATURE-011 (2026-08-08): Die manuelle Zurückeroberung der Host-Rolle
 * (Formular Code+Kennzeichen auf einem neuen Gerät) ruft diese Funktion
 * unverändert wieder auf – an der eigentlichen Kernlogik oben ändert sich
 * nichts. Neu ist ausschliesslich die "vorher mitspielend"-Erkennung
 * (Karteileiche-Fall, FEATURE-018-Bezug, Pre-Mortem-Risiko 5) am Ende dieser
 * Funktion: das Signal wird serverseitig aus dem VORHERIGEN Spielzustand
 * abgeleitet (spiele/{code}.belegteStationen), NICHT aus dem gerade erst neu
 * angelegten, immer stationslosen Dokument dieser (neuen) uid – sonst gäbe es
 * nie einen Vergleichswert. Rückgabe wird um warVorherMitspielenderHost
 * (boolean) und verwaisteStation (Stationskennung oder null) erweitert; beim
 * regulären FEATURE-001-Reload (gleiche uid) und BUGFIX-005 ist ownerUid in
 * belegteStationen nie eine ANDERE uid als die eigene, daher bleibt das neue
 * Signal dort immer false/null.
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

  const daten = { rolle: 'host', wiederhergestelltAm: Date.now() };
  if (!bestehenderSnap.exists) {
    daten.hostKennung = hostSessionKennung;
  }

  try {
    await teilnehmerRef.set(daten, { merge: true });
  } catch (err) {
    const fehler = new Error('Host-Session-Kennung ist ungültig.');
    fehler.code = 'HOST_KENNUNG_UNGUELTIG';
    throw fehler;
  }

  // FEATURE-011: "vorher mitspielender Host"-Erkennung (Karteileiche-Fall),
  // siehe Kopfkommentar. Rein lesend, ändert keinen bestehenden Zustand.
  let warVorherMitspielenderHost = false;
  let verwaisteStation = null;
  const spielSnap = await db.collection('spiele').doc(code).get();
  const belegteStationen = (spielSnap.exists && spielSnap.data().belegteStationen) || {};
  const stationsEintraege = Object.entries(belegteStationen);
  for (let i = 0; i < stationsEintraege.length; i += 1) {
    const [station, ownerUid] = stationsEintraege[i];
    if (ownerUid === uid) {
      // eslint-disable-next-line no-continue
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const ownerSnap = await db.collection('spiele').doc(code).collection('teilnehmende').doc(ownerUid).get();
    if (ownerSnap.exists && ownerSnap.data().rolle === 'host' && ownerSnap.data().station === station) {
      warVorherMitspielenderHost = true;
      verwaisteStation = station;
      break;
    }
  }

  return {
    rolle: 'host',
    spielCode: code,
    warVorherMitspielenderHost,
    verwaisteStation,
  };
}

module.exports = { restoreHostSession };