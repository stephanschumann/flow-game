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
    code, rundenNummer, kartenId, vonPosition, uid,
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
    const kartenRef = db.collection('spiele').doc(code)
      .collection('runden').doc(String(rundenNummer))
      .collection('karten').doc(kartenId);

    await kartenRef.update({
      position: vonPosition + 1,
      letzteBewegungVon: uid,
      letzteBewegungAm: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  global.FlowGame = global.FlowGame || {};
  Object.assign(global.FlowGame, {
    stationsNummerVon,
    stelleEigeneStationsnummerSicher,
    bewegeKarte,
  });
})(window);
