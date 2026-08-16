/**
 * FEATURE-002 – Browser-Version von src/game/kartenBewegung.js.
 *
 * WICHTIGER ARCHITEKTUR-HINWEIS (getroffen beim Bau der Spielbrett-
 * Oberfläche, 2026-07-18, siehe Abschlussbericht an Stephan): firestore.rules
 * vergleicht die eigene Station direkt gegen die Kartenposition, beides als
 * Zahl (0-6): `mitgliedStation == vonPosition || mitgliedStation ==
 * nachPosition`. FEATURE-001 (joinGame.js, bereits live/getestet) schreibt in
 * teilnehmende/{uid}.station jedoch den STATIONSNAMEN als Text (z. B.
 * "wareneingang") – zum Zeitpunkt von FEATURE-001 korrekt und ausschliesslich
 * für die Lobby-Anzeige gedacht. Ohne Anpassung würde JEDE Kartenbewegung an
 * der Sicherheitsregel scheitern (String != Zahl, Firestore-Regeln
 * vergleichen typsicher).
 *
 * Fix, OHNE firestore.rules oder joinGame.js anzufassen (beide bewusst
 * unverändert gelassen, um FEATURE-001 nicht zu regressieren): Beim Betreten
 * des Spielbretts migriert jede Person EINMALIG ihr EIGENES
 * teilnehmende-Dokument (das erlaubt die bestehende Update-Regel: Ändern des
 * eigenen Dokuments, solange `rolle` unverändert bleibt) – `station` wird
 * dabei auf die Positionszahl (1-5, Reihenfolge = STATIONEN-Array aus
 * createGame.js) umgestellt, der ursprüngliche Name bleibt zusätzlich unter
 * `stationName` für die Anzeige erhalten.
 *
 * BUGFIX-016-ERWEITERUNG (2026-08-14): bewegeKarte() legt zusätzlich zur
 * Kartenänderung einen unveränderlichen Historieneintrag unter
 * runden/{n}/bewegungen an – beides in EINEM atomaren Batch. Grund: Das
 * Rundenende wurde bis dahin aus dem rein lokalen, flüchtigen Mitschnitt
 * desjenigen Clients berechnet, der als Erster alle Karten im Ziel sah; nach
 * einem Reload oder spätem Beitritt mitten in der Runde war dieser Mitschnitt
 * zwangsläufig lückenhaft.
 *
 * BEWUSSTE ASYMMETRIE ZUR NODE-REFERENZ (Node/Browser-Sync-Check,
 * flow-game-impl 3a): src/game/kartenBewegung.js bekommt diese Erweiterung
 * NICHT. Die Node-Fassung arbeitet ausschließlich auf einem prozessinternen
 * Speicher (_rundenStatus.js) ohne Firestore, kennt weder Unter-Sammlungen
 * noch servergesetzte Zeitstempel und kann eine serverseitige Historie
 * deshalb strukturell nicht abbilden. Ebenso unverändert bleibt
 * src/game/kennzahlen.js: sie rechnet aus bereits vor-aggregierten
 * bewegungen[]-Einträgen und setzt die Vollständigkeit ihrer Eingabe voraus –
 * genau deshalb laufen die Tests dieses Tickets gegen die echte
 * Browser-Fassung.
 */
(function (global) {
  'use strict';

  const STATIONEN = global.FlowGame.STATIONEN;

  function stationsNummerVon(wert) {
    if (typeof wert === 'number') return wert;
    if (typeof wert !== 'string') return null;
    const index = STATIONEN.indexOf(wert);
    return index === -1 ? null : index + 1;
  }

  async function stelleEigeneStationsnummerSicher({ code, uid, teilnehmerDaten }, db) {
    const nummer = stationsNummerVon(teilnehmerDaten.station);
    if (nummer === null) return null; // Host/Beobachtende: keine Station.
    if (typeof teilnehmerDaten.station === 'number') return nummer; // bereits migriert.

    const teilnehmerRef = db.collection('spiele').doc(code).collection('teilnehmende').doc(uid);
    await teilnehmerRef.update({
      station: nummer,
      stationName: teilnehmerDaten.station,
    });
    return nummer;
  }

  async function bewegeKarte({
    code, rundenNummer, kartenId, vonPosition, uid, stapel,
  }, db) {
    if (typeof vonPosition !== 'number') {
      const fehler = new Error('vonPosition ist erforderlich.');
      fehler.code = 'POSITION_FEHLT';
      throw fehler;
    }
    if (vonPosition + 1 > 6) {
      const fehler = new Error('Position 6 (Ziel) ist die letzte gültige Position.');
      fehler.code = 'POSITION_MAX';
      throw fehler;
    }
    const nachPosition = vonPosition + 1;
    const rundenRef = db.collection('spiele').doc(code)
      .collection('runden').doc(String(rundenNummer));
    const kartenRef = rundenRef.collection('karten').doc(kartenId);
    // BUGFIX-016: unveraenderlicher Historieneintrag je Bewegung, mit
    // AUTO-ID (doc() ohne Argument) - jede Bewegung ist ein eigener,
    // neuer Eintrag; eine ableitbare Id (z.B. kartenId+nachPosition)
    // waere zwar auch eindeutig, wuerde aber die Unveraenderlichkeit
    // schwerer pruefbar machen.
    const bewegungRef = rundenRef.collection('bewegungen').doc();

    // BUGFIX-016, Pre-Mortem-Risiko 5: Kartenaenderung UND Historieneintrag
    // entstehen in EINEM einzigen, atomaren Schreibvorgang. Kein "erst A,
    // dann B" - sonst koennte ein Abbruch dazwischen genau den Zustand
    // hinterlassen, den dieses Ticket beseitigt (Karte bewegt, Taetigkeit
    // nirgends festgehalten). Lehnt der Server den Historieneintrag ab,
    // verwirft Firestore den gesamten Commit, die Karte bleibt stehen und
    // der Fehler wird an den Aufrufer durchgereicht (bewusst NICHT
    // geschluckt - die bestehende Fehlerbehandlung in spiel.html laesst die
    // Karte sichtbar an ihre echte Position zurueckspringen).
    const stapelWert = (stapel === undefined || stapel === null) ? null : stapel;
    const batch = db.batch();
    batch.update(kartenRef, {
      position: nachPosition,
      letzteBewegungVon: uid,
      letzteBewegungAm: firebase.firestore.FieldValue.serverTimestamp(),
    });
    batch.set(bewegungRef, {
      // BUGFIX-016 (Nacharbeit Zweitpruefung, 2026-08-14): Eintragstyp. In den
      // Runden 1-3 gibt es nur Weitergaben; Runde 4 kennt zusaetzlich
      // 'wuerfelversuch' (siehe rundeVier.js). Das Merkmal steht hier
      // ausdruecklich mit, damit die Vollstaendigkeitspruefung beide Typen
      // sauber auseinanderhalten kann, ohne aus anderen Feldern zu raten.
      art: 'weitergabe',
      // Zustaendige Station der Bewegung - dieselbe Zuordnungsregel wie im
      // Karten-Listener in spiel.html und in bewegungErlaubt() in
      // firestore.rules ("die abgebende Station loest aus", Ausnahme
      // Auftragseingang -> Station 1).
      station: Math.max(nachPosition - 1, 1),
      kartenId: kartenId,
      uid: uid,
      // Product.md §9: die Zeit bestimmt der Server, nicht die Uhr im
      // Browser. firestore.rules erzwingt das zusaetzlich (wann ==
      // request.time).
      wann: firebase.firestore.FieldValue.serverTimestamp(),
      nachPosition: nachPosition,
      stapel: stapelWert,
    });
    await batch.commit();
  }

  global.FlowGame = global.FlowGame || {};
  Object.assign(global.FlowGame, {
    stationsNummerVon,
    stelleEigeneStationsnummerSicher,
    bewegeKarte,
  });
})(window);
