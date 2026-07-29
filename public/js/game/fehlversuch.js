/**
 * FEATURE-008 – Browser-only: neue Kennzahl "Fehlversuche" (finale Klärung
 * Frage 8, Backlog.md "### FEATURE-008").
 *
 * Kein Node-Pendant nötig (reiner Ein-Feld-Update auf spiele/{code}/runden/{n},
 * gleiche Begründung wie bei public/js/game/ergebnisseFreigeben.js: die
 * eigentliche Durchsetzung liegt vollständig in firestore.rules, "FEATURE-008:
 * neue Kennzahl 'Fehlversuche'").
 *
 * Ein absichtlicher Fehlversuch (Karte über einer falschen Spalte
 * losgelassen) erzeugt NIE eine Firestore-Dokumentänderung auf der
 * karten-Collection (AK14, structurell ausgeschlossen, siehe Analyse-Spec) -
 * er ist deshalb für andere Clients sonst nirgends beobachtbar. Diese
 * Funktion meldet ihn deshalb EXPLIZIT, als eigenen, bewussten Schreibvorgang
 * (Empfehlung der finalen Klärung 8), direkt aus dem neuen Drop-Handler in
 * spiel.html - unabhängig vom (bewusst NICHT ausgelösten) Bewegungsversuch
 * selbst.
 *
 * Datenmodell (eigene, begründete Festlegung dieser Implementierung, siehe
 * auch Kopfkommentar von tests/game-drag-drop.security.rules.test.js): ein
 * flaches, globales Zahlenfeld `fehlversuche` auf spiele/{code}/runden/{n} -
 * analog zum bereits bestehenden, ebenfalls flachen `qualitaet.fehlerhaft`
 * aus Runde 4 (kein Aufschlüsseln je Station, siehe Stephans eigener
 * Vergleich "wie bei den anderen Spielen auch"). firestore.rules erzwingt
 * serverseitig, dass nur eine Person mit eigener Station schreiben darf und
 * jeder Schreibvorgang den Zähler um exakt 1 erhöht (Manipulationsschutz).
 *
 * Fire-and-forget aus Aufrufersicht (siehe spiel.html): eine seltene Race
 * Condition beim Zählen (zwei fast gleichzeitige Fehlversuche derselben
 * Person) darf den eigentlichen, bereits lokal angezeigten Hinweis an die
 * spielende Person nicht blockieren - gleiches Muster wie
 * starteBearbeitungszeitFallsNoetig() in rundenStart.js.
 */
(function (global) {
  'use strict';

  async function meldeFehlversuch({ code, rundenNummer, bisherigeFehlversuche }, db) {
    const rundenRef = db.collection('spiele').doc(code).collection('runden').doc(String(rundenNummer));
    await rundenRef.update({
      fehlversuche: (bisherigeFehlversuche || 0) + 1,
    });
  }

  global.FlowGame = global.FlowGame || {};
  Object.assign(global.FlowGame, { meldeFehlversuch });
})(window);
