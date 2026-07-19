/**
 * FEATURE-002/FEATURE-003 – Browser-Version von src/game/kennzahlen.js.
 *
 * FEATURE-003-KORREKTUR (2026-07-19, siehe Abschlussbericht an Stephan):
 * Die vorherige Fassung dieser Datei berechnete rein FÜR DIE ANZEIGE (nach
 * dem Rendern des bereits beendeten Runden-Dokuments) mit eigenen Feldnamen
 * (`durchlaufzeitMs`, `proPerson`, …), die NICHT mit den Feldnamen aus
 * `src/game/kennzahlen.js`/`firestore.rules`/den Jest-Tests
 * (`tests/game-evaluation.*.test.js`) übereinstimmten – dort werden
 * `durchlaufzeit`, `bearbeitungszeit`, `zeitBisErsterLieferung`,
 * `zeitBisLetzterLieferung`, `abstandErsteLetzteLieferung` und
 * `proStation[station].anzahlBewegungen`/`.beteiligungsspanne` erwartet.
 * Diese Datei ist jetzt an genau diese Feldnamen angeglichen (nicht
 * umgekehrt), weil `firestore.rules` und die Tests bereits von Stephan
 * abgenommen sind und nicht mehr geändert werden sollen.
 *
 * Diese Funktion hat jetzt eine andere Rolle als vorher: Sie wird von
 * rundenEnde.js SCHREIBEND aufgerufen, um genau die Felder zu berechnen, die
 * zusammen mit `phase:'beendet'` ins Runden-Dokument geschrieben werden
 * (Option A der FEATURE-003-Spec – Kennzahlen liegen direkt auf
 * spiele/{code}/runden/{n}). Die Anzeige selbst (spiel.html) liest diese
 * Felder danach nur noch direkt aus dem geladenen Dokument, ohne erneute
 * Berechnung ("clientseitig nichts neu berechnet", Akzeptanzkriterium).
 *
 * WICHTIGE, BEWUSST DOKUMENTIERTE EINSCHRÄNKUNG (keine Cloud Functions,
 * Product.md §10): `zeitBisErsterLieferung`, `zeitBisLetzterLieferung`,
 * `abstandErsteLetzteLieferung` und `proStation[].beteiligungsspanne` werden
 * ausschließlich aus bereits echten, servergesetzten Zeitstempeln gebildet
 * (Kartenbewegungen speichern `letzteBewegungAm` immer per
 * `serverTimestamp()`, siehe kartenBewegung.js) – hier wird nichts
 * angenähert. `durchlaufzeit`/`bearbeitungszeit` hingegen müssen im SELBEN
 * Schreibvorgang entstehen, der `durchlaufzeitEnde`/`bearbeitungszeitEnde`
 * erst per `serverTimestamp()` setzt (firestore.rules verlangt das exakt so,
 * siehe rundenEnde.js) – der aufgelöste Serverwert ist zum Zeitpunkt der
 * Berechnung clientseitig noch nicht bekannt. Für diese zwei Felder wird
 * deshalb der lokale `Date.now()`-Zeitpunkt als Näherung für das Ende
 * verwendet (Abweichung typischerweise im Bereich einer Netzwerk-Laufzeit,
 * siehe rundenEnde.js-Kommentar) – eine bewusste, kleine, dokumentierte
 * Ungenauigkeit ohne Cloud Functions, kein neuer Kompromiss-Typ (gleiches
 * Muster wie die bereits akzeptierte Race-Condition-Doku in rundenEnde.js).
 */
(function (global) {
  'use strict';

  function alsMillis(zeitwert) {
    if (zeitwert == null) return null;
    if (typeof zeitwert.toMillis === 'function') return zeitwert.toMillis();
    return zeitwert;
  }

  function berechneKennzahlen({
    durchlaufzeitStart, durchlaufzeitEnde, bearbeitungszeitStart, bearbeitungszeitEnde,
    karten, bewegungsLog,
  } = {}) {
    const durchlaufzeitStartMs = alsMillis(durchlaufzeitStart);
    const durchlaufzeitEndeMs = alsMillis(durchlaufzeitEnde);
    const bearbeitungszeitStartMs = alsMillis(bearbeitungszeitStart);
    const bearbeitungszeitEndeMs = alsMillis(bearbeitungszeitEnde);

    const ergebnis = {};

    if (durchlaufzeitStartMs != null && durchlaufzeitEndeMs != null) {
      ergebnis.durchlaufzeit = durchlaufzeitEndeMs - durchlaufzeitStartMs;
    }
    if (bearbeitungszeitStartMs != null && bearbeitungszeitEndeMs != null) {
      ergebnis.bearbeitungszeit = bearbeitungszeitEndeMs - bearbeitungszeitStartMs;
    }

    // Zeit bis erster/letzter Lieferung: ausschließlich aus den bereits
    // servergesetzten `letzteBewegungAm`-Zeitstempeln der im Ziel (Position 6)
    // angekommenen Karten – keine Näherung nötig, diese Werte sind bereits
    // vollständig aufgelöst, sobald die Karte tatsächlich bewegt wurde.
    const lieferzeiten = (karten || [])
      .filter((k) => k.position === 6 && alsMillis(k.letzteBewegungAm) != null)
      .map((k) => alsMillis(k.letzteBewegungAm));
    if (lieferzeiten.length > 0 && durchlaufzeitStartMs != null) {
      const erste = Math.min(...lieferzeiten);
      const letzte = Math.max(...lieferzeiten);
      ergebnis.zeitBisErsterLieferung = erste - durchlaufzeitStartMs;
      ergebnis.zeitBisLetzterLieferung = letzte - durchlaufzeitStartMs;
      ergebnis.abstandErsteLetzteLieferung = letzte - erste;
    }

    // Pro-Station-Beteiligung: bewegungsLog wird in spiel.html live über die
    // docChanges() der karten-Live-Abfrage mitgeschnitten (siehe dortiger
    // Kommentar) und enthält je Bewegung Station + servergesetzten
    // Zeitstempel – auch hier keine Näherung nötig. "0 Bewegungen" für eine
    // Station ohne jede Bewegung ist bewusst kein Sonderfall (Entscheidung
    // aus FEATURE-002, unverändert gültig).
    const stationenAnzahl = (global.FlowGame && Array.isArray(global.FlowGame.STATIONEN))
      ? global.FlowGame.STATIONEN.length : 5;
    const proStation = {};
    for (let station = 1; station <= stationenAnzahl; station += 1) {
      const zeiten = (bewegungsLog || [])
        .filter((eintrag) => eintrag.station === station)
        .map((eintrag) => alsMillis(eintrag.wann))
        .filter((ms) => ms != null);
      proStation[station] = {
        anzahlBewegungen: zeiten.length,
        beteiligungsspanne: zeiten.length > 0 ? (Math.max(...zeiten) - Math.min(...zeiten)) : 0,
      };
    }
    ergebnis.proStation = proStation;

    return ergebnis;
  }

  global.FlowGame = global.FlowGame || {};
  Object.assign(global.FlowGame, { berechneKennzahlen });
})(window);
