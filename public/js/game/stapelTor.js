/**
 * FEATURE-002 – Browser-Version von src/game/stapelTor.js. Siehe Kopfkommentar
 * in public/js/game/createGame.js zum Muster der manuellen Synchronhaltung
 * (kein Bundler im Projekt).
 *
 * Anders als das Node-Original braucht diese Version keine eigene
 * Firestore-Abfrage: spiel.html hält die Kartenliste der aktuellen Runde
 * ohnehin schon live per onSnapshot im Speicher, deshalb zählt
 * `stapelTorOffen()` direkt gegen diese bereits geladene Liste. Das ist
 * ausschliesslich eine UI-Vorabprüfung (Button aktiv/inaktiv) – die wirkliche
 * Durchsetzung passiert serverseitig in firestore.rules (stapelTorOffen()
 * dort, mit identischer Schwellen-/Ausnahme-Logik).
 */
(function (global) {
  'use strict';

  const SCHWELLEN = { 1: 6, 2: 3, 3: 1 };

  function stapelTorSchwelle(rundenNummer) {
    const schwelle = SCHWELLEN[rundenNummer];
    if (schwelle === undefined) {
      const fehler = new Error(`Unbekannte Rundennummer: ${rundenNummer}`);
      fehler.code = 'UNBEKANNTE_RUNDE';
      throw fehler;
    }
    return schwelle;
  }

  // BUGFIX (2026-07-18, siehe identischer Kommentar in src/game/stapelTor.js
  // und firestore.rules): >= statt ==, sonst schließt das Tor nach der ersten
  // durchgelassenen Karte sofort wieder.
  function zaehleAngekommeneKartenAusListe({ karten, position, stapel }) {
    if (!Array.isArray(karten)) {
      const fehler = new Error('karten muss eine Liste von Karten-Dokumenten sein.');
      fehler.code = 'UNGUELTIGE_KARTENLISTE';
      throw fehler;
    }
    return karten.filter((karte) => {
      if (karte.position < position) return false;
      if (stapel && karte.stapel !== stapel) return false;
      return true;
    }).length;
  }

  // vonPosition == 0 (Auftragseingang -> Station 1) ist immer offen, unabhängig
  // von der Rundenschwelle (Entscheidung 2026-07-18, siehe firestore.rules
  // stapelTorOffen()) – deshalb hier keine Zählung nötig.
  function stapelTorOffen({ rundenNummer, vonPosition, stapel, karten }) {
    if (vonPosition === 0) return true;
    const schwelle = stapelTorSchwelle(rundenNummer);
    const angekommen = zaehleAngekommeneKartenAusListe({ karten, position: vonPosition, stapel });
    return angekommen >= schwelle;
  }

  global.FlowGame = global.FlowGame || {};
  Object.assign(global.FlowGame, {
    stapelTorSchwelle,
    zaehleAngekommeneKartenAusListe,
    stapelTorOffen,
  });
})(window);
